/**
 * Types pour les événements temps réel
 */

export interface BaseEvent {
  type: string;
  timestamp: number;
}

export interface NoteCreatedPayload {
  id: string;
  title?: string;
  source_title?: string;
}

export interface NoteDeletedPayload {
  id: string;
}

export interface NoteRenamedPayload {
  id: string;
  title?: string;
  source_title?: string;
}

export interface NoteCreatedEvent extends BaseEvent {
  type: 'note.created';
  payload: NoteCreatedPayload;
}

export interface NoteDeletedEvent extends BaseEvent {
  type: 'note.deleted';
  payload: NoteDeletedPayload;
}

export interface NoteRenamedEvent extends BaseEvent {
  type: 'note.renamed';
  payload: NoteRenamedPayload;
}

export type RealtimeEvent = NoteCreatedEvent | NoteDeletedEvent | NoteRenamedEvent;

// Type guard functions
export function isNoteCreatedEvent(event: unknown): event is NoteCreatedEvent {
  const e = event as { type?: string; payload?: { id?: string } };
  return e.type === 'note.created' && !!e.payload?.id;
}

export function isNoteDeletedEvent(event: unknown): event is NoteDeletedEvent {
  const e = event as { type?: string; payload?: { id?: string } };
  return e.type === 'note.deleted' && !!e.payload?.id;
}

export function isNoteRenamedEvent(event: unknown): event is NoteRenamedEvent {
  const e = event as { type?: string; payload?: { id?: string } };
  return e.type === 'note.renamed' && !!e.payload?.id;
} 