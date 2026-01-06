/**
 * Service de validation des inputs pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentResponse } from '@/types/specializedAgents';

const MAX_INPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Service de validation des inputs
 */
export class InputValidator {
  /**
   * Valider le token utilisateur
   */
  validateUserToken(userToken: string, agentId: string): { valid: boolean; error?: SpecializedAgentResponse } {
    if (!userToken || typeof userToken !== 'string' || userToken.trim().length === 0) {
      logger.error(`[InputValidator] ❌ Token utilisateur invalide`, { agentId });
      return {
        valid: false,
        error: {
          success: false,
          error: 'Token utilisateur invalide ou manquant',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    // Validation du format du token (UUID ou JWT)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToken);
    const isJWT = userToken.includes('.') && userToken.split('.').length === 3;
    
    logger.info(`[InputValidator] 🔍 Token reçu:`, {
      agentId,
      tokenType: isUUID ? 'UUID' : isJWT ? 'JWT' : 'INVALID',
      tokenLength: userToken.length,
      tokenStart: userToken.substring(0, 20) + '...'
    });
    
    if (!isUUID && !isJWT) {
      logger.error(`[InputValidator] ❌ Format de token invalide`, { 
        agentId, 
        tokenType: typeof userToken,
        tokenLength: userToken.length 
      });
      return {
        valid: false,
        error: {
          success: false,
          error: 'Format de token invalide (attendu: UUID ou JWT)',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    return { valid: true };
  }

  /**
   * Valider l'input
   */
  validateInput(input: unknown, agentId: string): { valid: boolean; error?: SpecializedAgentResponse } {
    // Validation de l'input pour éviter les injections
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      logger.error(`[InputValidator] ❌ Input invalide`, { agentId, inputType: typeof input });
      return {
        valid: false,
        error: {
          success: false,
          error: 'Input doit être un objet JSON valide',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    // Validation de la taille de l'input
    const inputSize = JSON.stringify(input).length;
    
    if (inputSize > MAX_INPUT_SIZE) {
      logger.error(`[InputValidator] ❌ Input trop volumineux`, { 
        agentId, 
        inputSize, 
        maxSize: MAX_INPUT_SIZE 
      });
      return {
        valid: false,
        error: {
          success: false,
          error: `Input trop volumineux (${inputSize} bytes, max: ${MAX_INPUT_SIZE} bytes)`,
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    return { valid: true };
  }

  /**
   * Valider l'agentId
   */
  validateAgentId(agentId: string): { valid: boolean; error?: SpecializedAgentResponse } {
    // Validation de l'agentId pour éviter les injections
    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      logger.error(`[InputValidator] ❌ AgentId invalide`, { agentId });
      return {
        valid: false,
        error: {
          success: false,
          error: 'AgentId invalide ou manquant',
          metadata: {
            agentId: 'unknown',
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    // Validation du format de l'agentId (UUID ou slug sécurisé)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
    const isValidSlug = /^[a-z0-9-]+$/.test(agentId);
    
    if (!isValidUUID && !isValidSlug) {
      logger.error(`[InputValidator] ❌ Format d'agentId invalide`, { 
        agentId, 
        isValidUUID, 
        isValidSlug 
      });
      return {
        valid: false,
        error: {
          success: false,
          error: 'Format d\'agentId invalide (attendu: UUID ou slug alphanumérique)',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    return { valid: true };
  }

  /**
   * Valider la sessionId
   */
  validateSessionId(sessionId: string | undefined, agentId: string): { valid: boolean; error?: SpecializedAgentResponse } {
    if (sessionId === undefined) {
      return { valid: true };
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      logger.error(`[InputValidator] ❌ SessionId invalide`, { agentId, sessionId });
      return {
        valid: false,
        error: {
          success: false,
          error: 'SessionId doit être une chaîne non-vide',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }
    
    // Validation du format de sessionId (alphanumérique + tirets)
    if (!/^[a-zA-Z0-9-_]+$/.test(sessionId)) {
      logger.error(`[InputValidator] ❌ Format de sessionId invalide`, { agentId, sessionId });
      return {
        valid: false,
        error: {
          success: false,
          error: 'Format de sessionId invalide (attendu: alphanumérique, tirets et underscores)',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        }
      };
    }

    return { valid: true };
  }
}

