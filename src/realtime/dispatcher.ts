/**
 * 🔄 Dispatcher Realtime Simplifié
 * 
 * Ce fichier contient uniquement la logique de dispatch des événements
 * vers le store Zustand. La gestion des souscriptions est maintenant
 * dans le service unifié.
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';

/**
 * handleRealtimeEvent - Route les événements WebSocket vers le store Zustand
 *
 * @param event { type: string, payload: any, timestamp: number }
 * @param debug (optionnel) : loggue chaque event dispatché si true
 */
export function handleRealtimeEvent(event: { type: string, payload: any, timestamp: number }, debug = false) {
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
      if (debug) {
        console.log('[Realtime] note.updated - Payload complet:', { payload });
      }
      store.updateNote(payload.id, payload);
      break;
      
    // Dossiers
    case 'folder.created':
      // Vérifier si le dossier n'existe pas déjà (éviter les doublons)
      if (!store.folders[payload.id]) {
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
      if (debug) console.warn('[Realtime] Event ignoré :', { type, payload });
      break;
  }
}

/**
 * logEventToConsole - Affiche l'event WebSocket dans la console (debug)
 */
export function logEventToConsole(event: { type: string, payload: any, timestamp: number }) {
  console.log('[Realtime] Event reçu :', { 
    type: event.type, 
    payload: event.payload, 
    time: new Date(event.timestamp).toLocaleTimeString() 
  });
}

/**
 * handleEditorEvent - Gère les événements spécifiques à l'éditeur
 */
export function handleEditorEvent(event: { type: string, payload: any, timestamp: number }) {
  console.log('[Realtime] Event éditeur reçu :', event);
  // TODO: Implémenter la logique spécifique à l'éditeur selon les besoins
} 