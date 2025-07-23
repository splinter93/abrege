import { useFileSystemStore, EditorPatch } from '@/store/useFileSystemStore';

/**
 * handleEditorEvent - Gère les événements editor.* (insert, delete, update, image) pour l'éditeur Markdown
 *
 * @param event { type: string, payload: any, timestamp: number }
 *
 * Utilisation :
 *   if (type.startsWith('editor.')) handleEditorEvent(event)
 */
export function handleEditorEvent(event: { type: string, payload: any, timestamp: number }) {
  const { type, payload } = event;
  const { noteId, selector, content, position } = payload || {};
  if (!noteId || !selector || typeof content !== 'string') return;
  const patch: EditorPatch = {
    selector,
    content,
    position,
    type: type.split('.')[1] as EditorPatch['type']
  };
  useFileSystemStore.getState().updateNoteContent(noteId, patch);
  // Prépare pour le diff/animation : patch._lastPatch est stocké dans la note
} 