import type { ChatMessage } from '@/types/chat';
import { hasToolCalls } from '@/types/chat';

/** ~20 échanges user/assistant */
export const MAX_HISTORY_MESSAGES = 40;

/** Taille (caractères) au-delà de laquelle un tool result peut être compressé */
export const TOOL_RESULT_THRESHOLD = 800;

/** Nombre de derniers rounds agentic dont les tool results restent intacts */
export const RECENT_ROUNDS_PROTECTED = 2;

/**
 * Indice du N-ième message assistant avec tool_calls en partant de la fin (N = RECENT_ROUNDS_PROTECTED + 1).
 * Les tool messages strictement avant cet indice peuvent être compressés.
 */
function findToolCompressCutoffIndex(messages: ChatMessage[]): number | null {
  const target = RECENT_ROUNDS_PROTECTED + 1;
  let seen = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && hasToolCalls(msg)) {
      seen++;
      if (seen === target) {
        return i;
      }
    }
  }
  return null;
}

/**
 * Remplace in-place le contenu des vieux tool results volumineux par un résumé court.
 * Les tool results des {@link RECENT_ROUNDS_PROTECTED} derniers rounds ne sont pas modifiés.
 */
export function compressToolResults(
  messages: ChatMessage[],
  threshold: number = TOOL_RESULT_THRESHOLD
): void {
  const cutoff = findToolCompressCutoffIndex(messages);
  if (cutoff === null) {
    return;
  }

  for (let i = 0; i < messages.length; i++) {
    if (i >= cutoff) {
      continue;
    }
    const msg = messages[i];
    if (msg.role !== 'tool') {
      continue;
    }
    const content = msg.content ?? '';
    if (content.length <= threshold) {
      continue;
    }
    const success = 'success' in msg ? msg.success : undefined;
    msg.content = `[Result compressed — success: ${String(success ?? 'unknown')}, length: ${content.length} chars]`;
  }
}

/**
 * Tronque l'historique entrant : conserve le début (contexte) et la fin (récent), avec un marqueur system.
 */
export function truncateHistory(
  messages: ChatMessage[],
  maxMessages: number = MAX_HISTORY_MESSAGES
): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  const headCount = 3;
  const syntheticCount = 1;
  if (maxMessages <= headCount + syntheticCount) {
    return messages.slice(-maxMessages);
  }

  const tailCount = maxMessages - headCount - syntheticCount;
  const head = messages.slice(0, headCount);
  const tail = messages.slice(-tailCount);
  const omitted = messages.length - headCount - tailCount;

  const synthetic: ChatMessage = {
    role: 'system',
    content: `[Conversation history truncated — ${omitted} messages omitted]`
  };

  return [...head, synthetic, ...tail];
}
