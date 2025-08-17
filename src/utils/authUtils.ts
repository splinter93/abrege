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
    console.log('🚨 [AUTH] ===== DÉBUT GETAUTHENTICATEDUSER =====');
    
    // Récupérer le token d'authentification depuis les headers
    const authHeader = request.headers.get('Authorization');
    console.log('🚨 [AUTH] Header Authorization reçu:', authHeader ? 'PRÉSENT' : 'ABSENT');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚨 [AUTH] ❌ Header Authorization manquant ou invalide');
      return {
        success: false,
        error: 'Token d\'authentification manquant',
        status: 401
      };
    }

    const token = authHeader.substring(7);
    console.log('🚨 [AUTH] Token extrait:', token ? 'PRÉSENT' : 'ABSENT');
    console.log('🚨 [AUTH] Longueur token:', token.length);
    
    // SOLUTION ALTERNATIVE : Créer un client Supabase avec le token
    console.log('🚨 [AUTH] Création client Supabase avec token...');
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    // Tester l'authentification en récupérant l'utilisateur
    console.log('🚨 [AUTH] Test authentification avec client tokenisé...');
    const { data: { user }, error } = await supabaseWithToken.auth.getUser();
    
    console.log('🚨 [AUTH] Résultat authentification:', { user: !!user, error: error?.message || 'Aucune erreur' });
    
    if (error || !user) {
      console.log('🚨 [AUTH] ❌ Authentification échouée:', error?.message || 'Pas d\'utilisateur');
      return {
        success: false,
        error: 'Token d\'authentification invalide',
        status: 401
      };
    }

    console.log('🚨 [AUTH] ✅ Utilisateur authentifié:', user.id);
    console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER SUCCÈS =====');

    return {
      success: true,
      userId: user.id
    };

  } catch (error) {
    console.log('🚨 [AUTH] ❌ EXCEPTION dans getAuthenticatedUser:', error);
    console.log('🚨 [AUTH] Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    
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
    console.log('🚨 [DEBUG] ===== DÉBUT CHECKUSERPERMISSION =====');
    console.log('🚨 [DEBUG] Paramètres reçus:', { resourceId, resourceType, requiredRole, userId, context });
    
    // 1. Vérifier si l'utilisateur est le propriétaire
    console.log('🚨 [DEBUG] Étape 1: Vérification propriétaire...');
    console.log('🚨 [DEBUG] Table à interroger:', getTableName(resourceType));
    console.log('🚨 [DEBUG] Requête: SELECT user_id FROM', getTableName(resourceType), 'WHERE id =', resourceId);
    console.log('🚨 [DEBUG] Client Supabase configuré:', !!supabase);
    
    // Test de connexion Supabase
    console.log('🚨 [DEBUG] Test de connexion Supabase...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('articles')
        .select('id')
        .limit(1);
      console.log('🚨 [DEBUG] Test connexion Supabase:', { testData, testError });
    } catch (testException) {
      console.log('🚨 [DEBUG] ❌ Exception test connexion:', testException);
    }
    
    const { data: resource, error: fetchError } = await supabase
      .from(getTableName(resourceType))
      .select('user_id')
      .eq('id', resourceId)
      .single();

    console.log('🚨 [DEBUG] Résultat requête propriétaire:', { resource, fetchError });
    console.log('🚨 [DEBUG] Requête exécutée avec succès:', !fetchError);
    console.log('🚨 [DEBUG] Données retournées:', !!resource);
    
    if (fetchError || !resource) {
      console.log('🚨 [DEBUG] ❌ Ressource non trouvée ou erreur:', { fetchError, resource });
      console.log('🚨 [DEBUG] Détails erreur:', fetchError ? {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint
      } : 'Pas d\'erreur mais pas de ressource');
      
      logApi('permission_check', `❌ Ressource non trouvée: ${resourceId}`, context);
      return {
        success: false,
        hasPermission: false,
        error: `${resourceType === 'article' ? 'Article' : resourceType === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
        status: 404
      };
    }

    console.log('🚨 [DEBUG] ✅ Ressource trouvée:', resource);
    console.log('🚨 [DEBUG] user_id de la ressource:', resource.user_id);
    console.log('🚨 [DEBUG] userId de l\'utilisateur:', userId);
    console.log('🚨 [DEBUG] Comparaison:', resource.user_id === userId ? 'ÉGAL' : 'DIFFÉRENT');

    // Si l'utilisateur est le propriétaire, il a tous les droits
    if (resource.user_id === userId) {
      console.log('🚨 [DEBUG] ✅ Utilisateur est propriétaire, permissions accordées');
      return {
        success: true,
        hasPermission: true,
        role: 'owner'
      };
    }

    console.log('🚨 [DEBUG] ❌ Utilisateur n\'est PAS propriétaire, vérification autres permissions...');

    // 2. Vérifier les permissions spécifiques
    console.log('🚨 [DEBUG] Étape 2: Vérification permissions spécifiques...');
    const { data: specificPermissions, error: specificError } = await supabase
      .from(`${resourceType}_permissions`)
      .select('role')
      .eq(`${resourceType}_id`, resourceId)
      .eq('user_id', userId)
      .single();

    console.log('🚨 [DEBUG] Résultat permissions spécifiques:', { specificPermissions, specificError });

    if (specificPermissions) {
      const hasPermission = checkRolePermission(specificPermissions.role as PermissionRole, requiredRole);
      console.log('🚨 [DEBUG] ✅ Permissions spécifiques trouvées:', { role: specificPermissions.role, hasPermission });
      return {
        success: true,
        hasPermission,
        role: specificPermissions.role as PermissionRole
      };
    }

    console.log('🚨 [DEBUG] ❌ Aucune permission spécifique trouvée');

    // 3. Vérifier les permissions héritées du dossier parent (pour les articles)
    if (resourceType === 'article') {
      console.log('🚨 [DEBUG] Étape 3: Vérification permissions héritées (article)...');
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('folder_id, classeur_id')
        .eq('id', resourceId)
        .single();

      console.log('🚨 [DEBUG] Résultat récupération article:', { article, articleError });

      if (article?.folder_id) {
        console.log('🚨 [DEBUG] Vérification permissions dossier parent:', article.folder_id);
        const folderPermission = await checkInheritedPermission(
          article.folder_id, 
          'folder', 
          userId, 
          requiredRole
        );
        console.log('🚨 [DEBUG] Résultat permissions dossier:', folderPermission);
        if (folderPermission.hasPermission) {
          console.log('🚨 [DEBUG] ✅ Permissions héritées du dossier accordées');
          return folderPermission;
        }
      }

      // 4. Vérifier les permissions héritées du classeur
      if (article?.classeur_id) {
        console.log('🚨 [DEBUG] Vérification permissions classeur parent:', article.classeur_id);
        const classeurPermission = await checkInheritedPermission(
          article.classeur_id, 
          'classeur', 
          userId, 
          requiredRole
        );
        console.log('🚨 [DEBUG] Résultat permissions classeur:', classeurPermission);
        if (classeurPermission.hasPermission) {
          console.log('🚨 [DEBUG] ✅ Permissions héritées du classeur accordées');
          return classeurPermission;
        }
      }
    }

    // 5. Vérifier les permissions héritées du classeur parent (pour les dossiers)
    if (resourceType === 'folder') {
      console.log('🚨 [DEBUG] Étape 4: Vérification permissions héritées (dossier)...');
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('classeur_id')
        .eq('id', resourceId)
        .single();

      console.log('🚨 [DEBUG] Résultat récupération dossier:', { folder, folderError });

      if (folder?.classeur_id) {
        console.log('🚨 [DEBUG] Vérification permissions classeur parent:', folder.classeur_id);
        const classeurPermission = await checkInheritedPermission(
          folder.classeur_id, 
          'classeur', 
          userId, 
          requiredRole
        );
        console.log('🚨 [DEBUG] Résultat permissions classeur:', classeurPermission);
        if (classeurPermission.hasPermission) {
          console.log('🚨 [DEBUG] ✅ Permissions héritées du classeur accordées');
          return classeurPermission;
        }
      }
    }

    // Aucune permission trouvée
    console.log('🚨 [DEBUG] ❌ Aucune permission trouvée, accès refusé');
    console.log('🚨 [DEBUG] ===== FIN CHECKUSERPERMISSION - ACCÈS REFUSÉ =====');
    
    return {
      success: true,
      hasPermission: false,
      role: undefined
    };

  } catch (error) {
    console.log('🚨 [DEBUG] ❌ EXCEPTION dans checkUserPermission:', error);
    console.log('🚨 [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    
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