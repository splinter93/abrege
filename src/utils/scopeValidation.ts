import { AuthResult } from './authUtils';
import { logApi } from './logger';

/**
 * Vérifie si l'utilisateur a le scope requis pour effectuer une action
 */
export function hasRequiredScope(
  authResult: AuthResult, 
  requiredScope: string, 
  context: { operation: string; component: string }
): boolean {
  if (!authResult.success || !authResult.scopes) {
    logApi.error(`❌ Pas de scopes disponibles pour ${requiredScope}`, context);
    return false;
  }

  const hasScope = authResult.scopes.includes(requiredScope);
  
  if (!hasScope) {
    logApi.warn(`❌ Scope manquant: ${requiredScope}. Scopes disponibles: ${authResult.scopes.join(', ')}`, context);
  } else {
    logApi.info(`✅ Scope validé: ${requiredScope}`, context);
  }

  return hasScope;
}

/**
 * Vérifie si l'utilisateur a au moins un des scopes requis
 */
export function hasAnyRequiredScope(
  authResult: AuthResult, 
  requiredScopes: readonly string[], 
  context: { operation: string; component: string }
): boolean {
  if (!authResult.success || !authResult.scopes) {
    logApi.error(`❌ Pas de scopes disponibles pour ${requiredScopes.join(' ou ')}`, context);
    return false;
  }

  const hasAnyScope = requiredScopes.some(scope => authResult.scopes!.includes(scope));
  
  if (!hasAnyScope) {
    logApi.warn(`❌ Aucun scope requis trouvé: ${requiredScopes.join(' ou ')}. Scopes disponibles: ${authResult.scopes.join(', ')}`, context);
  } else {
    const matchedScopes = requiredScopes.filter(scope => authResult.scopes!.includes(scope));
    logApi.info(`✅ Scope(s) validé(s): ${matchedScopes.join(', ')}`, context);
  }

  return hasAnyScope;
}

/**
 * Mapping des actions vers les scopes requis
 */
export const ACTION_SCOPES = {
  // Notes
  'notes:read': ['notes:read'],
  'notes:write': ['notes:write'],
  'notes:delete': ['notes:write'], // La suppression nécessite write
  'notes:create': ['notes:write'],
  'notes:update': ['notes:write'],
  
  // Classeurs
  'classeurs:read': ['classeurs:read'],
  'classeurs:write': ['classeurs:write'],
  'classeurs:delete': ['classeurs:write'], // La suppression nécessite write
  'classeurs:create': ['classeurs:write'],
  'classeurs:update': ['classeurs:write'],
  
  // Dossiers
  'dossiers:read': ['dossiers:read'],
  'dossiers:write': ['dossiers:write'],
  'dossiers:delete': ['dossiers:write'], // La suppression nécessite write
  'dossiers:create': ['dossiers:write'],
  'dossiers:update': ['dossiers:write'],
  
  // Fichiers
  'files:read': ['files:read'],
  'files:write': ['files:write'],
  'files:delete': ['files:write'], // La suppression nécessite write
  'files:upload': ['files:write'],
  
  // Agents
  'agents:execute': ['agents:execute'],
  'agents:read': ['agents:read'],
  
  // Recherche
  'search:content': ['notes:read', 'classeurs:read', 'dossiers:read'],
  
  // Profil
  'profile:read': ['profile:read']
} as const;

export type ActionScope = keyof typeof ACTION_SCOPES;

/**
 * Vérifie si l'utilisateur peut effectuer une action spécifique
 */
export function canPerformAction(
  authResult: AuthResult,
  action: ActionScope,
  context: { operation: string; component: string }
): boolean {
  const requiredScopes = ACTION_SCOPES[action];
  if (!requiredScopes) {
    logApi.error(`❌ Action inconnue: ${action}`, context);
    return false;
  }

  return hasAnyRequiredScope(authResult, requiredScopes, context);
}
