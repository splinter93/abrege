import { useFileSystemStore } from '@/store/useFileSystemStore';
import { handleEditorEvent } from './editor';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

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
        logger.dev('[Realtime] note.updated - Payload complet:', payload);
        logger.dev('[Realtime] note.updated - header_image_offset:', payload.header_image_offset);
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
      if (debug) logger.warn('[Realtime] Event ignoré :', type, payload);
      break;
  }
}

/**
 * logEventToConsole - Affiche l'event WebSocket dans la console (debug)
 */
export function logEventToConsole(event: { type: string, payload: any, timestamp: number }) {
  logger.dev('[Realtime] Event reçu :', event.type, event.payload, new Date(event.timestamp).toLocaleTimeString());
}

// ===== NOUVELLES FONCTIONS DE SOUSCRIPTION SUPABASE REALTIME =====

// Variables globales pour le monitoring des souscriptions
let notesSubscriptionActive = false;
let dossiersSubscriptionActive = false;
let classeursSubscriptionActive = false;

// Gestion des canaux existants pour éviter les conflits
let notesChannel: any = null;
let dossiersChannel: any = null;
let classeursChannel: any = null;

// Gestion des retries pour éviter les boucles infinies
let notesRetryCount = 0;
let dossiersRetryCount = 0;
let classeursRetryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 secondes

// Timestamps pour éviter les reconnexions trop fréquentes
let lastNotesRetry = 0;
let lastDossiersRetry = 0;
let lastClasseursRetry = 0;
const MIN_RETRY_INTERVAL = 10000; // 10 secondes minimum entre les tentatives

// Map pour la déduplication des événements
const lastProcessedEvents = new Map();
const DEDUPLICATION_WINDOW = 1000; // 1 seconde

let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Monitoring des souscriptions realtime
 */
export function startSubscriptionMonitoring() {
  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  
  logger.dev('[REALTIME] 🔍 Démarrage du monitoring des souscriptions...');
  
  // Nettoyer l'interval précédent s'il existe
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Vérifier toutes les 30 secondes si les souscriptions sont actives
  monitoringInterval = setInterval(() => {
    // Réinitialiser les compteurs de tentatives pour permettre de nouvelles tentatives
    if (!notesSubscriptionActive) {
      logger.dev('[REALTIME] 🔄 Monitoring: Redémarrage des souscriptions notes...');
      notesRetryCount = 0;
      subscribeToNotes();
    }
    if (!dossiersSubscriptionActive) {
      logger.dev('[REALTIME] 🔄 Monitoring: Redémarrage des souscriptions dossiers...');
      dossiersRetryCount = 0;
      subscribeToDossiers();
    }
    if (!classeursSubscriptionActive) {
      logger.dev('[REALTIME] 🔄 Monitoring: Redémarrage des souscriptions classeurs...');
      classeursRetryCount = 0;
      subscribeToClasseurs();
    }
  }, 30000); // 30 secondes
}

/**
 * S'abonner aux changements des notes via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'articles'
 */
export function subscribeToNotes() {
  // Vérifier le nombre de tentatives
  if (notesRetryCount >= MAX_RETRIES) {
    logger.error(`[REALTIME] ❌ Échec de l'abonnement aux notes après ${MAX_RETRIES} tentatives. Abandon.`);
    return null;
  }
  
  // Vérifier le délai minimum entre les tentatives
  const now = Date.now();
  if (now - lastNotesRetry < MIN_RETRY_INTERVAL) {
    logger.dev(`[REALTIME] ⏳ Attente avant nouvelle tentative notes (${Math.ceil((MIN_RETRY_INTERVAL - (now - lastNotesRetry)) / 1000)}s restantes)`);
    return null;
  }
  
  // Si un canal existe déjà, ne pas en créer un nouveau
  if (notesChannel && notesSubscriptionActive) {
    logger.dev('[REALTIME] 📝 Canal notes déjà actif, pas de nouvelle souscription');
    return notesChannel;
  }
  
  lastNotesRetry = now;
  logger.dev(`[REALTIME] 📝 Démarrage de l'abonnement aux notes... (tentative ${notesRetryCount + 1}/${MAX_RETRIES})`);
  
  notesChannel = supabase
    .channel('public:articles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'articles' },
      (payload) => {
        // Logs réduits - seulement les événements importants
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          const title = (payload.new as any)?.source_title || (payload.old as any)?.source_title;
          logger.dev('[REALTIME] 📝', payload.eventType, title);
        }
        
        // Déduplication pour éviter les boucles infinies
        const eventKey = `${payload.eventType}-${(payload.new as any)?.id || (payload.old as any)?.id}-${(payload.new as any)?.updated_at || (payload.old as any)?.updated_at}`;
        const now = Date.now();
        const lastProcessed = lastProcessedEvents.get(eventKey);
        
        if (lastProcessed && (now - lastProcessed) < DEDUPLICATION_WINDOW) {
          logger.dev('[REALTIME] ⏭️ Événement ignoré (déduplication):', eventKey);
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
            logger.dev('[REALTIME] ➕ Ajout d\'une note:', payload.new.id);
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
            logger.dev('[REALTIME] ✏️ Mise à jour d\'une note:', payload.new.id);
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
            logger.dev('[REALTIME] 🗑️ Suppression d\'une note:', payload.old.id);
            store.removeNote(payload.old.id);
            break;
            
          default:
            logger.dev('[REALTIME] ❓ Événement inconnu:', (payload as any).eventType);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        notesSubscriptionActive = true;
        notesRetryCount = 0; // Reset du compteur de tentatives
        logger.dev('[REALTIME] ✅ Canal notes connecté avec succès');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        notesSubscriptionActive = false;
        notesChannel = null;
        
        // Incrémenter le compteur de tentatives
        notesRetryCount++;
        
        // Logs réduits - seulement en cas d'erreur persistante
        if (status === 'CHANNEL_ERROR') {
          logger.warn(`[REALTIME] ⚠️ Canal notes fermé: ${status} (tentative ${notesRetryCount}/${MAX_RETRIES})`);
        }
        
        // Reconnexion automatique seulement si on n'a pas dépassé le maximum
        if (notesRetryCount < MAX_RETRIES) {
          setTimeout(() => {
            if (!notesSubscriptionActive) {
              logger.dev(`[REALTIME] 🔄 Reconnexion notes... (tentative ${notesRetryCount + 1}/${MAX_RETRIES})`);
              subscribeToNotes();
            }
          }, RETRY_DELAY);
        } else {
          logger.error(`[REALTIME] ❌ Abandon de la reconnexion notes après ${MAX_RETRIES} tentatives`);
        }
      }
    });
    
  return notesChannel;
}

const dossierSubscriptionRetries = 0;
const MAX_DOSSIER_RETRIES = 5;

/**
 * S'abonner aux changements des dossiers via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'folders'
 */
export function subscribeToDossiers() {
  // Vérifier le nombre de tentatives
  if (dossiersRetryCount >= MAX_RETRIES) {
    logger.error(`[REALTIME] ❌ Échec de l'abonnement aux dossiers après ${MAX_RETRIES} tentatives. Abandon.`);
    return null;
  }
  
  // Vérifier le délai minimum entre les tentatives
  const now = Date.now();
  if (now - lastDossiersRetry < MIN_RETRY_INTERVAL) {
    logger.dev(`[REALTIME] ⏳ Attente avant nouvelle tentative dossiers (${Math.ceil((MIN_RETRY_INTERVAL - (now - lastDossiersRetry)) / 1000)}s restantes)`);
    return null;
  }
  
  // Si un canal existe déjà, ne pas en créer un nouveau
  if (dossiersChannel && dossiersSubscriptionActive) {
    logger.dev('[REALTIME] 📁 Canal dossiers déjà actif, pas de nouvelle souscription');
    return dossiersChannel;
  }
  
  lastDossiersRetry = now;
  logger.dev(`[REALTIME] 📁 Démarrage de l'abonnement aux dossiers... (tentative ${dossiersRetryCount + 1}/${MAX_RETRIES})`);
  
  dossiersChannel = supabase
    .channel('folders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'folders' },
      (payload) => {
        // Logs réduits - seulement les événements importants
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          const name = (payload.new as any)?.name || (payload.old as any)?.name;
          logger.dev('[REALTIME] 📁', payload.eventType, name);
        }
        
        // Déduplication pour éviter les boucles infinies
        const eventKey = `${payload.eventType}-${(payload.new as any)?.id || (payload.old as any)?.id}-${(payload.new as any)?.updated_at || (payload.old as any)?.updated_at}`;
        const now = Date.now();
        const lastProcessed = lastProcessedEvents.get(eventKey);
        
        if (lastProcessed && (now - lastProcessed) < DEDUPLICATION_WINDOW) {
          logger.dev('[REALTIME] ⏭️ Événement ignoré (déduplication):', eventKey);
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
            logger.dev('[REALTIME] ➕ Ajout d\'un dossier:', payload.new.id);
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
            logger.dev('[REALTIME] ✏️ Mise à jour d\'un dossier:', payload.new.id);
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
            logger.dev('[REALTIME] 🗑️ Suppression d\'un dossier:', payload.old.id);
            store.removeFolder(payload.old.id);
            break;
            
          default:
            logger.dev('[REALTIME] ❓ Événement inconnu:', (payload as any).eventType);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        dossiersSubscriptionActive = true;
        dossiersRetryCount = 0; // Reset du compteur de tentatives
        logger.dev('[REALTIME] ✅ Canal dossiers connecté avec succès');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        dossiersSubscriptionActive = false;
        dossiersChannel = null;
        
        // Incrémenter le compteur de tentatives
        dossiersRetryCount++;
        
        // Logs réduits - seulement en cas d'erreur persistante
        if (status === 'CHANNEL_ERROR') {
          logger.warn(`[REALTIME] ⚠️ Canal dossiers fermé: ${status} (tentative ${dossiersRetryCount}/${MAX_RETRIES})`);
        }
        
        // Reconnexion automatique seulement si on n'a pas dépassé le maximum
        if (dossiersRetryCount < MAX_RETRIES) {
          setTimeout(() => {
            if (!dossiersSubscriptionActive) {
              logger.dev(`[REALTIME] 🔄 Reconnexion dossiers... (tentative ${dossiersRetryCount + 1}/${MAX_RETRIES})`);
              subscribeToDossiers();
            }
          }, RETRY_DELAY);
        } else {
          logger.error(`[REALTIME] ❌ Abandon de la reconnexion dossiers après ${MAX_RETRIES} tentatives`);
        }
      }
    });
    
  return dossiersChannel;
}

const classeurSubscriptionRetries = 0;
const MAX_CLASSEUR_RETRIES = 5;

/**
 * S'abonner aux changements des classeurs via Supabase Realtime
 * Écoute les événements INSERT, UPDATE, DELETE sur la table 'classeurs'
 */
export function subscribeToClasseurs() {
  // Vérifier le nombre de tentatives
  if (classeursRetryCount >= MAX_RETRIES) {
    logger.error(`[REALTIME] ❌ Échec de l'abonnement aux classeurs après ${MAX_RETRIES} tentatives. Abandon.`);
    return null;
  }
  
  // Vérifier le délai minimum entre les tentatives
  const now = Date.now();
  if (now - lastClasseursRetry < MIN_RETRY_INTERVAL) {
    logger.dev(`[REALTIME] ⏳ Attente avant nouvelle tentative classeurs (${Math.ceil((MIN_RETRY_INTERVAL - (now - lastClasseursRetry)) / 1000)}s restantes)`);
    return null;
  }
  
  // Si un canal existe déjà, ne pas en créer un nouveau
  if (classeursChannel && classeursSubscriptionActive) {
    logger.dev('[REALTIME] 📚 Canal classeurs déjà actif, pas de nouvelle souscription');
    return classeursChannel;
  }
  
  lastClasseursRetry = now;
  logger.dev(`[REALTIME] 📚 Démarrage de l'abonnement aux classeurs... (tentative ${classeursRetryCount + 1}/${MAX_RETRIES})`);
  
  classeursChannel = supabase
    .channel('classeurs')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'classeurs' },
      (payload) => {
        // Logs réduits - seulement les événements importants
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          const name = (payload.new as any)?.name || (payload.old as any)?.name;
          logger.dev('[REALTIME] 📚', payload.eventType, name);
        }
        
        // Déduplication pour éviter les boucles infinies
        const eventKey = `${payload.eventType}-${(payload.new as any)?.id || (payload.old as any)?.id}-${(payload.new as any)?.updated_at || (payload.old as any)?.updated_at}`;
        const now = Date.now();
        const lastProcessed = lastProcessedEvents.get(eventKey);
        
        if (lastProcessed && (now - lastProcessed) < DEDUPLICATION_WINDOW) {
          logger.dev('[REALTIME] ⏭️ Événement ignoré (déduplication):', eventKey);
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
            logger.dev('[REALTIME] ➕ Ajout d\'un classeur:', payload.new.id);
            // Convertir les données Supabase vers le type Classeur
            const newClasseur = {
              id: payload.new.id,
              name: payload.new.name,
              ...payload.new // Inclure tous les autres champs
            };
            store.addClasseur(newClasseur);
            break;
            
          case 'UPDATE':
            logger.dev('[REALTIME] ✏️ Mise à jour d\'un classeur:', payload.new.id);
            // Convertir les données Supabase vers le type Classeur
            const updatedClasseur = {
              id: payload.new.id,
              name: payload.new.name,
              ...payload.new // Inclure tous les autres champs
            };
            store.updateClasseur(payload.new.id, updatedClasseur);
            break;
            
          case 'DELETE':
            logger.dev('[REALTIME] 🗑️ Suppression d\'un classeur:', payload.old.id);
            store.removeClasseur(payload.old.id);
            break;
            
          default:
            logger.dev('[REALTIME] ❓ Événement inconnu:', (payload as any).eventType);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        classeursSubscriptionActive = true;
        classeursRetryCount = 0; // Reset du compteur de tentatives
        logger.dev('[REALTIME] ✅ Canal classeurs connecté avec succès');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        classeursSubscriptionActive = false;
        classeursChannel = null;
        
        // Incrémenter le compteur de tentatives
        classeursRetryCount++;
        
        // Logs réduits - seulement en cas d'erreur persistante
        if (status === 'CHANNEL_ERROR') {
          logger.warn(`[REALTIME] ⚠️ Canal classeurs fermé: ${status} (tentative ${classeursRetryCount}/${MAX_RETRIES})`);
        }
        
        // Reconnexion automatique seulement si on n'a pas dépassé le maximum
        if (classeursRetryCount < MAX_RETRIES) {
          setTimeout(() => {
            if (!classeursSubscriptionActive) {
              logger.dev(`[REALTIME] 🔄 Reconnexion classeurs... (tentative ${classeursRetryCount + 1}/${MAX_RETRIES})`);
              subscribeToClasseurs();
            }
          }, RETRY_DELAY);
        } else {
          logger.error(`[REALTIME] ❌ Abandon de la reconnexion classeurs après ${MAX_RETRIES} tentatives`);
        }
      }
    });
    
  return classeursChannel;
}

/**
 * Se désabonner de tous les canaux realtime
 */
export function unsubscribeFromAll() {
  logger.dev('[REALTIME] 🛑 Désabonnement de tous les canaux...');
  
  // Nettoyer l'interval de monitoring
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.dev('[REALTIME] 🛑 Monitoring arrêté');
  }
  
  // Désabonner de tous les canaux
  supabase.removeAllChannels();
  
  // Réinitialiser les états
  notesSubscriptionActive = false;
  dossiersSubscriptionActive = false;
  classeursSubscriptionActive = false;
  
  // Nettoyer les références aux canaux
  notesChannel = null;
  dossiersChannel = null;
  classeursChannel = null;
  
  // Réinitialiser les compteurs de tentatives
  notesRetryCount = 0;
  dossiersRetryCount = 0;
  classeursRetryCount = 0;
  
  logger.dev('[REALTIME] ✅ Tous les canaux désabonnés');
} 