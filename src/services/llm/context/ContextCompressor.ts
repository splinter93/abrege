import type { ChatMessage, ToolMessage } from '@/types/chat';
import { hasToolCalls } from '@/types/chat';

/**
 * Inserted in place of compressed internal tool results (e.g. __plan_update).
 * Worded so the LLM understands the status was recorded and it should continue
 * without re-declaring the plan.
 */
export const INTERNAL_TOOL_COMPRESSED_MARKER =
  '[Plan update acknowledged — step status was recorded. Content omitted from context to save tokens. Continue with the next step.]';

/**
 * Retire en fin de préfixe les assistants avec tool_calls non suivis de messages tool dans ce même préfixe
 * (sinon plusieurs providers rejettent la requête).
 */
function trimTrailingIncompleteAssistantToolCalls(messages: ChatMessage[]): ChatMessage[] {
  const out = [...messages];
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (last.role === 'assistant' && hasToolCalls(last)) {
      out.pop();
      continue;
    }
    break;
  }
  return out;
}

/**
 * Retire en tête de suffixe les tool orphelins et les blocs assistant(tool_calls) incomplets
 * (lorsque la troncature a supprimé les tool results du milieu).
 */
function trimLeadingInvalidToolSequence(messages: ChatMessage[]): ChatMessage[] {
  const out = [...messages];
  while (out.length > 0) {
    const first = out[0];
    if (first.role === 'tool') {
      out.shift();
      continue;
    }
    if (first.role === 'assistant' && hasToolCalls(first)) {
      const calls = first.tool_calls;
      if (out.length < 1 + calls.length) {
        out.shift();
        continue;
      }
      let valid = true;
      for (let i = 0; i < calls.length; i++) {
        const next = out[1 + i];
        if (
          !next ||
          next.role !== 'tool' ||
          (next as ToolMessage).tool_call_id !== calls[i].id
        ) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        out.shift();
        continue;
      }
    }
    break;
  }
  return out;
}

/**
 * Retire les messages tool orphelins (sans assistant avec tool_calls précédent)
 * depuis n'importe quelle position dans le tableau.
 *
 * Cas couverts :
 * - Assistant persisté avec tool_calls = null/undefined (corruption partielle)
 * - Troncature ayant coupé l'assistant mais conservé son tool result
 * - Reload de page avec état store partiel
 *
 * Ne modifie pas les sequences valides (assistant→tool→... conservées intactes).
 */
export function sanitizeToolSequences(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const msg of messages) {
    if (msg.role === 'tool') {
      // Chercher le dernier message non-tool dans out
      let lastNonTool: ChatMessage | undefined;
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].role !== 'tool') {
          lastNonTool = out[i];
          break;
        }
      }
      if (!lastNonTool || !hasToolCalls(lastNonTool)) {
        // Orphelin : l'assistant précédent n'a pas de tool_calls → skip
        continue;
      }
    }
    out.push(msg);
  }
  return out;
}

/**
 * Nettoyage défensif avant construction du payload provider.
 *
 * Couvre les corruptions observées côté chat :
 * - bulles optimistes/pending envoyées par erreur ;
 * - réponses assistant identiques repersistées par un ancien stream ;
 * - anciens messages user restés sans réponse, alors que le message courant
 *   est ajouté séparément à la fin du payload.
 */
export function sanitizeHistoryForLLM(messages: ChatMessage[]): ChatMessage[] {
  const sorted = [...messages].sort((a, b) => {
    const seqA = typeof a.sequence_number === 'number' ? a.sequence_number : Number.POSITIVE_INFINITY;
    const seqB = typeof b.sequence_number === 'number' ? b.sequence_number : Number.POSITIVE_INFINITY;
    if (seqA !== seqB) {
      return seqA - seqB;
    }

    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB;
  });

  const seenIdentityKeys = new Set<string>();
  const seenAssistantFingerprints = new Set<string>();
  const cleaned: ChatMessage[] = [];

  for (const msg of sorted) {
    const id = typeof msg.id === 'string' ? msg.id : '';
    const isStreaming = 'isStreaming' in msg && msg.isStreaming === true;
    if (msg.role === 'system' || id.startsWith('temp-') || id.startsWith('pending-') || isStreaming) {
      continue;
    }

    const contentFingerprint = normalizeContentForFingerprint(msg.content);
    const hasContent = contentFingerprint.length > 0;
    const hasToolPayload = msg.role === 'assistant' && hasToolCalls(msg);
    if (!hasContent && !hasToolPayload) {
      continue;
    }

    const identityKeys = getHistoryIdentityKeys(msg);
    if (identityKeys.some((key) => seenIdentityKeys.has(key))) {
      continue;
    }

    if (msg.role === 'assistant' && !hasToolPayload && contentFingerprint.length > 80) {
      if (seenAssistantFingerprints.has(contentFingerprint)) {
        continue;
      }
      seenAssistantFingerprints.add(contentFingerprint);
    }

    identityKeys.forEach((key) => seenIdentityKeys.add(key));
    cleaned.push(msg);
  }

  while (cleaned.length > 0 && cleaned[cleaned.length - 1]?.role === 'user') {
    cleaned.pop();
  }

  return cleaned;
}

function getHistoryIdentityKeys(message: ChatMessage): string[] {
  const keys: string[] = [];

  if (message.operation_id) {
    keys.push(`op:${message.operation_id}`);
  }
  if (message.id && !message.id.startsWith('temp-') && !message.id.startsWith('pending-')) {
    keys.push(`id:${message.id}`);
  }
  if (typeof message.sequence_number === 'number') {
    keys.push(`seq:${message.sequence_number}`);
  }

  return keys;
}

function normalizeContentForFingerprint(content: ChatMessage['content']): string {
  if (typeof content === 'string') {
    return content.trim().replace(/\s+/g, ' ');
  }

  try {
    return JSON.stringify(content);
  } catch {
    return '';
  }
}

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
 *
 * @param alwaysCompressToolNames — noms d'outils dont l'historique est toujours compressé
 *   avant le cutoff (seuil 0), ex. `__plan_update` pour limiter l'accumulation de feedbacks courts.
 */
export function compressToolResults(
  messages: ChatMessage[],
  threshold: number = TOOL_RESULT_THRESHOLD,
  alwaysCompressToolNames: ReadonlySet<string> = new Set()
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
    const toolMsg = msg as ToolMessage;
    const content = msg.content ?? '';

    if (alwaysCompressToolNames.has(toolMsg.name)) {
      if (content === INTERNAL_TOOL_COMPRESSED_MARKER) {
        continue;
      }
      msg.content = INTERNAL_TOOL_COMPRESSED_MARKER;
      continue;
    }

    if (content.length <= threshold) {
      continue;
    }
    const success = toolMsg.success;
    const originalLen = content.length;
    msg.content = `[Result compressed — success: ${String(success ?? 'unknown')}, length: ${originalLen} chars]`;
  }
}

/**
 * Tronque l'historique chat en gardant uniquement les N derniers messages (ordre chronologique).
 * À préférer à {@link truncateHistory} pour le chat : évite de réinjecter les 3 premiers
 * messages de la conversation, source de confusion quand l'utilisateur demande « mes derniers messages ».
 */
export function truncateRecentHistory(
  messages: ChatMessage[],
  maxMessages: number = MAX_HISTORY_MESSAGES
): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages.slice();
  }
  return trimLeadingInvalidToolSequence(messages.slice(-maxMessages));
}

/**
 * Tronque l'historique entrant : conserve le début (contexte) et la fin (récent), avec un marqueur system.
 * Réservé aux cas où le début de conversation doit être préservé (hors chat standard).
 */
export function truncateHistory(
  messages: ChatMessage[],
  maxMessages: number = MAX_HISTORY_MESSAGES
): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages.slice();
  }

  const headCount = 3;
  const syntheticCount = 1;
  if (maxMessages <= headCount + syntheticCount) {
    return messages.slice(-maxMessages);
  }

  const tailCount = maxMessages - headCount - syntheticCount;
  const head = trimTrailingIncompleteAssistantToolCalls(messages.slice(0, headCount));
  const tail = trimLeadingInvalidToolSequence(messages.slice(-tailCount));

  if (head.length === 0 || tail.length === 0) {
    return messages.slice(-maxMessages);
  }

  const omitted = messages.length - head.length - tail.length;

  const synthetic: ChatMessage = {
    role: 'system',
    content: `[Conversation history truncated — ${omitted} messages omitted]`
  };

  return [...head, synthetic, ...tail];
}
