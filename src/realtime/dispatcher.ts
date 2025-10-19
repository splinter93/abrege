/**
 * 🔄 Dispatcher Realtime Simplifié
 * 
 * Ce fichier contient uniquement la logique de dispatch des événements
 * vers le store Zustand. La gestion des souscriptions est maintenant
 * dans le service unifié.
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';

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
export function handleRealtimeEvent(event: { type: string, payload: unknown, timestamp: number }, debug = false) {
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
    case 'note.created':
      // Vérifier si la note n'existe pas déjà (éviter les doublons)
      if (!store.notes[payload.id]) {
        store.addNote(payload);
      }
      break;
    case 'note.deleted':
      store.removeNote(payload.id);
      break;
    case 'note.renamed':
      store.renameNote(payload.id, payload.title || payload.source_title);
      break;
    case 'note.moved':
      store.moveNote(payload.id, payload.folder_id, payload.classeur_id);
      break;
    case 'note.updated':
    case 'note.update': // Support pour les deux formats

      // Vérifier si c'est une mise à jour de contenu significative
      const currentNote = store.notes[payload.id];
      if (currentNote) {
        const contentChanged = currentNote.markdown_content !== payload.markdown_content ||
                              currentNote.html_content !== payload.html_content;
        
        // Vérifier les changements liés aux images et à la présentation
        const imageChanged = currentNote.header_image !== payload.header_image ||
                            currentNote.header_image_blur !== payload.header_image_blur ||
                            currentNote.header_image_overlay !== payload.header_image_overlay ||
                            currentNote.header_title_in_image !== payload.header_title_in_image ||
                            currentNote.header_image_offset !== payload.header_image_offset;
        
        // Vérifier les changements de style et de présentation
        const styleChanged = currentNote.font_family !== payload.font_family ||
                            currentNote.wide_mode !== payload.wide_mode ||
                            currentNote.source_title !== payload.source_title;

        if (contentChanged || imageChanged || styleChanged) {
          store.updateNote(payload.id, payload);
        }
      } else {
        store.updateNote(payload.id, payload);
      }
      break;
      
    // Dossiers
    case 'folder.created':
      // Vérifier si le dossier n'existe pas déjà (éviter les doublons)
      if (!store.folders[payload.id] && !pendingOperations.has(`folder:${payload.id}`)) {
        store.addFolder(payload);
      }
      break;
    case 'folder.deleted':
      store.removeFolder(payload.id);
      break;
    case 'folder.renamed':
      store.renameFolder(payload.id, payload.name);
      break;
    case 'folder.moved':
      store.moveFolder(payload.id, payload.parent_id, payload.classeur_id);
      break;
    case 'folder.updated':
      store.updateFolder(payload.id, payload);
      break;
      
    // Classeurs
    case 'classeur.created':
      // Vérifier si le classeur n'existe pas déjà (éviter les doublons)
      if (!store.classeurs[payload.id]) {
        store.addClasseur(payload);
      }
      break;
    case 'classeur.deleted':
      store.removeClasseur(payload.id);
      break;
    case 'classeur.renamed':
      store.renameClasseur(payload.id, payload.name);
      break;
    case 'classeur.updated':
      store.updateClasseur(payload.id, payload);
      break;
      
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