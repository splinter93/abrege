/**
 * Types TypeScript stricts pour le proxy WebSocket XAI Voice
 * Conforme au GUIDE D'EXCELLENCE - TypeScript strict (pas de any)
 */

/**
 * État d'une connexion proxy
 */
export type ProxyConnectionState = 
  | 'disconnected'
  | 'connecting_client'
  | 'connecting_xai'
  | 'connected'
  | 'error'
  | 'closing';

/**
 * Métadonnées d'une connexion proxy
 */
export interface ProxyConnectionMetadata {
  connectionId: string;
  userId?: string;
  sessionId?: string;
  connectedAt: number;
  lastActivity: number;
  state: ProxyConnectionState;
}

/**
 * Message proxy bidirectionnel
 * Format compatible avec les messages XAI Voice API
 */
export interface ProxyMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Configuration du serveur proxy
 */
export interface XAIVoiceProxyConfig {
  port: number;
  xaiApiKey: string;
  path?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  pingInterval?: number;
}

/**
 * Options pour la création d'une connexion proxy
 */
export interface ProxyConnectionOptions {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Résultat d'une opération proxy
 */
export interface ProxyOperationResult {
  success: boolean;
  error?: string;
  connectionId?: string;
}

/**
 * Type guard pour vérifier si un objet est un ProxyMessage valide
 */
export function isProxyMessage(value: unknown): value is ProxyMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.type === 'string';
}

/**
 * Type guard pour vérifier ProxyConnectionMetadata
 */
export function isProxyConnectionMetadata(value: unknown): value is ProxyConnectionMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.connectionId === 'string' &&
    typeof obj.connectedAt === 'number' &&
    typeof obj.lastActivity === 'number' &&
    typeof obj.state === 'string'
  );
}

