/**
 * Normalisation des messages client pour XAI API
 * Extrait de XAIVoiceProxyService.ts pour réduire la taille du fichier principal
 * 
 * Prévient les sessions "ping-only" en normalisant les messages client
 * avant envoi à l'API XAI.
 */

/**
 * Résultat de la normalisation d'un message
 */
export interface NormalizedMessage {
  normalized: Record<string, unknown>;
  mutations: string[];
}

/**
 * Normalise un message client pour l'API XAI
 * 
 * Applique les transformations nécessaires :
 * - Supprime session.modalities (non documenté par XAI)
 * - Renomme conversation.item.commit → input_audio_buffer.commit
 * - Normalise item.content (string → input_text[])
 * 
 * @param parsed - Message parsé (JSON)
 * @returns Message normalisé avec liste des mutations appliquées
 */
export function normalizeClientMessage(parsed: Record<string, unknown>): NormalizedMessage {
  const mutations: string[] = [];
  let outgoing: Record<string, unknown> = parsed;

  // Normalize event type aggressively (trims + removes zero-width chars)
  const normalizedType = typeof parsed.type === 'string'
    ? parsed.type.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    : parsed.type;
  const messageType = typeof normalizedType === 'string' ? normalizedType : (normalizedType || 'unknown');

  // 1) `session.update` does NOT document a `modalities` field in `session`.
  //    Some clients send it; strip it to avoid the server ignoring the update.
  if (messageType === 'session.update' && outgoing?.session && Array.isArray((outgoing.session as Record<string, unknown>).modalities)) {
    const session = outgoing.session as Record<string, unknown>;
    delete session.modalities;
    mutations.push('removed session.modalities');
  }

  // 2) Some clients send `conversation.item.commit`; server expects `input_audio_buffer.commit`.
  //    Be extremely defensive: some clients include invisible chars or odd variants.
  if (
    messageType === 'conversation.item.commit' ||
    (typeof messageType === 'string' && messageType.startsWith('conversation.item.commit')) ||
    (typeof parsed.type === 'string' && (parsed.type as string).includes('conversation.item.commit'))
  ) {
    outgoing = { ...outgoing, type: 'input_audio_buffer.commit' };
    mutations.push('renamed conversation.item.commit -> input_audio_buffer.commit');
  }

  // 3) Normalize text message shapes (ensure `item.content` is an array with `input_text`).
  if (messageType === 'conversation.item.create' && outgoing?.item) {
    const item = outgoing.item as Record<string, unknown>;
    if (typeof item.content === 'string') {
      outgoing.item = {
        ...item,
        content: [{ type: 'input_text', text: item.content }]
      };
      mutations.push('normalized item.content string -> input_text[]');
    } else if (Array.isArray(item.content)) {
      outgoing.item = {
        ...item,
        content: (item.content as unknown[]).map((c: unknown) => {
          if (c && typeof c === 'object' && !(c as Record<string, unknown>).type && typeof (c as Record<string, unknown>).text === 'string') {
            return { ...c, type: 'input_text' };
          }
          return c;
        })
      };
    }
  }

  return {
    normalized: outgoing,
    mutations
  };
}

