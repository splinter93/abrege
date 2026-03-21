/**
 * Rule : Override de modèle selon le niveau reasoning sélectionné
 * 
 * Logique :
 * - Si reasoningOverride === null → pas d'override
 * - Sinon → mapping par provider :
 *   - xAI : tous les niveaux → grok-4-1-fast-reasoning (seul modèle xAI proposé dans l'app) ; params (temp.) différencient advanced / fast
 *   - Autres providers : logique à définir selon besoins futurs
 * 
 * Optionnel : override des paramètres (temperature plus basse pour advanced, plus haute pour fast)
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ModelOverrideContext, ModelOverrideResult, ModelOverrideRule, LLMParams } from '../types';

/**
 * Mapping des modèles par provider et niveau reasoning
 */
interface ReasoningModelMap {
  advanced: string;
  general: string;
  fast: string;
}

/**
 * Maps de modèles par provider
 */
const XAI_REASONING_MODEL = 'grok-4-1-fast-reasoning';

const REASONING_MODELS: Record<string, ReasoningModelMap> = {
  xai: {
    advanced: XAI_REASONING_MODEL,
    general: XAI_REASONING_MODEL,
    fast: XAI_REASONING_MODEL
  }
  // Autres providers : à ajouter selon besoins futurs
  // groq: { ... },
  // liminality: { ... }
};

/**
 * Rule pour l'override de modèle selon le niveau reasoning
 */
export class ReasoningOverrideRule implements ModelOverrideRule {
  name = 'ReasoningOverride';

  /**
   * Détermine si la rule doit être appliquée
   * 
   * Condition : reasoningOverride !== null
   */
  shouldApply(context: ModelOverrideContext): boolean {
    return context.reasoningOverride !== null;
  }

  /**
   * Applique l'override : switch vers le modèle correspondant au niveau reasoning
   * 
   * Optionnel : override des paramètres selon le niveau reasoning
   */
  apply(context: ModelOverrideContext): ModelOverrideResult {
    const reasoningLevel = context.reasoningOverride!;
    const targetModel = this.getModelForReasoningLevel(
      context.provider,
      reasoningLevel
    );

    if (!targetModel) {
      // Provider non supporté → pas d'override
      logger.warn(`[ReasoningOverrideRule] ⚠️ Provider ${context.provider} non supporté pour reasoning override`);
      return {
        model: context.originalModel,
        originalModel: context.originalModel,
        reason: `Provider ${context.provider} ne supporte pas le reasoning override`,
        wasOverridden: false
      };
    }

    // Optionnel : override des paramètres selon le niveau reasoning
    const paramsOverride = this.getParamsOverride(
      reasoningLevel,
      context.originalParams
    );

    logger.info(`[ReasoningOverrideRule] 🧠 Switch reasoning:`, {
      originalModel: context.originalModel,
      reasoningLevel,
      targetModel,
      hasParamsOverride: !!paramsOverride
    });

    return {
      model: targetModel,
      originalModel: context.originalModel,
      reason: `Override reasoning: ${reasoningLevel} → ${targetModel}`,
      wasOverridden: true,
      paramsOverride: paramsOverride && Object.keys(paramsOverride).length > 0
        ? paramsOverride
        : undefined
    };
  }

  /**
   * Récupère le modèle correspondant au niveau reasoning pour un provider
   * 
   * @param provider - Provider LLM
   * @param level - Niveau reasoning (advanced, general, fast)
   * @returns ID du modèle ou null si non supporté
   */
  private getModelForReasoningLevel(
    provider: string,
    level: 'advanced' | 'general' | 'fast'
  ): string | null {
    const providerMap = REASONING_MODELS[provider.toLowerCase()];
    
    if (!providerMap) {
      return null;
    }

    return providerMap[level] || null;
  }

  /**
   * Calcule les paramètres overridés selon le niveau reasoning
   * 
   * Logique :
   * - Advanced : température plus basse (précision) → max(original, 0.5)
   * - Fast : température plus haute (créativité) → min(original, 0.8)
   * - General : pas d'override (garde original)
   * 
   * @param level - Niveau reasoning
   * @param originalParams - Paramètres originaux
   * @returns Paramètres overridés (optionnel)
   */
  private getParamsOverride(
    level: 'advanced' | 'general' | 'fast',
    originalParams: LLMParams
  ): Partial<LLMParams> | undefined {
    const override: Partial<LLMParams> = {};

    switch (level) {
      case 'advanced':
        // Advanced reasoning : température plus basse pour plus de précision
        if (originalParams.temperature !== undefined) {
          override.temperature = Math.min(originalParams.temperature, 0.5);
        } else {
          override.temperature = 0.5;
        }
        break;

      case 'fast':
        // Fast : température plus haute pour plus de créativité
        if (originalParams.temperature !== undefined) {
          override.temperature = Math.max(originalParams.temperature, 0.8);
        } else {
          override.temperature = 0.8;
        }
        break;

      case 'general':
        // General : pas d'override, garde les paramètres originaux
        return undefined;
    }

    return Object.keys(override).length > 0 ? override : undefined;
  }
}

