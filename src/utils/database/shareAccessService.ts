/**
 * shareAccessService
 * Résolution d'accès partagé pour les notes.
 *
 * Utilisé par les routes API note pour déterminer si un userId a accès à une
 * note dont il n'est pas propriétaire, via un classeur partagé (classeur_shares).
 *
 * Fonctionne en service role (pas de RLS) — les vérifications d'accès sont
 * appliquées en application (ownerId filter sur toutes les queries DB).
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';

export type PermissionLevel = 'read' | 'write';

export type NoteAccess = {
  /** user_id du propriétaire de la note (à utiliser dans les filtres DB) */
  ownerId: string;
  /** Niveau d'accès du userId demandeur */
  permissionLevel: PermissionLevel;
};

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type NoteRow = {
  user_id: string;
  classeur_id: string | null;
};

type ShareRow = {
  permission_level: string;
};

/**
 * Résout l'accès d'un userId à une note.
 *
 * - Propriétaire → { ownerId: userId, permissionLevel: 'write' }
 * - Collaborateur (classeur partagé) → { ownerId: noteOwnerId, permissionLevel: 'read' | 'write' }
 * - Aucun accès → null
 */
export async function resolveNoteAccess(
  noteId: string,
  userId: string,
): Promise<NoteAccess | null> {
  const service = createServiceClient();
  if (!service) {
    logApi.error('[shareAccessService] Service client non disponible');
    return null;
  }

  const { data: note, error: noteErr } = await service
    .from('articles')
    .select('user_id, classeur_id')
    .eq('id', noteId)
    .is('trashed_at', null)
    .maybeSingle();

  if (noteErr) {
    logApi.info(`[shareAccessService] Erreur lecture note ${noteId}: ${noteErr.message}`);
    return null;
  }

  if (!note) return null;

  const noteRow = note as NoteRow;

  // Propriétaire — accès total
  if (noteRow.user_id === userId) {
    return { ownerId: userId, permissionLevel: 'write' };
  }

  // Collaborateur — vérifier classeur_shares
  if (!noteRow.classeur_id) return null;

  const { data: share, error: shareErr } = await service
    .from('classeur_shares')
    .select('permission_level')
    .eq('classeur_id', noteRow.classeur_id)
    .eq('shared_with', userId)
    .maybeSingle();

  if (shareErr) {
    logApi.info(`[shareAccessService] Erreur lecture classeur_shares: ${shareErr.message}`);
    return null;
  }

  if (!share) return null;

  const shareRow = share as ShareRow;
  const permissionLevel: PermissionLevel =
    shareRow.permission_level === 'write' ? 'write' : 'read';

  return { ownerId: noteRow.user_id, permissionLevel };
}
