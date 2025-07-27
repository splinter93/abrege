import { useFileSystemStore } from '@/store/useFileSystemStore';
import { handleEditorEvent } from './editor';
import { supabase } from '@/supabaseClient';

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
  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
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
    case 'note.updated':
      store.updateNote(payload.id, payload);
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
    case 'folder.updated':
      store.updateFolder(payload.id, payload);
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
    case 'classeur.updated':
      store.updateClasseur(payload.id, payload);
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

// ===== NOUVELLES FONCTIONS DE SOUSCRIPTION SUPABASE REALTIME =====

// Variables globales pour le monitoring des souscriptions
let notesSubscriptionActive = false;
let dossiersSubscriptionActive = false;
let classeursSubscriptionActive = false;

/**
 * Monitoring des souscriptions realtime
 */
export function startSubscriptionMonitoring() {
  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  
  // Vérifier toutes les 30 secondes si les souscriptions sont actives
  setInterval(() => {
    if (!notesSubscriptionActive) {
      // 🚧 Temp: Authentification non implémentée
      // TODO: Remplacer USER_ID par l'authentification Supabase
      subscribeToNotes();
    }
    if (!dossiersSubscriptionActive) {
      // 🚧 Temp: Authentification non implémentée
      // TODO: Remplacer USER_ID par l'authentification Supabase
      subscribeToDossiers();
    }
    if (!classeursSubscriptionActive) {
      // 🚧 Temp: Authentification non implémentée
      // TODO: Remplacer USER_ID par l'authentification Supabase
      subscribeToClasseurs();
    }
  }, 30000); // 30 secondes
}

/**
 * S'abonner aux changements des notes via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'articles'
 */
export function subscribeToNotes() {
  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  
  const channel = supabase
    .channel('public:articles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'articles' },
      (payload) => {
        console.log('[REALTIME] 📝 Event note reçu:', payload.eventType, payload);
        
        const store = useFileSystemStore.getState();
        
        switch (payload.eventType) {
          case 'INSERT':
            console.log('[REALTIME] ✅ Note créée:', payload.new.source_title);
            // Convertir les données Supabase vers le type Note
            const newNote = {
              id: payload.new.id,
              source_title: payload.new.source_title,
              source_type: payload.new.source_type,
              updated_at: payload.new.updated_at,
              classeur_id: payload.new.classeur_id,
              folder_id: payload.new.folder_id,
              markdown_content: payload.new.markdown_content,
              html_content: payload.new.html_content,
              ...payload.new // Inclure tous les autres champs
            };
            store.addNote(newNote);
            console.log('[REALTIME] ✅ Note ajoutée au store Zustand');
            break;
            
          case 'UPDATE':
            console.log('[REALTIME] 🔄 Note mise à jour:', payload.new.source_title);
            // Convertir les données Supabase vers le type Note
            const updatedNote = {
              id: payload.new.id,
              source_title: payload.new.source_title,
              source_type: payload.new.source_type,
              updated_at: payload.new.updated_at,
              classeur_id: payload.new.classeur_id,
              folder_id: payload.new.folder_id,
              markdown_content: payload.new.markdown_content,
              html_content: payload.new.html_content,
              ...payload.new // Inclure tous les autres champs
            };
            store.updateNote(payload.new.id, updatedNote);
            console.log('[REALTIME] ✅ Note mise à jour dans le store Zustand');
            break;
            
          case 'DELETE':
            console.log('[REALTIME] 🗑️ Note supprimée:', payload.old.source_title);
            store.removeNote(payload.old.id);
            console.log('[REALTIME] ✅ Note supprimée du store Zustand');
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] 📝 Statut souscription notes:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[REALTIME] ✅ Souscription notes activée avec succès');
        notesSubscriptionActive = true;
      } else if (status === 'CLOSED') {
        console.log('[REALTIME] ❌ Souscription notes fermée - reconnexion...');
        notesSubscriptionActive = false;
        // Reconnexion automatique après fermeture
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription notes...');
          subscribeToNotes();
        }, 1000);
      } else if (status === 'CHANNEL_ERROR') {
        console.log('[REALTIME] ❌ Erreur souscription notes - reconnexion...');
        notesSubscriptionActive = false;
        // Reconnexion automatique après erreur
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription notes après erreur...');
          subscribeToNotes();
        }, 2000);
      } else if (status === 'TIMED_OUT') {
        console.log('[REALTIME] ⏰ Timeout souscription notes - reconnexion...');
        notesSubscriptionActive = false;
        // Reconnexion automatique après timeout
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription notes après timeout...');
          subscribeToNotes();
        }, 1000);
      }
    });
    
  return channel;
}

/**
 * S'abonner aux changements des dossiers via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'folders'
 */
export function subscribeToDossiers() {
  console.log('[REALTIME] 📁 S\'abonnement aux dossiers...');
  
  const channel = supabase
    .channel('public:folders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'folders' },
      (payload) => {
        console.log('[REALTIME] 📁 Event dossier reçu:', payload.eventType, payload);
        
        const store = useFileSystemStore.getState();
        
        switch (payload.eventType) {
          case 'INSERT':
            console.log('[REALTIME] ✅ Dossier créé:', payload.new.name);
            // Convertir les données Supabase vers le type Folder
            const newFolder = {
              id: payload.new.id,
              name: payload.new.name,
              parent_id: payload.new.parent_id,
              classeur_id: payload.new.classeur_id,
              ...payload.new // Inclure tous les autres champs
            };
            store.addFolder(newFolder);
            console.log('[REALTIME] ✅ Dossier ajouté au store Zustand');
            break;
            
          case 'UPDATE':
            console.log('[REALTIME] 🔄 Dossier mis à jour:', payload.new.name);
            // Convertir les données Supabase vers le type Folder
            const updatedFolder = {
              id: payload.new.id,
              name: payload.new.name,
              parent_id: payload.new.parent_id,
              classeur_id: payload.new.classeur_id,
              ...payload.new // Inclure tous les autres champs
            };
            store.updateFolder(payload.new.id, updatedFolder);
            console.log('[REALTIME] ✅ Dossier mis à jour dans le store Zustand');
            break;
            
          case 'DELETE':
            console.log('[REALTIME] 🗑️ Dossier supprimé:', payload.old.name);
            store.removeFolder(payload.old.id);
            console.log('[REALTIME] ✅ Dossier supprimé du store Zustand');
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] 📁 Statut souscription dossiers:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[REALTIME] ✅ Souscription dossiers activée avec succès');
        dossiersSubscriptionActive = true;
      } else if (status === 'CLOSED') {
        console.log('[REALTIME] ❌ Souscription dossiers fermée - reconnexion...');
        dossiersSubscriptionActive = false;
        // Reconnexion automatique après fermeture
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription dossiers...');
          subscribeToDossiers();
        }, 1000);
      } else if (status === 'CHANNEL_ERROR') {
        console.log('[REALTIME] ❌ Erreur souscription dossiers - reconnexion...');
        dossiersSubscriptionActive = false;
        // Reconnexion automatique après erreur
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription dossiers après erreur...');
          subscribeToDossiers();
        }, 2000);
      } else if (status === 'TIMED_OUT') {
        console.log('[REALTIME] ⏰ Timeout souscription dossiers - reconnexion...');
        dossiersSubscriptionActive = false;
        // Reconnexion automatique après timeout
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription dossiers après timeout...');
          subscribeToDossiers();
        }, 1000);
      }
    });
    
  return channel;
}

/**
 * S'abonner aux changements des classeurs via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'classeurs'
 */
export function subscribeToClasseurs() {
  console.log('[REALTIME] 📚 S\'abonnement aux classeurs...');
  
  const channel = supabase
    .channel('public:classeurs')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'classeurs' },
      (payload) => {
        console.log('[REALTIME] 📚 Event classeur reçu:', payload.eventType, payload);
        
        const store = useFileSystemStore.getState();
        
        switch (payload.eventType) {
          case 'INSERT':
            console.log('[REALTIME] ✅ Classeur créé:', payload.new.name);
            // Convertir les données Supabase vers le type Classeur
            const newClasseur = {
              id: payload.new.id,
              name: payload.new.name,
              ...payload.new // Inclure tous les autres champs
            };
            store.addClasseur(newClasseur);
            console.log('[REALTIME] ✅ Classeur ajouté au store Zustand');
            break;
            
          case 'UPDATE':
            console.log('[REALTIME] 🔄 Classeur mis à jour:', payload.new.name);
            // Convertir les données Supabase vers le type Classeur
            const updatedClasseur = {
              id: payload.new.id,
              name: payload.new.name,
              ...payload.new // Inclure tous les autres champs
            };
            store.updateClasseur(payload.new.id, updatedClasseur);
            console.log('[REALTIME] ✅ Classeur mis à jour dans le store Zustand');
            break;
            
          case 'DELETE':
            console.log('[REALTIME] 🗑️ Classeur supprimé:', payload.old.name);
            store.removeClasseur(payload.old.id);
            console.log('[REALTIME] ✅ Classeur supprimé du store Zustand');
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] 📚 Statut souscription classeurs:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[REALTIME] ✅ Souscription classeurs activée avec succès');
        classeursSubscriptionActive = true;
      } else if (status === 'CLOSED') {
        console.log('[REALTIME] ❌ Souscription classeurs fermée - reconnexion...');
        classeursSubscriptionActive = false;
        // Reconnexion automatique après fermeture
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription classeurs...');
          subscribeToClasseurs();
        }, 1000);
      } else if (status === 'CHANNEL_ERROR') {
        console.log('[REALTIME] ❌ Erreur souscription classeurs - reconnexion...');
        classeursSubscriptionActive = false;
        // Reconnexion automatique après erreur
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription classeurs après erreur...');
          subscribeToClasseurs();
        }, 2000);
      } else if (status === 'TIMED_OUT') {
        console.log('[REALTIME] ⏰ Timeout souscription classeurs - reconnexion...');
        classeursSubscriptionActive = false;
        // Reconnexion automatique après timeout
        setTimeout(() => {
          console.log('[REALTIME] 🔄 Reconnexion souscription classeurs après timeout...');
          subscribeToClasseurs();
        }, 1000);
      }
    });
    
  return channel;
}

/**
 * Se désabonner de tous les canaux realtime
 */
export function unsubscribeFromAll() {
  console.log('[REALTIME] 🛑 Désabonnement de tous les canaux...');
  
  // Désabonner de tous les canaux
  supabase.removeAllChannels();
  
  console.log('[REALTIME] ✅ Tous les canaux désabonnés');
} 