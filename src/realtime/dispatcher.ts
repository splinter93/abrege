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
      if (debug) {
        console.log('[Realtime] note.updated - Payload complet:', payload);
        console.log('[Realtime] note.updated - header_image_offset:', payload.header_image_offset);
      }
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

// Système de déduplication pour éviter les boucles infinies
let lastProcessedEvents = new Map<string, number>();
const DEDUPLICATION_WINDOW = 1000; // 1 seconde

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
        // Déduplication pour éviter les boucles infinies
        const eventKey = `${payload.eventType}-${(payload.new as any)?.id || (payload.old as any)?.id}-${(payload.new as any)?.updated_at || (payload.old as any)?.updated_at}`;
        const now = Date.now();
        const lastProcessed = lastProcessedEvents.get(eventKey);
        
        if (lastProcessed && (now - lastProcessed) < DEDUPLICATION_WINDOW) {
          // Événement déjà traité récemment, ignorer
          return;
        }
        
        lastProcessedEvents.set(eventKey, now);
        
        // Nettoyer les anciens événements (garder seulement les 100 derniers)
        if (lastProcessedEvents.size > 100) {
          const oldestAllowed = now - (DEDUPLICATION_WINDOW * 10);
          for (const [key, timestamp] of lastProcessedEvents.entries()) {
            if (timestamp < oldestAllowed) {
              lastProcessedEvents.delete(key);
            }
          }
        }
        
        const store = useFileSystemStore.getState();
        
        switch (payload.eventType) {
          case 'INSERT':
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
            break;
            
          case 'UPDATE':
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
            break;
            
          case 'DELETE':
            store.removeNote(payload.old.id);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        notesSubscriptionActive = true;
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        notesSubscriptionActive = false;
        // Reconnexion automatique après fermeture/erreur/timeout
        setTimeout(() => {
          subscribeToNotes();
        }, 2000);
      }
    });
    
  return channel;
}

let dossierSubscriptionRetries = 0;
const MAX_DOSSIER_RETRIES = 5;

/**
 * S'abonner aux changements des dossiers via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'folders'
 */
export function subscribeToDossiers() {
  if (dossierSubscriptionRetries >= MAX_DOSSIER_RETRIES) {
    console.error(`[REALTIME] ❌ Échec de l'abonnement aux dossiers après ${MAX_DOSSIER_RETRIES} tentatives. Abandon.`);
    return;
  }
  console.log(`[REALTIME] 📁 Tentative d'abonnement aux dossiers... (${dossierSubscriptionRetries + 1}/${MAX_DOSSIER_RETRIES})`);
  
  const channel = supabase
    .channel('public:folders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'folders' },
      (payload) => {
        const store = useFileSystemStore.getState();
        
        switch (payload.eventType) {
          case 'INSERT':
            // Convertir les données Supabase vers le type Folder
            const newFolder = {
              id: payload.new.id,
              name: payload.new.name,
              parent_id: payload.new.parent_id,
              classeur_id: payload.new.classeur_id,
              ...payload.new // Inclure tous les autres champs
            };
            store.addFolder(newFolder);
            break;
            
          case 'UPDATE':
            // Convertir les données Supabase vers le type Folder
            const updatedFolder = {
              id: payload.new.id,
              name: payload.new.name,
              parent_id: payload.new.parent_id,
              classeur_id: payload.new.classeur_id,
              ...payload.new // Inclure tous les autres champs
            };
            store.updateFolder(payload.new.id, updatedFolder);
            break;
            
          case 'DELETE':
            store.removeFolder(payload.old.id);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        dossiersSubscriptionActive = true;
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        dossiersSubscriptionActive = false;
        dossierSubscriptionRetries++;
        // Reconnexion automatique après fermeture/erreur/timeout
        setTimeout(() => {
          subscribeToDossiers();
        }, 2000 * dossierSubscriptionRetries); // Augmente le délai à chaque tentative
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
        const store = useFileSystemStore.getState();
        
        switch (payload.eventType) {
          case 'INSERT':
            // Convertir les données Supabase vers le type Classeur
            const newClasseur = {
              id: payload.new.id,
              name: payload.new.name,
              ...payload.new // Inclure tous les autres champs
            };
            store.addClasseur(newClasseur);
            break;
            
          case 'UPDATE':
            // Convertir les données Supabase vers le type Classeur
            const updatedClasseur = {
              id: payload.new.id,
              name: payload.new.name,
              ...payload.new // Inclure tous les autres champs
            };
            store.updateClasseur(payload.new.id, updatedClasseur);
            break;
            
          case 'DELETE':
            store.removeClasseur(payload.old.id);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        classeursSubscriptionActive = true;
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        classeursSubscriptionActive = false;
        // Reconnexion automatique après fermeture/erreur/timeout
        setTimeout(() => {
          subscribeToClasseurs();
        }, 2000);
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