import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { logApi } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PermissionRole = 'viewer' | 'editor' | 'owner';
export type ResourceType = 'article' | 'folder' | 'classeur';

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  status?: number;
}

export interface PermissionResult {
  success: boolean;
  hasPermission: boolean;
  role?: PermissionRole;
  error?: string;
  status?: number;
}

/**
 * Récupère l'utilisateur authentifié depuis la requête
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Récupérer le token d'authentification depuis les headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Token d\'authentification manquant',
        status: 401
      };
    }

    const token = authHeader.substring(7);
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return {
        success: false,
        error: 'Token d\'authentification invalide',
        status: 401
      };
    }

    return {
      success: true,
      userId: user.id
    };

  } catch (error) {
    logApi('auth_utils', `❌ Erreur authentification: ${error}`, { component: 'AuthUtils' });
    return {
      success: false,
      error: 'Erreur lors de l\'authentification',
      status: 500
    };
  }
}

/**
 * Vérifie les permissions d'un utilisateur sur une ressource
 */
export async function checkUserPermission(
  resourceId: string,
  resourceType: ResourceType,
  requiredRole: PermissionRole,
  userId: string,
  context: { operation: string; component: string }
): Promise<PermissionResult> {
  try {
    // 1. Vérifier si l'utilisateur est le propriétaire
    const { data: resource, error: fetchError } = await supabase
      .from(getTableName(resourceType))
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (fetchError || !resource) {
      logApi('permission_check', `❌ Ressource non trouvée: ${resourceId}`, context);
      return {
        success: false,
        hasPermission: false,
        error: `${resourceType === 'article' ? 'Article' : resourceType === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
        status: 404
      };
    }

    // Si l'utilisateur est le propriétaire, il a tous les droits
    if (resource.user_id === userId) {
      return {
        success: true,
        hasPermission: true,
        role: 'owner'
      };
    }

    // 2. Vérifier les permissions spécifiques
    const { data: specificPermissions } = await supabase
      .from(`${resourceType}_permissions`)
      .select('role')
      .eq(`${resourceType}_id`, resourceId)
      .eq('user_id', userId)
      .single();

    if (specificPermissions) {
      const hasPermission = checkRolePermission(specificPermissions.role as PermissionRole, requiredRole);
      return {
        success: true,
        hasPermission,
        role: specificPermissions.role as PermissionRole
      };
    }

    // 3. Vérifier les permissions héritées du dossier parent (pour les articles)
    if (resourceType === 'article') {
      const { data: article } = await supabase
        .from('articles')
        .select('folder_id, classeur_id')
        .eq('id', resourceId)
        .single();

      if (article?.folder_id) {
        const folderPermission = await checkInheritedPermission(
          article.folder_id, 
          'folder', 
          userId, 
          requiredRole
        );
        if (folderPermission.hasPermission) {
          return folderPermission;
        }
      }

      // 4. Vérifier les permissions héritées du classeur
      if (article?.classeur_id) {
        const classeurPermission = await checkInheritedPermission(
          article.classeur_id, 
          'classeur', 
          userId, 
          requiredRole
        );
        if (classeurPermission.hasPermission) {
          return classeurPermission;
        }
      }
    }

    // 5. Vérifier les permissions héritées du classeur parent (pour les dossiers)
    if (resourceType === 'folder') {
      const { data: folder } = await supabase
        .from('folders')
        .select('classeur_id')
        .eq('id', resourceId)
        .single();

      if (folder?.classeur_id) {
        const classeurPermission = await checkInheritedPermission(
          folder.classeur_id, 
          'classeur', 
          userId, 
          requiredRole
        );
        if (classeurPermission.hasPermission) {
          return classeurPermission;
        }
      }
    }

    // Aucune permission trouvée
    return {
      success: true,
      hasPermission: false,
      role: undefined
    };

  } catch (error) {
    logApi('permission_check', `❌ Erreur vérification permissions: ${error}`, context);
    return {
      success: false,
      hasPermission: false,
      error: 'Erreur lors de la vérification des permissions',
      status: 500
    };
  }
}

/**
 * Vérifie les permissions héritées d'une ressource parent
 */
async function checkInheritedPermission(
  parentId: string,
  parentType: ResourceType,
  userId: string,
  requiredRole: PermissionRole
): Promise<PermissionResult> {
  try {
    const { data: inheritedPermission } = await supabase
      .from(`${parentType}_permissions`)
      .select('role')
      .eq(`${parentType}_id`, parentId)
      .eq('user_id', userId)
      .single();

    if (inheritedPermission) {
      const hasPermission = checkRolePermission(inheritedPermission.role as PermissionRole, requiredRole);
      return {
        success: true,
        hasPermission,
        role: inheritedPermission.role as PermissionRole
      };
    }

    return {
      success: true,
      hasPermission: false,
      role: undefined
    };

  } catch (error) {
    return {
      success: false,
      hasPermission: false,
      error: 'Erreur lors de la vérification des permissions héritées',
      status: 500
    };
  }
}

/**
 * Vérifie si un rôle a les permissions requises
 */
function checkRolePermission(userRole: PermissionRole, requiredRole: PermissionRole): boolean {
  const roleHierarchy = {
    'viewer': 1,
    'editor': 2,
    'owner': 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Retourne le nom de la table pour un type de ressource
 */
function getTableName(resourceType: ResourceType): string {
  switch (resourceType) {
    case 'article':
      return 'articles';
    case 'folder':
      return 'folders';
    case 'classeur':
      return 'classeurs';
    default:
      throw new Error(`Type de ressource non supporté: ${resourceType}`);
  }
}

/**
 * Vérifie si un article est public
 */
export async function isArticlePublic(articleId: string): Promise<boolean> {
  try {
    const { data: article } = await supabase
      .from('articles')
      .select('visibility')
      .eq('id', articleId)
      .single();

    return article?.visibility === 'public';
  } catch (error) {
    return false;
  }
} 