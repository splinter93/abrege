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
    description: 'Excellent modèle généraliste, fiable et pas cher'
  },
  'openai/gpt-oss-120b': {
    name: 'OpenAI GPT-OSS 120B',
    inputPrice: 0.15,
    outputPrice: 0.75,
    category: 'preferred',
    description: 'Modèle généraliste plus puissant'
  },
  'llama-4-scout': {
    name: 'Llama 4 Scout',
    inputPrice: 0.11,
    outputPrice: 0.34,
    category: 'preferred',
    description: 'Puissant pour la recherche de texte et vision'
  },
  'llama-4-maverick': {
    name: 'Llama 4 Maverick',
    inputPrice: 0.20,
    outputPrice: 0.60,
    category: 'preferred',
    description: 'Puissant pour la recherche de texte et vision (Premium)'
  },

  // Modèles de réflexion avancée
  'kimi-k2-0905': {
    name: 'Kimi K2-0905',
    inputPrice: 1.00,
    outputPrice: 3.00,
    category: 'reasoning',
    description: 'Intéressant pour les tâches de réflexion plus poussée'
  },
  'deepseek-r1-distill-llama-70b': {
    name: 'DeepSeek R1 Distill Llama 70B',
    inputPrice: 0.75,
    outputPrice: 0.99,
    category: 'reasoning',
    description: 'Intéressant pour les tâches de réflexion plus poussée'
  },

  // Modèles alternatifs
  'qwen3-32b': {
    name: 'Qwen3-32B',
    inputPrice: 0.29,
    outputPrice: 0.59,
    category: 'alternative',
    description: 'Bon compromis selon le contexte'
  },
  'mistral-saba-24b': {
    name: 'Mistral Saba 24B',
    inputPrice: 0.79,
    outputPrice: 0.79,
    category: 'alternative',
    description: 'Modèle Mistral spécialisé'
  },
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B Versatile',
    inputPrice: 0.59,
    outputPrice: 0.79,
    category: 'alternative',
    description: 'Modèle Llama polyvalent'
  },

  // Modèles de sécurité
  'llama-guard-4-12b': {
    name: 'Llama Guard 4 12B',
    inputPrice: 0.20,
    outputPrice: 0.20,
    category: 'safety',
    description: 'Modèle de sécurité et modération'
  }
} as const;

/**
 * Types TypeScript pour les modèles Groq
 */
export type GroqModelId = keyof typeof GROQ_MODELS;
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
 * Liste des modèles préférentiels (nos modèles référence)
 */
export const PREFERRED_GROQ_MODELS: GroqModelId[] = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-4-scout',
  'llama-4-maverick'
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
  reasoning: ['kimi-k2-0905', 'deepseek-r1-distill-llama-70b'] as GroqModelId[],
  alternative: ['qwen3-32b', 'mistral-saba-24b', 'llama-3.3-70b-versatile'] as GroqModelId[],
  safety: ['llama-guard-4-12b'] as GroqModelId[]
} as const;
