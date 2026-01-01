/**
 * 🔄 Dispatcher Realtime Simplifié
 * 
 * Ce fichier contient uniquement la logique de dispatch des événements
 * vers le store Zustand. La gestion des souscriptions est maintenant
 * dans le service unifié.
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { Note, Folder, Classeur } from '@/store/useFileSystemStore';
import { logger, LogCategory } from '@/utils/logger';

// Set pour tracker les opérations en cours (éviter les doublons realtime)
const pendingOperations = new Set<string>();

/**
 * Marquer une opération comme en cours
 */
export function markOperationPending(type: string, id: string): void {
  pendingOperations.add(`${type}:${id}`);
}

/**
 * Marquer une opération comme terminée
 */
export function markOperationComplete(type: string, id: string): void {
  pendingOperations.delete(`${type}:${id}`);
}

/**
 * handleRealtimeEvent - Route les événements WebSocket vers le store Zustand
 *
 * @param event { type: string, payload: unknown, timestamp: number }
 * @param debug (optionnel) : loggue chaque event dispatché si true
 */
export function handleRealtimeEvent(event: { type: string; payload: Record<string, unknown>; timestamp: number }, debug = false) {
  const store = useFileSystemStore.getState();
  if (debug) logEventToConsole(event);
  
  const { type, payload } = event;
  
  // Route tous les événements editor.* vers handleEditorEvent
  if (type.startsWith('editor.')) {
    handleEditorEvent(event);
    return;
  }
  
  switch (type) {
    // Notes
    case 'note.created': {
      const notePayload = payload as unknown as Note;
      // Vérifier si la note n'existe pas déjà (éviter les doublons)
      if (!store.notes[notePayload.id]) {
        store.addNote(notePayload);
      }
      break;
    }
    case 'note.deleted': {
      const notePayload = payload as { id: string };
      store.removeNote(notePayload.id);
      break;
    }
    case 'note.renamed': {
      const notePayload = payload as { id: string; title?: string; source_title?: string };
      store.renameNote(notePayload.id, notePayload.title ?? notePayload.source_title ?? '');
      break;
    }
    case 'note.moved': {
      const notePayload = payload as { id: string; folder_id: string | null; classeur_id: string | null };
      // 🔧 FIX: Vérifier si le déplacement est nécessaire pour éviter les boucles infinies
      const noteToMove = store.notes[notePayload.id];
      if (noteToMove) {
        const needsMove = 
          noteToMove.folder_id !== notePayload.folder_id ||
          noteToMove.classeur_id !== notePayload.classeur_id;
        
        if (needsMove) {
          store.moveNote(
            notePayload.id,
            notePayload.folder_id ?? null,
            notePayload.classeur_id ?? undefined
          );
        }
      } else {
        // Note n'existe pas encore, on la déplace quand même
        store.moveNote(
          notePayload.id,
          notePayload.folder_id ?? null,
          notePayload.classeur_id ?? undefined
        );
      }
      break;
    }
    case 'note.updated':
    case 'note.update': { // Support pour les deux formats

      const notePayload = payload as Partial<Note> & { id: string; trashed_at?: unknown; is_in_trash?: unknown };

      // 🔧 FIX CRITIQUE: Vérifier si la note est mise en corbeille
      // Si trashed_at est défini, supprimer la note du store au lieu de la mettre à jour
      if (notePayload.trashed_at || notePayload.is_in_trash) {
        store.removeNote(notePayload.id);
        break;
      }

      // Vérifier si c'est une mise à jour de contenu significative
      const currentNote = store.notes[notePayload.id];
      if (currentNote) {
        const contentChanged = currentNote.markdown_content !== notePayload.markdown_content ||
                              currentNote.html_content !== notePayload.html_content;
        
        // Vérifier les changements liés aux images et à la présentation
        const imageChanged = currentNote.header_image !== notePayload.header_image ||
                            currentNote.header_image_blur !== notePayload.header_image_blur ||
                            currentNote.header_image_overlay !== notePayload.header_image_overlay ||
                            currentNote.header_title_in_image !== notePayload.header_title_in_image ||
                            currentNote.header_image_offset !== notePayload.header_image_offset;
        
        // Vérifier les changements de style et de présentation
        const styleChanged = currentNote.font_family !== notePayload.font_family ||
                            currentNote.wide_mode !== notePayload.wide_mode ||
                            currentNote.source_title !== notePayload.source_title;

        if (contentChanged || imageChanged || styleChanged) {
          // ✅ LOG: Diagnostiquer les mises à jour realtime
          logger.info(LogCategory.EDITOR, '[Realtime] 📝 note.updated → store.updateNote', {
            noteId: notePayload.id,
            contentChanged,
            imageChanged,
            styleChanged,
            oldContentLength: currentNote.markdown_content?.length || 0,
            newContentLength: notePayload.markdown_content?.length || 0
          });
          store.updateNote(notePayload.id, notePayload as Note);
        }
      } else {
        // ⚠️ FIX: Ne pas réajouter une note qui n'existe pas si elle est en corbeille
        // Si la note n'existe pas dans le store, c'est peut-être qu'elle a été supprimée
        // Ne la réajouter que si elle n'est pas en corbeille
        if (!notePayload.trashed_at && !notePayload.is_in_trash) {
          store.updateNote(notePayload.id, notePayload as Note);
        }
      }
      break;
    }
      
    // Dossiers
    case 'folder.created': {
      const folderPayload = payload as unknown as Folder;
      // Vérifier si le dossier n'existe pas déjà (éviter les doublons)
      if (!store.folders[folderPayload.id] && !pendingOperations.has(`folder:${folderPayload.id}`)) {
        store.addFolder(folderPayload);
      }
      break;
    }
    case 'folder.deleted': {
      const folderPayload = payload as { id: string };
      store.removeFolder(folderPayload.id);
      break;
    }
    case 'folder.renamed': {
      const folderPayload = payload as { id: string; name: string };
      store.renameFolder(folderPayload.id, folderPayload.name);
      break;
    }
    case 'folder.moved': {
      const folderPayload = payload as { id: string; parent_id?: string | null; classeur_id?: string };
      // 🔧 FIX: Vérifier si le déplacement est nécessaire pour éviter les boucles infinies
      const folderToMove = store.folders[folderPayload.id];
      if (folderToMove) {
        const needsMove = 
          folderToMove.parent_id !== folderPayload.parent_id ||
          folderToMove.classeur_id !== folderPayload.classeur_id;
        
        if (needsMove) {
          store.moveFolder(folderPayload.id, folderPayload.parent_id ?? null, folderPayload.classeur_id);
        }
      } else {
        // Dossier n'existe pas encore, on le déplace quand même
        store.moveFolder(folderPayload.id, folderPayload.parent_id ?? null, folderPayload.classeur_id);
      }
      break;
    }
    case 'folder.updated': {
      const folderPayload = payload as Partial<Folder> & { id: string };
      store.updateFolder(folderPayload.id, folderPayload);
      break;
    }
      
    // Classeurs
    case 'classeur.created': {
      const classeurPayload = payload as unknown as Classeur;
      // Vérifier si le classeur n'existe pas déjà (éviter les doublons)
      if (!store.classeurs[classeurPayload.id]) {
        store.addClasseur(classeurPayload);
      }
      break;
    }
    case 'classeur.deleted': {
      const classeurPayload = payload as { id: string };
      store.removeClasseur(classeurPayload.id);
      break;
    }
    case 'classeur.renamed': {
      const classeurPayload = payload as { id: string; name: string };
      store.renameClasseur(classeurPayload.id, classeurPayload.name);
      break;
    }
    case 'classeur.updated': {
      const classeurPayload = payload as unknown as Classeur;
      store.updateClasseur(classeurPayload.id, classeurPayload);
      break;
    }
      
    default:
      if (debug) {
        // Event ignoré en mode debug
      }
      break;
  }
}

/**
 * logEventToConsole - Affiche l'event WebSocket dans la console (debug)
 */
export function logEventToConsole(event: { type: string, payload: unknown, timestamp: number }) {
  // Fonction de debug - logs supprimés pour la production
}

/**
 * handleEditorEvent - Gère les événements spécifiques à l'éditeur
 */
export function handleEditorEvent(event: { type: string, payload: unknown, timestamp: number }) {
  // TODO: Implémenter la logique spécifique à l'éditeur selon les besoins
} 