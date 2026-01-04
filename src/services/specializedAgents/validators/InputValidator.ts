/**
 * Validation des inputs pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import { SchemaValidator } from '../schemaValidator';
import type { SpecializedAgentConfig, ValidationResult } from '@/types/specializedAgents';

export class InputValidator {
  /**
   * Valider un input selon le schéma de l'agent
   */
  static validateInput(
    input: Record<string, unknown>,
    agent: SpecializedAgentConfig,
    traceId: string
  ): ValidationResult {
    // Validation de base
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      logger.error(`[InputValidator] ❌ Input invalide`, { traceId, inputType: typeof input });
      return {
        valid: false,
        errors: ['Input doit être un objet JSON valide']
      };
    }

    // Validation de la taille
    const inputSize = JSON.stringify(input).length;
    const MAX_INPUT_SIZE = 1024 * 1024; // 1MB
    
    if (inputSize > MAX_INPUT_SIZE) {
      logger.error(`[InputValidator] ❌ Input trop volumineux`, { 
        traceId, 
        inputSize, 
        maxSize: MAX_INPUT_SIZE 
      });
      return {
        valid: false,
        errors: [`Input trop volumineux (${inputSize} bytes, max: ${MAX_INPUT_SIZE} bytes)`]
      };
    }

    // Validation selon le schéma d'entrée
    if (agent.input_schema) {
      const validation = SchemaValidator.validateInput(input, agent.input_schema);
      if (!validation.valid) {
        logger.warn(`[InputValidator] ❌ Validation échouée`, { 
          traceId, 
          errors: validation.errors 
        });
        return validation;
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Valider un agentId
   */
  static validateAgentId(agentId: string): ValidationResult {
    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      return {
        valid: false,
        errors: ['AgentId invalide ou manquant']
      };
    }

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
    const isValidSlug = /^[a-z0-9-]+$/.test(agentId);
    
    if (!isValidUUID && !isValidSlug) {
      return {
        valid: false,
        errors: ['AgentId doit être un UUID valide ou un slug sécurisé']
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Valider un token utilisateur
   */
  static validateUserToken(userToken: string): ValidationResult {
    if (!userToken || typeof userToken !== 'string' || userToken.trim().length === 0) {
      return {
        valid: false,
        errors: ['Token utilisateur invalide ou manquant']
      };
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToken);
    const isJWT = userToken.includes('.') && userToken.split('.').length === 3;
    
    if (!isUUID && !isJWT) {
      return {
        valid: false,
        errors: ['Format de token invalide (attendu: UUID ou JWT)']
      };
    }

    return { valid: true, errors: [] };
  }
}


