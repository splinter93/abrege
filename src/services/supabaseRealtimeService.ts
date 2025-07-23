import { supabase } from '@/supabaseClient';
import { handleRealtimeEvent } from '@/realtime/dispatcher';

export type SupabaseTable = 'notes' | 'folders' | 'classeurs';
export type SupabaseEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SupabaseRealtimeEvent {
  type: string; // ex: note.created, folder.updated, etc.
  payload: any;
  timestamp: number;
}

type Handler = (event: SupabaseRealtimeEvent) => void;

const listeners: Record<string, Set<Handler>> = {};
const subscriptions: Record<string, any> = {};

function getEventType(table: SupabaseTable, event: SupabaseEventType, payload?: any): string {
  // Pour compatibilité descendante, fallback sur l'ancien comportement si pas d'info
  if (!payload || !payload.old || !payload.new || event === 'INSERT' || event === 'DELETE') {
    switch (table) {
      case 'notes':
        if (event === 'INSERT') return 'note.created';
        if (event === 'UPDATE') return 'note.updated';
        if (event === 'DELETE') return 'note.deleted';
        break;
      case 'folders':
        if (event === 'INSERT') return 'folder.created';
        if (event === 'UPDATE') return 'folder.updated';
        if (event === 'DELETE') return 'folder.deleted';
        break;
      case 'classeurs':
        if (event === 'INSERT') return 'classeur.created';
        if (event === 'UPDATE') return 'classeur.updated';
        if (event === 'DELETE') return 'classeur.deleted';
        break;
    }
    return `${table}.${(event as string).toLowerCase()}`;
  }

  // --- Détection fine pour UPDATE ---
  // Champs sensibles pour chaque table
  const renameFields = table === 'notes' ? ['source_title'] : ['name'];
  const moveFields = table === 'notes' ? ['folder_id', 'classeur_id'] : table === 'folders' ? ['parent_id', 'classeur_id'] : ['parent_id'];

  // Détection rename
  for (const field of renameFields) {
    if (payload.old[field] !== payload.new[field]) {
      return `${table.slice(0, -1)}.renamed`; // note.renamed, folder.renamed, classeur.renamed
    }
  }
  // Détection move
  for (const field of moveFields) {
    if (payload.old[field] !== payload.new[field]) {
      return `${table.slice(0, -1)}.moved`; // note.moved, folder.moved, classeur.moved
    }
  }
  // Sinon, update simple
  return `${table.slice(0, -1)}.updated`;
}

export function subscribe(table: string, handler: Handler) {
  if (!listeners[table]) listeners[table] = new Set();
  listeners[table].add(handler);
  if (!subscriptions[table]) {
    subscriptions[table] = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          let type = '';
          let eventPayload = null;
          const eventType = payload.eventType as SupabaseEventType;
          if (eventType === 'INSERT') {
            type = getEventType(table as SupabaseTable, eventType);
            eventPayload = payload.new;
            handleRealtimeEvent({ type, payload: eventPayload, timestamp: Date.now() });
          } else if (eventType === 'DELETE') {
            type = getEventType(table as SupabaseTable, eventType);
            eventPayload = payload.old;
            handleRealtimeEvent({ type, payload: eventPayload, timestamp: Date.now() });
          } else if (eventType === 'UPDATE') {
            // Détection fine move/rename/update
            type = getEventType(table as SupabaseTable, eventType, payload);
            eventPayload = payload.new;
            handleRealtimeEvent({ type, payload: eventPayload, timestamp: Date.now() });
          }
          const event: SupabaseRealtimeEvent = {
            type,
            payload: eventPayload,
            timestamp: Date.now(),
          };
          listeners[table]?.forEach((cb) => cb(event));
        }
      )
      .subscribe();
  }
}

export function unsubscribe(table: string, handler: Handler) {
  listeners[table]?.delete(handler);
  // Optionnel : désabonner du canal si plus de listeners
}

export function send() {
  // No-op pour compatibilité API
} 