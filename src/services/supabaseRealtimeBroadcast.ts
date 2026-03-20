/**
 * Supabase Realtime Broadcast pour le streaming editNoteContent
 *
 * Utilise un client singleton avec la service_role key pour broadcaster
 * depuis le serveur sans authentification utilisateur.
 *
 * channel.send() via HTTP REST (pas WebSocket) : pas besoin de subscribe().
 * On vérifie la valeur de retour pour détecter les échecs silencieux.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';

const CHANNEL_PREFIX = 'note-stream:';

// ─── Singleton ────────────────────────────────────────────────────────────────
// Un seul client pour tout le process serveur. Évite N GoTrueClient + N connexions
// WebSocket lors d'un stream avec plusieurs dizaines de chunks.

let _client: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logApi.warn('[supabaseRealtimeBroadcast] Missing env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    return null;
  }

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _client;
}

/**
 * Envoie un événement de stream via Supabase Realtime Broadcast (HTTP).
 *
 * Retourne false si :
 * - Variables d'environnement manquantes
 * - `channel.send()` retourne une valeur non-"ok"
 * - Exception levée
 *
 * Utilisé par contentStreamer pour signaler start / chunk / end / error.
 */
export async function sendStreamEvent(
  noteId: string,
  event: 'chunk' | 'end' | 'start' | 'error' | 'content_updated',
  payload: Record<string, unknown>
): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;

  try {
    const channel = supabase.channel(`${CHANNEL_PREFIX}${noteId}`);
    const status = await channel.send({
      type: 'broadcast',
      event,
      payload
    });

    // channel.send() retourne 'ok' en cas de succès, ou un message d'erreur.
    if (status !== 'ok') {
      logApi.warn('[supabaseRealtimeBroadcast] channel.send() returned non-ok status', {
        noteId,
        event,
        status
      });
      return false;
    }

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
