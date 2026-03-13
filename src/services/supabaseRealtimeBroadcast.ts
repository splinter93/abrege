/**
 * Supabase Realtime Broadcast pour le streaming editNoteContent
 *
 * Remplace streamBroadcastService pour les chunks/events de note.
 * Utilise channel.send() sans subscribe (HTTP sous le capot).
 * Compatible serverless (pas de Map in-memory).
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';

const CHANNEL_PREFIX = 'note-stream:';

/**
 * Envoie un événement de stream via Supabase Realtime Broadcast
 * Retourne false si erreur (pour fallback DB côté editNoteContent)
 */
export async function sendStreamEvent(
  noteId: string,
  event: 'chunk' | 'end' | 'start' | 'error' | 'content_updated',
  payload: Record<string, unknown>
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logApi.warn('[supabaseRealtimeBroadcast] Missing env vars, skip send', {
      noteId,
      event,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const channel = supabase.channel(`${CHANNEL_PREFIX}${noteId}`);
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logApi.warn('[supabaseRealtimeBroadcast] Send failed', {
      noteId,
      event,
      error: message
    });
    return false;
  }
}
