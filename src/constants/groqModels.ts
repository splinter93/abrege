/**
 * Modèles Groq disponibles avec leurs caractéristiques
 * Source officielle: https://groq.com/pricing (mise à jour Oct 2025)
 */

export interface GroqModelInfo {
  id: string;
  name: string;
  category: 'gpt-oss' | 'llama' | 'qwen' | 'whisper' | 'tts' | 'other';
  capabilities: string[];
  contextWindow: number;
  maxOutput: number;
  speed: number; // TPS (Tokens Per Second)
  pricing: {
    input: string; // Prix par million de tokens
    output: string;
  };
  description: string;
  recommended?: boolean;
}

export const GROQ_MODELS: GroqModelInfo[] = [
  // GPT-OSS Models - Recommandés pour la production
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B 128k',
    category: 'gpt-oss',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'prompt_caching'],
    contextWindow: 131072,
    maxOutput: 8000,
    speed: 1000,
    pricing: { input: '$0.10', output: '$0.50' },
    description: 'Le plus rapide (1000 TPS), économique, idéal pour la production',
    recommended: true
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B 128k',
    category: 'gpt-oss',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'prompt_caching'],
    contextWindow: 131072,
    maxOutput: 8000,
    speed: 500,
    pricing: { input: '$0.15', output: '$0.75' },
    description: 'Le plus puissant, excellent pour les tâches complexes',
    recommended: true
  },
  
  // Llama 4 Models (Multimodal)
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout (17Bx16E) 128k',
    category: 'llama',
    capabilities: ['text', 'images', 'function_calling', 'tool_use', 'json_mode'],
    contextWindow: 131072,
    maxOutput: 8192,
    speed: 594,
    pricing: { input: '$0.11', output: '$0.34' },
    description: 'Multimodal avec 16 experts, raisonnement et analyse d\'images',
    recommended: true
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick (17Bx128E) 128k',
    category: 'llama',
    capabilities: ['text', 'images', 'function_calling', 'tool_use', 'json_mode'],
    contextWindow: 131072,
    maxOutput: 8192,
    speed: 562,
    pricing: { input: '$0.20', output: '$0.60' },
    description: 'Multimodal avec 128 experts, images complexes et contexte long'
  },
  
  // Qwen3
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen3 32B 131k',
    category: 'qwen',
    capabilities: ['text', 'function_calling', 'streaming'],
    contextWindow: 131072,
    maxOutput: 8192,
    speed: 662,
    pricing: { input: '$0.29', output: '$0.59' },
    description: 'Très rapide (662 TPS), excellent rapport qualité/prix'
  },
  
  // Kimi K2
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2-0905 1T 256k',
    category: 'other',
    capabilities: ['text', 'structured_output', 'prompt_caching'],
    contextWindow: 262144,
    maxOutput: 8000,
    speed: 200,
    pricing: { input: '$1.00', output: '$3.00' },
    description: 'Contexte ultra-long (256k), structured outputs, prompt caching'
  },
];

/**
 * Tous les modèles sont des LLM (pas de Whisper ni TTS dans cette liste)
 */
export const LLM_MODELS = GROQ_MODELS;

/**
 * Grouper les modèles par catégorie pour le menu déroulant
 */
export const GROQ_MODELS_BY_CATEGORY = {
  'GPT-OSS (Recommandé)': GROQ_MODELS.filter(m => m.category === 'gpt-oss'),
  'Llama 4 (Multimodal)': GROQ_MODELS.filter(m => m.category === 'llama'),
  'Qwen3': GROQ_MODELS.filter(m => m.category === 'qwen'),
  'Kimi K2': GROQ_MODELS.filter(m => m.category === 'other'),
};

/**
 * Obtenir les informations d'un modèle
 */
export function getModelInfo(modelId: string): GroqModelInfo | undefined {
  return GROQ_MODELS.find(m => m.id === modelId);
}

/**
 * Obtenir les modèles recommandés
 */
export function getRecommendedModels(): GroqModelInfo[] {
  return GROQ_MODELS.filter(m => m.recommended);
}
