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
export function isNoteCreatedEvent(event: any): event is NoteCreatedEvent {
  return event.type === 'note.created' && event.payload?.id;
}

export function isNoteDeletedEvent(event: any): event is NoteDeletedEvent {
  return event.type === 'note.deleted' && event.payload?.id;
}

export function isNoteRenamedEvent(event: any): event is NoteRenamedEvent {
  return event.type === 'note.renamed' && event.payload?.id;
} 