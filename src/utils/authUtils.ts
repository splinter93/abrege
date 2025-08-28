import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { logApi } from './logger';
import { oauthService } from '@/services/oauthService'; // ✅ Import statique corrigé
import { ApiKeyService } from '@/services/apiKeyService'; // ✅ Import du nouveau service

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
  scopes?: string[];
  authType?: 'oauth' | 'jwt' | 'api_key';
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
 * Supporte à la fois les tokens OAuth, les JWT Supabase et les API Keys
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    console.log('🚨 [AUTH] ===== DÉBUT GETAUTHENTICATEDUSER =====');
    
    // ✅ ESSAYER D'ABORD L'API KEY
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey) {
      console.log('🚨 [AUTH] API Key détectée, validation...');
      try {
        const apiKeyUser = await validateApiKey(apiKey);
        if (apiKeyUser) {
          console.log('🚨 [AUTH] ✅ Utilisateur authentifié via API Key:', apiKeyUser.user_id);
          console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER API KEY SUCCÈS =====');
          
          return {
            success: true,
            userId: apiKeyUser.user_id,
            scopes: apiKeyUser.scopes || ['notes:read', 'classeurs:read', 'dossiers:read'],
            authType: 'api_key'
          };
        }
      } catch (apiKeyError) {
        console.log('🚨 [AUTH] ❌ API Key invalide, essai OAuth...');
      }
    }
    
    // ✅ ESSAYER LE TOKEN OAUTH
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🚨 [AUTH] Header Authorization reçu:', 'PRÉSENT');
      
      const token = authHeader.substring(7);
      console.log('🚨 [AUTH] Token extrait:', token ? 'PRÉSENT' : 'ABSENT');
      console.log('🚨 [AUTH] Longueur token:', token.length);
      
      try {
        console.log('🚨 [AUTH] Test authentification OAuth...');
        const oauthUser = await oauthService.validateAccessToken(token);
        
        if (oauthUser) {
          console.log('🚨 [AUTH] ✅ Utilisateur authentifié via OAuth:', oauthUser.user_id);
          console.log('🚨 [AUTH] Scopes OAuth:', oauthUser.scopes);
          console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER OAUTH SUCCÈS =====');
          
          return {
            success: true,
            userId: oauthUser.user_id,
            scopes: oauthUser.scopes,
            authType: 'oauth'
          };
        }
      } catch (oauthError) {
        console.log('🚨 [AUTH] ❌ Token OAuth invalide, essai JWT Supabase...');
      }
      
      // ✅ ESSAYER LE JWT SUPABASE (fallback)
      try {
        console.log('🚨 [AUTH] Test authentification JWT Supabase...');
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
        
        const { data: { user }, error } = await supabaseWithToken.auth.getUser();
        
        if (error || !user) {
          console.log('🚨 [AUTH] ❌ JWT Supabase invalide');
          throw new Error('JWT invalide');
        }

        console.log('🚨 [AUTH] ✅ Utilisateur authentifié via JWT Supabase:', user.id);
        console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER JWT SUCCÈS =====');

        return {
          success: true,
          userId: user.id,
          authType: 'jwt'
        };
      } catch (jwtError) {
        console.log('🚨 [AUTH] ❌ JWT Supabase échoué aussi');
      }
    } else {
      console.log('🚨 [AUTH] Header Authorization reçu:', 'ABSENT');
    }
    
    // ❌ AUCUNE AUTHENTIFICATION VALIDE
    console.log('🚨 [AUTH] ❌ Aucune méthode d\'authentification valide');
    return {
      success: false,
      error: 'Authentification requise - API Key, OAuth ou JWT valide nécessaire',
      status: 401
    };

  } catch (error) {
    console.log('🚨 [AUTH] ❌ EXCEPTION dans getAuthenticatedUser:', error);
    console.log('🚨 [AUTH] Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    
    logApi.error(`❌ Erreur authentification: ${error}`, { component: 'AuthUtils', error });
    return {
      success: false,
      error: 'Erreur lors de l\'authentification',
      status: 500
    };
  }
}

/**
 * Vérifie les permissions d'un utilisateur sur une ressource
 * 
 * Cette fonction implémente un système de permissions hiérarchique :
 * 1. Vérifie si l'utilisateur est le propriétaire direct de la ressource
 * 2. Vérifie les permissions spécifiques accordées à l'utilisateur
 * 3. Vérifie les permissions héritées depuis les ressources parentes
 * 
 * @param resourceId - ID unique de la ressource à vérifier
 * @param resourceType - Type de ressource ('article', 'folder', 'classeur')
 * @param requiredRole - Rôle minimum requis pour l'accès
 * @param userId - ID de l'utilisateur dont on vérifie les permissions
 * @param context - Contexte de l'opération pour le logging
 * @param authenticatedSupabaseClient - Client Supabase authentifié optionnel
 * 
 * @returns Promise<PermissionResult> - Résultat de la vérification des permissions
 * 
 * @example
 * ```typescript
 * const result = await checkUserPermission(
 *   'note-123', 
 *   'article', 
 *   'editor', 
 *   'user-456', 
 *   { operation: 'update_note', component: 'API' }
 * );
 * 
 * if (result.hasPermission) {
 *   // L'utilisateur peut modifier la note
 * }
 * ```
 */
export async function checkUserPermission(
  resourceId: string,
  resourceType: ResourceType,
  requiredRole: PermissionRole,
  userId: string,
  context: { operation: string; component: string },
  authenticatedSupabaseClient?: any
): Promise<PermissionResult> {
  try {
    // Validation des paramètres d'entrée
    if (!resourceId || !resourceType || !requiredRole || !userId) {
      logApi.error('❌ Paramètres invalides pour checkUserPermission', { 
        resourceId, resourceType, requiredRole, userId 
      });
      return {
        success: false,
        hasPermission: false,
        error: 'Paramètres invalides pour la vérification des permissions',
        status: 400
      };
    }

    // Validation du type de ressource
    if (!['article', 'folder', 'classeur'].includes(resourceType)) {
      logApi.error('❌ Type de ressource invalide', { resourceType });
      return {
        success: false,
        hasPermission: false,
        error: 'Type de ressource invalide',
        status: 400
      };
    }

    // Utiliser le client authentifié si fourni, sinon utiliser le client par défaut
    const client = authenticatedSupabaseClient || supabase;
    
    // 1. Vérifier si l'utilisateur est le propriétaire
    const { data: resource, error: fetchError } = await client
      .from(getTableName(resourceType))
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (fetchError || !resource) {
      // Gestion spécifique des erreurs de base de données
      if (fetchError) {
        logApi.error(`❌ Erreur base de données lors de la vérification des permissions`, { 
          resourceId, resourceType, userId, error: fetchError 
        });
        
        // Erreurs de connexion ou de permissions
        if (fetchError.code === 'PGRST116' || fetchError.code === '42501') {
          return {
            success: false,
            hasPermission: false,
            error: 'Erreur d\'accès à la base de données',
            status: 500
          };
        }
      }
      
      logApi.error(`❌ Ressource non trouvée: ${resourceId}`, { resourceId, resourceType, userId });
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
    const { data: specificPermissions, error: specificError } = await supabase
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
      const { data: article, error: articleError } = await supabase
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
      const { data: folder, error: folderError } = await supabase
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
    logApi.error(`❌ Erreur vérification permissions: ${error}`, { resourceId, resourceType, userId, error });
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

/**
 * Valide une API Key et retourne les informations utilisateur associées
 */
async function validateApiKey(apiKey: string): Promise<{ user_id: string; scopes?: string[] } | null> {
  try {
    console.log('🚨 [AUTH] Validation API Key via service...');
    console.log('🚨 [AUTH] API Key reçue (longueur):', apiKey ? apiKey.length : 'NULL');
    console.log('🚨 [AUTH] API Key début:', apiKey ? apiKey.substring(0, 10) + '...' : 'NULL');
    
    // Utiliser le nouveau service pour valider l'API Key
    const apiKeyInfo = await ApiKeyService.validateApiKey(apiKey);
    
    if (!apiKeyInfo) {
      console.log('🚨 [AUTH] API Key invalide via service');
      return null;
    }
    
    console.log('🚨 [AUTH] ✅ API Key valide via service pour utilisateur:', apiKeyInfo.user_id);
    console.log('🚨 [AUTH] Scopes API Key:', apiKeyInfo.scopes);
    
    return {
      user_id: apiKeyInfo.user_id,
      scopes: apiKeyInfo.scopes
    };
    
  } catch (error) {
    console.log('🚨 [AUTH] ❌ Erreur validation API Key via service:', error);
    console.log('🚨 [AUTH] Stack trace:', error.stack);
    return null;
  }
} 