import { useFileSystemStore, EditorPatch } from '@/store/useFileSystemStore';

/**
 * handleEditorEvent - Gère les événements editor.* (insert, delete, update, image) pour l'éditeur Markdown
 *
 * @param event { type: string, payload: unknown, timestamp: number }
 *
 * Utilisation :
 *   if (type.startsWith('editor.')) handleEditorEvent(event)
 */
export function handleEditorEvent(event: { type: string, payload: unknown, timestamp: number }) {
  const { type, payload } = event;
  const payloadObj = payload as { noteId?: string; selector?: string; content?: string } | undefined;
  const { noteId, selector, content } = payloadObj || {};
  if (!noteId || !selector || typeof content !== 'string') return;
  const patch: EditorPatch = {
    selector,
    content,
    type: type.split('.')[1] as EditorPatch['type']
  };
  useFileSystemStore.getState().updateNoteContent(noteId, patch);
  // Prépare pour le diff/animation : patch._lastPatch est stocké dans la note
} 