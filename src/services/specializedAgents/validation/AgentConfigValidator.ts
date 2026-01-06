/**
 * Service de validation de la configuration des agents
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { SchemaValidator } from '../schemaValidator';
import type { SpecializedAgentConfig, ValidationResult } from '@/types/specializedAgents';

/**
 * Service de validation de la configuration des agents
 */
export class AgentConfigValidator {
  /**
   * Valider la configuration d'un agent
   */
  validateAgentConfig(config: Partial<SpecializedAgentConfig>): ValidationResult {
    const errors: string[] = [];

    // Validation des champs requis si présents
    if (config.slug !== undefined && (!config.slug || !config.slug.match(/^[a-z0-9-]+$/))) {
      errors.push('Slug doit contenir uniquement des lettres minuscules, chiffres et tirets');
    }

    if (config.display_name !== undefined && (!config.display_name || config.display_name.trim().length === 0)) {
      errors.push('Nom d\'affichage requis');
    }

    if (config.model !== undefined && (!config.model || config.model.trim().length === 0)) {
      errors.push('Modèle requis');
    }

    if (config.system_instructions !== undefined && (!config.system_instructions || config.system_instructions.trim().length === 0)) {
      errors.push('Instructions système requises');
    }

    // Validation des paramètres numériques
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature doit être un nombre entre 0 et 2');
      }
    }

    if (config.max_tokens !== undefined) {
      if (typeof config.max_tokens !== 'number' || config.max_tokens < 1 || config.max_tokens > 8192) {
        errors.push('Max tokens doit être un nombre entre 1 et 8192');
      }
    }

    if (config.top_p !== undefined) {
      if (typeof config.top_p !== 'number' || config.top_p < 0 || config.top_p > 1) {
        errors.push('Top_p doit être un nombre entre 0 et 1');
      }
    }

    // Valider les schémas si fournis
    if (config.input_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.input_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma d'entrée invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    if (config.output_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.output_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma de sortie invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

