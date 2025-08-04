import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PermissionRole = 'viewer' | 'editor' | 'owner';

export interface PermissionInheritanceWarning {
  message: string;
  oldPermissions: PermissionRole[];
  newPermissions: PermissionRole[];
  canProceed: boolean;
}

/**
 * Vérifie si un déplacement va écraser des permissions spécifiques
 */
export async function checkPermissionInheritance(
  noteId: string,
  targetFolderId: string | null,
  targetClasseurId: string
): Promise<PermissionInheritanceWarning | null> {
  try {
    // Récupérer les permissions actuelles de la note
    const { data: currentPermissions } = await supabase
      .from('article_permissions')
      .select('role')
      .eq('article_id', noteId);

    // Récupérer les permissions du dossier cible
    let targetPermissions: PermissionRole[] = [];
    
    if (targetFolderId) {
      const { data: folderPermissions } = await supabase
        .from('folder_permissions')
        .select('role')
        .eq('folder_id', targetFolderId);
      
      targetPermissions = folderPermissions?.map(p => p.role as PermissionRole) || [];
      
      // Si le dossier n'a pas de permissions, hériter du classeur
      if (targetPermissions.length === 0) {
        const { data: classeurPermissions } = await supabase
          .from('classeur_permissions')
          .select('role')
          .eq('classeur_id', targetClasseurId);
        
        targetPermissions = classeurPermissions?.map(p => p.role as PermissionRole) || [];
      }
    } else {
      // Permissions directes du classeur
      const { data: classeurPermissions } = await supabase
        .from('classeur_permissions')
        .select('role')
        .eq('classeur_id', targetClasseurId);
      
      targetPermissions = classeurPermissions?.map(p => p.role as PermissionRole) || [];
    }

    const currentRoles = currentPermissions?.map(p => p.role as PermissionRole) || [];
    
    // Vérifier s'il y a des permissions spécifiques qui vont être écrasées
    if (currentRoles.length > 0 && targetPermissions.length > 0) {
      return {
        message: `Cette note va hériter des permissions du ${targetFolderId ? 'dossier' : 'classeur'} (${targetPermissions.join(', ')}). Les permissions actuelles (${currentRoles.join(', ')}) seront écrasées.`,
        oldPermissions: currentRoles,
        newPermissions: targetPermissions,
        canProceed: true
      };
    }

    return null;
  } catch (error) {
    logger.error('Erreur lors de la vérification des permissions:', error);
    return null;
  }
}

/**
 * Déplace une note avec gestion des permissions
 */
export async function moveNoteWithPermissionHandling(
  noteId: string,
  targetFolderId: string | null,
  targetClasseurId: string,
  showWarning: boolean = true
): Promise<{ success: boolean; warning?: PermissionInheritanceWarning }> {
  try {
    // Vérifier l'héritage des permissions
    const warning = await checkPermissionInheritance(noteId, targetFolderId, targetClasseurId);
    
    if (warning && showWarning) {
      return { success: false, warning };
    }

    // Procéder au déplacement (les triggers DB gèrent l'héritage automatiquement)
    const { error } = await supabase
      .from('articles')
      .update({
        folder_id: targetFolderId,
        classeur_id: targetClasseurId
      })
      .eq('id', noteId);

    if (error) {
      logger.error('Erreur lors du déplacement de la note:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('Erreur dans moveNoteWithPermissionHandling:', error);
    return { success: false };
  }
}

/**
 * Affiche un message d'avertissement pour l'héritage des permissions
 */
export function showPermissionInheritanceWarning(warning: PermissionInheritanceWarning): Promise<boolean> {
  return new Promise((resolve) => {
    // Ici on pourrait utiliser une modal ou un toast
    const confirmed = window.confirm(
      `${warning.message}\n\nVoulez-vous continuer ?`
    );
    resolve(confirmed);
  });
} 