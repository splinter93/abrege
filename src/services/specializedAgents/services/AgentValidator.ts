/**
 * Service de validation centralisé pour les agents spécialisés
 * Validation stricte et typée avec messages d'erreur clairs
 */

import { 
  AgentId, 
  UserToken, 
  SessionId, 
  AgentInput, 
  ValidationResult, 
  ValidationError,
  AgentErrorCode,
  CreateSpecializedAgentRequest,
  SpecializedAgentConfig
} from '../types/AgentTypes';
import { isGroqModelSupported } from '@/constants/groqModels';

export class AgentValidator {
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly SLUG_REGEX = /^[a-z0-9-]+$/;
  private static readonly SESSION_ID_REGEX = /^[a-zA-Z0-9-_]+$/;
  private static readonly MAX_INPUT_SIZE = 1024 * 1024; // 1MB
  private static readonly MAX_TEXT_LENGTH = 100000; // 100k caractères

  /**
   * Valide un token utilisateur
   */
  static validateUserToken(token: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      errors.push({
        code: 'INVALID_TOKEN',
        message: 'Token utilisateur invalide ou manquant',
        field: 'userToken'
      });
      return { valid: false, errors: errors.map(e => e.message) };
    }

    const trimmedToken = token.trim();
    const isUUID = this.UUID_REGEX.test(trimmedToken);
    const isJWT = trimmedToken.includes('.') && trimmedToken.split('.').length === 3;

    if (!isUUID && !isJWT) {
      errors.push({
        code: 'INVALID_TOKEN',
        message: 'Format de token invalide (attendu: UUID ou JWT)',
        field: 'userToken'
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Valide un ID d'agent (UUID ou slug)
   */
  static validateAgentId(agentId: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      errors.push({
        code: 'INVALID_AGENT_ID',
        message: 'AgentId invalide ou manquant',
        field: 'agentId'
      });
      return { valid: false, errors: errors.map(e => e.message) };
    }

    const trimmedId = agentId.trim();
    const isUUID = this.UUID_REGEX.test(trimmedId);
    const isSlug = this.SLUG_REGEX.test(trimmedId);

    if (!isUUID && !isSlug) {
      errors.push({
        code: 'INVALID_AGENT_ID',
        message: 'Format d\'agentId invalide (attendu: UUID ou slug alphanumérique)',
        field: 'agentId'
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Valide un ID de session
   */
  static validateSessionId(sessionId: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (sessionId === undefined || sessionId === null) {
      return { valid: true, errors: [] }; // Optionnel
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      errors.push({
        code: 'INVALID_SESSION_ID',
        message: 'SessionId doit être une chaîne non-vide',
        field: 'sessionId'
      });
      return { valid: false, errors: errors.map(e => e.message) };
    }

    if (!this.SESSION_ID_REGEX.test(sessionId)) {
      errors.push({
        code: 'INVALID_SESSION_ID',
        message: 'Format de sessionId invalide (attendu: alphanumérique, tirets et underscores)',
        field: 'sessionId'
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Valide un input d'agent
   */
  static validateAgentInput(input: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      errors.push({
        code: 'INVALID_INPUT',
        message: 'Input doit être un objet JSON valide',
        field: 'input'
      });
      return { valid: false, errors: errors.map(e => e.message) };
    }

    // Vérifier la taille
    const inputSize = JSON.stringify(input).length;
    if (inputSize > this.MAX_INPUT_SIZE) {
      errors.push({
        code: 'INVALID_INPUT',
        message: `Input trop volumineux (${inputSize} bytes, max: ${this.MAX_INPUT_SIZE} bytes)`,
        field: 'input'
      });
    }

    // Vérifier les propriétés textuelles
    const inputObj = input as Record<string, unknown>;
    const textFields = ['text', 'query', 'question', 'prompt', 'input'];
    
    for (const field of textFields) {
      if (inputObj[field] && typeof inputObj[field] === 'string') {
        const textLength = (inputObj[field] as string).length;
        if (textLength > this.MAX_TEXT_LENGTH) {
          errors.push({
            code: 'INVALID_INPUT',
            message: `Champ '${field}' trop long (${textLength} caractères, max: ${this.MAX_TEXT_LENGTH})`,
            field: field
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Valide une requête de création d'agent
   */
  static validateCreateRequest(config: CreateSpecializedAgentRequest): ValidationResult {
    const errors: ValidationError[] = [];

    // Slug
    if (!config.slug || !this.SLUG_REGEX.test(config.slug)) {
      errors.push({
        code: 'INVALID_SLUG',
        message: 'Slug requis et doit contenir uniquement des lettres minuscules, chiffres et tirets',
        field: 'slug'
      });
    }

    // Display name
    if (!config.display_name || config.display_name.trim().length === 0) {
      errors.push({
        code: 'INVALID_DISPLAY_NAME',
        message: 'Nom d\'affichage requis',
        field: 'display_name'
      });
    }

    // Model
    if (!config.model || config.model.trim().length === 0) {
      errors.push({
        code: 'INVALID_MODEL',
        message: 'Modèle requis',
        field: 'model'
      });
    } else if (!isGroqModelSupported(config.model)) {
      errors.push({
        code: 'INVALID_MODEL',
        message: `Modèle '${config.model}' non supporté`,
        field: 'model'
      });
    }

    // System instructions
    if (!config.system_instructions || config.system_instructions.trim().length === 0) {
      errors.push({
        code: 'INVALID_SYSTEM_INSTRUCTIONS',
        message: 'Instructions système requises',
        field: 'system_instructions'
      });
    }

    // Temperature
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push({
        code: 'INVALID_TEMPERATURE',
        message: 'Temperature doit être entre 0 et 2',
        field: 'temperature'
      });
    }

    // Max tokens
    if (config.max_tokens !== undefined && (config.max_tokens < 1 || config.max_tokens > 8192)) {
      errors.push({
        code: 'INVALID_MAX_TOKENS',
        message: 'Max tokens doit être entre 1 et 8192',
        field: 'max_tokens'
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Valide une configuration d'agent
   */
  static validateAgentConfig(config: Partial<SpecializedAgentConfig>): ValidationResult {
    const errors: ValidationError[] = [];

    if (config.slug && !this.SLUG_REGEX.test(config.slug)) {
      errors.push({
        code: 'INVALID_SLUG',
        message: 'Slug doit contenir uniquement des lettres minuscules, chiffres et tirets',
        field: 'slug'
      });
    }

    if (config.model && !isGroqModelSupported(config.model)) {
      errors.push({
        code: 'INVALID_MODEL',
        message: `Modèle '${config.model}' non supporté`,
        field: 'model'
      });
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push({
        code: 'INVALID_TEMPERATURE',
        message: 'Temperature doit être entre 0 et 2',
        field: 'temperature'
      });
    }

    if (config.max_tokens !== undefined && (config.max_tokens < 1 || config.max_tokens > 8192)) {
      errors.push({
        code: 'INVALID_MAX_TOKENS',
        message: 'Max tokens doit être entre 1 et 8192',
        field: 'max_tokens'
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Crée un AgentId typé
   */
  static createAgentId(value: string): AgentId {
    const validation = this.validateAgentId(value);
    if (!validation.valid) {
      throw new Error(`AgentId invalide: ${validation.errors.join(', ')}`);
    }

    const trimmedValue = value.trim();
    const type = this.UUID_REGEX.test(trimmedValue) ? 'uuid' : 'slug';
    
    return {
      value: trimmedValue,
      type
    } as const;
  }

  /**
   * Crée un UserToken typé
   */
  static createUserToken(value: string): UserToken {
    const validation = this.validateUserToken(value);
    if (!validation.valid) {
      throw new Error(`UserToken invalide: ${validation.errors.join(', ')}`);
    }

    const trimmedValue = value.trim();
    const type = this.UUID_REGEX.test(trimmedValue) ? 'uuid' : 'jwt';
    
    return {
      value: trimmedValue,
      type
    } as const;
  }

  /**
   * Crée un SessionId typé
   */
  static createSessionId(value: string): SessionId {
    const validation = this.validateSessionId(value);
    if (!validation.valid) {
      throw new Error(`SessionId invalide: ${validation.errors.join(', ')}`);
    }

    return {
      value: value.trim()
    } as const;
  }

  /**
   * Valide un input et le convertit en AgentInput typé
   */
  static validateAndCreateAgentInput(input: unknown): AgentInput {
    const validation = this.validateAgentInput(input);
    if (!validation.valid) {
      throw new Error(`Input invalide: ${validation.errors.join(', ')}`);
    }

    return input as AgentInput;
  }
}
