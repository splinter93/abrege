/**
 * Helpers pour les mutations de dossiers
 * Logique réutilisable extraite pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - Fonctions < 50 lignes
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';

/**
 * Déplacer récursivement tous les dossiers enfants lors d'un changement de classeur
 * @param parentFolderId - ID du dossier parent
 * @param targetClasseurId - ID du classeur cible
 * @param userId - ID utilisateur
 * @param supabase - Client Supabase
 */
export async function moveChildFoldersRecursive(
  parentFolderId: string,
  targetClasseurId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: childFolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', parentFolderId)
    .eq('user_id', userId);

  if (childFolders && childFolders.length > 0) {
    for (const child of childFolders) {
      await supabase
        .from('folders')
        .update({ classeur_id: targetClasseurId })
        .eq('id', child.id);
      
      // Récursion pour les sous-dossiers
      await moveChildFoldersRecursive(child.id, targetClasseurId, userId, supabase);
    }
  }
}

/**
 * Valider le dossier parent pour un déplacement
 * @param targetParentId - ID du dossier parent cible
 * @param folderId - ID du dossier à déplacer
 * @param userId - ID utilisateur
 * @param supabase - Client Supabase
 * @throws Error si validation échoue
 */
export async function validateFolderParent(
  targetParentId: string | null,
  folderId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  if (!targetParentId) {
    return; // Pas de parent = racine, OK
  }

  const { data: parentFolder, error: parentError } = await supabase
    .from('folders')
    .select('id, user_id')
    .eq('id', targetParentId)
    .single();

  if (parentError || !parentFolder) {
    throw new Error('Dossier parent non trouvé');
  }

  if (parentFolder.user_id !== userId) {
    throw new Error('Permissions insuffisantes pour le dossier parent');
  }

  if (targetParentId === folderId) {
    throw new Error('Un dossier ne peut pas être son propre parent');
  }
}

