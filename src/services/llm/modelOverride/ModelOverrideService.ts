/**
 * Service principal pour l'orchestration des overrides de modèle LLM
 * 
 * Responsabilités :
 * - Enregistrement des rules (pattern Strategy)
 * - Résolution séquentielle des overrides
 * - Fusion intelligente des paramètres
 * - Logging structuré
 * 
 * Pattern Singleton : conforme aux services LLM existants (SystemMessageBuilder, etc.)
 */

import { simpleLogger as logger } from '@/utils/logger';
import type {
  ModelOverrideContext,
  ModelOverrideResult,
  ModelOverrideRule,
  LLMParams
} from './types';

/**
 * Résultat final de la résolution modèle + params
 */
export interface ModelResolutionResult {
  model: string;
  params: LLMParams;
  originalModel: string;
  reasons: string[];
}

/**
 * Service d'orchestration des overrides
 */
export class ModelOverrideService {
  private static instance: ModelOverrideService;
  private rules: ModelOverrideRule[] = [];

  private constructor() {
    // Singleton : constructeur privé
  }

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): ModelOverrideService {
    if (!ModelOverrideService.instance) {
      ModelOverrideService.instance = new ModelOverrideService();
    }
    return ModelOverrideService.instance;
  }

  /**
   * Enregistre une rule d'override
   * 
   * L'ordre d'enregistrement détermine la priorité d'application
   * (première rule enregistrée = première appliquée)
   * 
   * @param rule - Rule à enregistrer
   */
  registerRule(rule: ModelOverrideRule): void {
    this.rules.push(rule);
    logger.dev(`[ModelOverrideService] ✅ Rule enregistrée: ${rule.name}`);
  }

  /**
   * Résout le modèle et les paramètres finaux en appliquant toutes les rules
   * 
   * Processus :
   * 1. Applique les rules dans l'ordre d'enregistrement
   * 2. Chaque rule peut override le modèle ET/OU les paramètres
   * 3. Fusionne les paramètres overridés (dernière rule gagne en cas de conflit)
   * 4. Retourne le résultat final avec toutes les raisons
   * 
   * @param context - Contexte d'override (modèle original, provider, images, reasoning, params)
   * @returns Résultat avec modèle final, params fusionnés, et raisons
   */
  resolveModelAndParams(context: ModelOverrideContext): ModelResolutionResult {
    let currentModel = context.originalModel;
    let currentParams: LLMParams = { ...context.originalParams };
    const reasons: string[] = [];

    logger.dev(`[ModelOverrideService] 🔍 Résolution override:`, {
      originalModel: context.originalModel,
      provider: context.provider,
      hasImages: context.hasImages,
      reasoningOverride: context.reasoningOverride,
      rulesCount: this.rules.length
    });

    // Appliquer les rules dans l'ordre d'enregistrement
    for (const rule of this.rules) {
      try {
        if (rule.shouldApply(context)) {
          const result = rule.apply({
            ...context,
            originalModel: currentModel, // Mettre à jour avec le modèle actuel
            originalParams: currentParams // Mettre à jour avec les params actuels
          });

          if (result.wasOverridden) {
            currentModel = result.model;
            reasons.push(result.reason);

            // Fusionner les paramètres overridés
            if (result.paramsOverride) {
              currentParams = {
                ...currentParams,
                ...result.paramsOverride
              };

              logger.dev(`[ModelOverrideService] 🔧 Params overridés par ${rule.name}:`, {
                before: context.originalParams,
                after: currentParams
              });
            }

            logger.info(`[ModelOverrideService] 🔄 Override appliqué (${rule.name}):`, {
              originalModel: result.originalModel,
              newModel: result.model,
              reason: result.reason
            });
          }
        }
      } catch (error) {
        // Fallback gracieux : si une rule échoue, on continue avec les autres
        logger.error(`[ModelOverrideService] ❌ Erreur dans rule ${rule.name}:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }

    const finalResult: ModelResolutionResult = {
      model: currentModel,
      params: currentParams,
      originalModel: context.originalModel,
      reasons
    };

    if (reasons.length > 0) {
      logger.info(`[ModelOverrideService] ✅ Résolution terminée:`, {
        originalModel: context.originalModel,
        finalModel: currentModel,
        reasonsCount: reasons.length,
        reasons
      });
    } else {
      logger.dev(`[ModelOverrideService] ✅ Pas d'override nécessaire`);
    }

    return finalResult;
  }
}

