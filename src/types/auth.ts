/**
 * Types d'authentification pour le système de tool calls
 * TypeScript strict - Production ready
 */

/**
 * Type de token utilisé dans l'application
 */
export type TokenType = 'JWT' | 'UUID' | 'UNKNOWN';

/**
 * Résultat de validation d'un token
 */
export interface TokenValidationResult {
  /** Validation réussie */
  isValid: boolean;
  /** ID de l'utilisateur (si validation réussie) */
  userId?: string;
  /** Email de l'utilisateur (si disponible) */
  email?: string;
  /** Type de token détecté */
  tokenType: TokenType;
  /** Message d'erreur (si validation échouée) */
  error?: string;
}

/**
 * Headers d'authentification standardisés pour les appels API
 */
export interface AuthHeaders {
  /** Content-Type (toujours application/json) */
  'Content-Type': 'application/json';
  /** Type de client effectuant l'appel */
  'X-Client-Type': 'agent' | 'user' | 'system';
  /** Token d'authentification Bearer (JWT uniquement) */
  'Authorization': `Bearer ${string}`;
}

/**
 * Contexte d'authentification pour l'exécution de tool calls
 */
export interface ToolAuthContext {
  /** JWT d'authentification (jamais userId) */
  userToken: string;
  /** ID de l'utilisateur (extrait du JWT) */
  userId: string;
  /** Type de token */
  tokenType: TokenType;
  /** Timestamp de validation */
  validatedAt: string;
}

/**
 * Options pour la validation de token
 */
export interface TokenValidationOptions {
  /** Autoriser les UUID (pour impersonation) */
  allowUuid?: boolean;
  /** Vérifier l'expiration du token */
  checkExpiration?: boolean;
  /** Logger la validation */
  logValidation?: boolean;
}

/**
 * Type guard pour vérifier si une valeur est un JWT valide
 */
export function isJWT(token: string): boolean {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
}

/**
 * Type guard pour vérifier si une valeur est un UUID v4
 */
export function isUUID(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}

/**
 * Détecte le type de token
 */
export function detectTokenType(token: string): TokenType {
  if (isUUID(token)) return 'UUID';
  if (isJWT(token)) return 'JWT';
  return 'UNKNOWN';
}

