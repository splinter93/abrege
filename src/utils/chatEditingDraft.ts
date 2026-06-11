/**
 * Utilitaires pour restaurer le brouillon d'édition d'un message user
 * (texte + images, notes épinglées, mentions inline, prompts, canvas).
 */

import type { ChatMessage, EditingMessageDraft, UserMessage } from '@/types/chat';

export function extractEditingDraftFromMessage(
  message: ChatMessage,
  messageId: string
): EditingMessageDraft | null {
  if (message.role !== 'user') {
    return null;
  }

  const user = message as UserMessage;
  const content = typeof user.content === 'string' ? user.content : '';

  return {
    messageId,
    content,
    attachedImages: user.attachedImages ?? [],
    attachedNotes: (user.attachedNotes ?? []).map((note) => ({
      id: note.id,
      slug: note.slug,
      title: note.title,
      word_count: note.word_count,
    })),
    mentions: user.mentions ?? [],
    prompts: user.prompts ?? [],
    canvasSelections: user.canvasSelections ?? [],
  };
}
