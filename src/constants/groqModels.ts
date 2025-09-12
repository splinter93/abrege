/**
 * Modèles Groq supportés par l'API
 * Basé sur la liste officielle des modèles disponibles
 */

export const GROQ_MODELS = {
  // Modèles préférentiels - Nos modèles référence
  'openai/gpt-oss-20b': {
    name: 'OpenAI GPT-OSS 20B',
    inputPrice: 0.10,
    outputPrice: 0.50,
    category: 'preferred',
    description: 'Excellent modèle généraliste, fiable et performant',
    capabilities: {
      reasoningEffort: true,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: false,
      multimodalContent: false
    }
  },
  'openai/gpt-oss-120b': {
    name: 'OpenAI GPT-OSS 120B',
    inputPrice: 0.15,
    outputPrice: 0.75,
    category: 'preferred',
    description: 'Modèle généraliste plus puissant',
    capabilities: {
      reasoningEffort: true,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: false,
      multimodalContent: false
    }
  },
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    name: 'Llama 4 Scout',
    inputPrice: 0.11,
    outputPrice: 0.34,
    category: 'preferred',
    description: 'Puissant pour la génération de texte créative et structurée',
    capabilities: {
      reasoningEffort: false,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: true,
      multimodalContent: true
    }
  },
  'meta-llama/llama-4-maverick-17b-128e-instruct': {
    name: 'Llama 4 Maverick',
    inputPrice: 0.20,
    outputPrice: 0.60,
    category: 'preferred',
    description: 'Puissant pour la génération de texte créative et structurée (Premium)',
    capabilities: {
      reasoningEffort: false,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: true,
      multimodalContent: true
    }
  },

  // Modèles alternatifs
  'kimi-k2-0905': {
    name: 'Kimi K2-0905',
    inputPrice: 1.00,
    outputPrice: 3.00,
    category: 'alternative',
    description: 'Modèle classique performant',
    capabilities: {
      reasoningEffort: false,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: false,
      multimodalContent: false
    }
  },
  'deepseek-r1-distill-llama-70b': {
    name: 'DeepSeek R1 Distill Llama 70B',
    inputPrice: 0.75,
    outputPrice: 0.99,
    category: 'reasoning',
    description: 'Modèle de réflexion avancée',
    capabilities: {
      reasoningEffort: true,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: false,
      multimodalContent: false
    }
  },

  'qwen/qwen-3-32b-instruct': {
    name: 'Qwen3-32B',
    inputPrice: 0.29,
    outputPrice: 0.59,
    category: 'alternative',
    description: 'Bon compromis selon le contexte',
    capabilities: {
      reasoningEffort: false,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: false,
      multimodalContent: false
    }
  },
  'meta-llama/llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B Versatile',
    inputPrice: 0.59,
    outputPrice: 0.79,
    category: 'alternative',
    description: 'Modèle Llama polyvalent',
    capabilities: {
      reasoningEffort: false,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: true,
      multimodalContent: true
    }
  },

  // Modèles de sécurité
  'meta-llama/llama-guard-4-12b': {
    name: 'Llama Guard 4 12B',
    inputPrice: 0.20,
    outputPrice: 0.20,
    category: 'safety',
    description: 'Modèle de sécurité et modération',
    capabilities: {
      reasoningEffort: false,
      parallelToolCalls: true,
      serviceTier: true,
      imageSupport: false,
      multimodalContent: false
    }
  }
} as const;

/**
 * Types TypeScript pour les modèles Groq
 */
export type GroqModelId = keyof typeof GROQ_MODELS;

/**
 * Interface pour les capacités d'un modèle
 */
export interface GroqModelCapabilities {
  reasoningEffort: boolean;
  parallelToolCalls: boolean;
  serviceTier: boolean;
  imageSupport: boolean;
  multimodalContent: boolean;
}
export type GroqModelCategory = 'preferred' | 'reasoning' | 'alternative' | 'safety';

/**
 * Interface pour les informations d'un modèle
 */
export interface GroqModelInfo {
  name: string;
  inputPrice: number;
  outputPrice: number;
  category: GroqModelCategory;
  description: string;
  capabilities: GroqModelCapabilities;
}

/**
 * Vérifie si un modèle est supporté par Groq
 */
export function isGroqModelSupported(modelId: string): modelId is GroqModelId {
  return modelId in GROQ_MODELS;
}

/**
 * Obtient les informations d'un modèle Groq
 */
export function getGroqModelInfo(modelId: string): GroqModelInfo | null {
  if (isGroqModelSupported(modelId)) {
    return GROQ_MODELS[modelId];
  }
  return null;
}

/**
 * Vérifie si un modèle supporte une capacité spécifique
 */
export function modelSupportsCapability(modelId: string, capability: keyof GroqModelCapabilities): boolean {
  const modelInfo = getGroqModelInfo(modelId);
  return modelInfo?.capabilities?.[capability] ?? false;
}

/**
 * Vérifie si un modèle supporte reasoning_effort
 */
export function modelSupportsReasoningEffort(modelId: string): boolean {
  return modelSupportsCapability(modelId, 'reasoningEffort');
}

/**
 * Vérifie si un modèle supporte parallel_tool_calls
 */
export function modelSupportsParallelToolCalls(modelId: string): boolean {
  return modelSupportsCapability(modelId, 'parallelToolCalls');
}

/**
 * Vérifie si un modèle supporte service_tier
 */
export function modelSupportsServiceTier(modelId: string): boolean {
  return modelSupportsCapability(modelId, 'serviceTier');
}

/**
 * Vérifie si un modèle supporte les images
 */
export function modelSupportsImages(modelId: string): boolean {
  return modelSupportsCapability(modelId, 'imageSupport');
}

/**
 * Vérifie si un modèle supporte le contenu multimodal
 */
export function modelSupportsMultimodalContent(modelId: string): boolean {
  return modelSupportsCapability(modelId, 'multimodalContent');
}

/**
 * Liste des modèles préférentiels (nos modèles référence)
 */
export const PREFERRED_GROQ_MODELS: GroqModelId[] = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct'
];

/**
 * Liste de tous les modèles supportés
 */
export const ALL_GROQ_MODELS: GroqModelId[] = Object.keys(GROQ_MODELS) as GroqModelId[];

/**
 * Modèles par catégorie
 */
export const GROQ_MODELS_BY_CATEGORY = {
  preferred: PREFERRED_GROQ_MODELS,
  reasoning: ['deepseek-r1-distill-llama-70b'] as GroqModelId[],
  alternative: ['kimi-k2-0905', 'qwen/qwen-3-32b-instruct', 'meta-llama/llama-3.3-70b-versatile'] as GroqModelId[],
  safety: ['meta-llama/llama-guard-4-12b'] as GroqModelId[]
} as const;
