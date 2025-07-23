import { useFileSystemStore } from '@/store/useFileSystemStore';
import { handleEditorEvent } from './editor';

/**
 * handleRealtimeEvent - Route les événements WebSocket vers le store Zustand useFileSystemStore
 *
 * @param event { type: string, payload: any, timestamp: number }
 * @param debug (optionnel) : loggue chaque event dispatché si true
 *
 * À utiliser dans AppWrapper/FileSystemProvider :
 *   useRealtime({ ..., onEvent: handleRealtimeEvent })
 *
 * Gère aussi les événements editor.* via handleEditorEvent
 */
export function handleRealtimeEvent(event: { type: string, payload: any, timestamp: number }, debug = false) {
  console.log('[REALTIME] handleRealtimeEvent', event.type, event.payload);
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
      store.addNote(payload);
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
    // Folders
    case 'folder.created':
      store.addFolder(payload);
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
    // Classeurs
    case 'classeur.created':
      store.addClasseur(payload);
      break;
    case 'classeur.deleted':
      store.removeClasseur(payload.id);
      break;
    case 'classeur.renamed':
      store.renameClasseur(payload.id, payload.name);
      break;
    default:
      if (debug) console.warn('[Realtime] Event ignoré :', type, payload);
      break;
  }
}

/**
 * logEventToConsole - Affiche l'event WebSocket dans la console (debug)
 */
export function logEventToConsole(event: { type: string, payload: any, timestamp: number }) {
  console.log('[Realtime] Event reçu :', event.type, event.payload, new Date(event.timestamp).toLocaleTimeString());
} 