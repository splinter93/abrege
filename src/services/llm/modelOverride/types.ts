/**
 * Types stricts pour le système d'override de modèle LLM
 * 
 * Architecture modulaire : règles isolées, service d'orchestration
 * Conforme GUIDE-EXCELLENCE-CODE : types stricts, pas de any
 */

/**
 * Paramètres LLM modifiables par les rules
 * Extensible : ajouter d'autres paramètres si besoin (top_k, frequency_penalty, etc.)
 */
export interface LLMParams {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

/**
 * Contexte complet pour déterminer si un override est nécessaire
 * 
 * @property originalModel - Modèle configuré dans l'agent (source de vérité)
 * @property provider - Provider LLM (groq, xai, liminality)
 * @property hasImages - True si le message contient des images
 * @property reasoningOverride - Niveau reasoning sélectionné par l'utilisateur (null = pas d'override)
 * @property originalParams - Paramètres originaux de l'agent (temperature, topP, maxTokens)
 */
export interface ModelOverrideContext {
  originalModel: string;
  provider: string;
  hasImages: boolean;
  reasoningOverride?: 'advanced' | 'general' | 'fast' | null;
  originalParams: LLMParams;
}

/**
 * Résultat d'une rule d'override
 * 
 * @property model - Modèle à utiliser (peut être identique à originalModel si pas d'override)
 * @property originalModel - Modèle original (pour traçabilité)
 * @property reason - Raison de l'override (pour logging/tooltip UI)
 * @property wasOverridden - True si le modèle a été modifié
 * @property paramsOverride - Paramètres overridés (optionnel, fusionné par le service)
 */
export interface ModelOverrideResult {
  model: string;
  originalModel: string;
  reason: string;
  wasOverridden: boolean;
  paramsOverride?: Partial<LLMParams>;
}

/**
 * Contrat standardisé pour toutes les rules d'override
 * 
 * Pattern Strategy : chaque rule implémente cette interface
 * Permet d'ajouter facilement de nouvelles rules sans modifier le service principal
 * 
 * @property name - Nom unique de la rule (pour logging)
 * @method shouldApply - Détermine si la rule doit être appliquée
 * @method apply - Applique l'override et retourne le résultat
 */
export interface ModelOverrideRule {
  name: string;
  shouldApply(context: ModelOverrideContext): boolean;
  apply(context: ModelOverrideContext): ModelOverrideResult;
}

