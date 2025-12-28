/**
 * Registre centralisé de TOUS les modèles LLM disponibles
 * 
 * Ce fichier contient les modèles de tous les providers :
 * - Groq (GPT-OSS, Llama, Qwen, etc.)
 * - xAI (Grok)
 * - Liminality (OpenRouter, Fireworks, DeepSeek, etc.)
 * 
 * Utilisé pour :
 * - Le sélecteur de modèles dans la configuration des agents
 * - La détection automatique du provider depuis le modèle
 * - L'affichage des informations (prix, capacités, contexte, etc.)
 * 
 * Note: Le nom du fichier "groqModels" est historique mais le contenu
 * couvre tous les providers. C'est un registre centralisé.
 */

export interface GroqModelInfo {
  id: string;
  name: string;
  category: 'gpt-oss' | 'llama' | 'qwen' | 'xai' | 'whisper' | 'tts' | 'liminality' | 'other';
  provider?: 'groq' | 'xai' | 'liminality'; // Provider du modèle
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
  
  // xAI Grok Models
  {
    id: 'grok-4-1-fast-non-reasoning',
    name: 'Grok 4.1 Fast (Instant)',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 2000000,
    maxOutput: 8000,
    speed: 800,
    pricing: { input: '$0.20', output: '$0.50' },
    description: 'Réponses instantanées avec la nouvelle génération Grok 4.1',
    recommended: true
  },
  {
    id: 'grok-4-1-fast-reasoning',
    name: 'Grok 4.1 Fast Reasoning',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output', 'reasoning', 'images'],
    contextWindow: 2000000,
    maxOutput: 8000,
    speed: 700,
    pricing: { input: '$0.20', output: '$0.50' },
    description: 'Reasoning avancé, 2M tokens et support images',
    recommended: true
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta 128k',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 131072,
    maxOutput: 8000,
    speed: 750,
    pricing: { input: '$0.20', output: '$0.50' },
    description: 'Version beta avec les dernières fonctionnalités'
  },
  {
    id: 'grok-vision-beta',
    name: 'Grok Vision Beta 128k',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'images', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 131072,
    maxOutput: 8000,
    speed: 650,
    pricing: { input: '$0.20', output: '$0.50' },
    description: 'Multimodal avec analyse avancée d\'images (beta)'
  },
  
  // Liminality Models (Synesia LLM Exec API)
  // DeepSeek Models - Recommandés pour reasoning et économie
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat V3.2',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 64000,
    maxOutput: 8000,
    speed: 800,
    pricing: { input: '$0.14', output: '$0.21' },
    description: 'DeepSeek V3.2 rapide et économique, excellent rapport qualité/prix',
    recommended: true
  },
  {
    id: 'deepseek/deepseek-reasoner',
    name: 'DeepSeek Reasoner V3.2',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output', 'reasoning'],
    contextWindow: 64000,
    maxOutput: 8000,
    speed: 700,
    pricing: { input: '$0.14', output: '$0.21' },
    description: 'DeepSeek V3.2 avec reasoning avancé, idéal pour tâches complexes',
    recommended: true
  },
  
  // OpenAI Models via Liminality
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 128000,
    maxOutput: 16384,
    speed: 900,
    pricing: { input: '$0.15', output: '$0.60' },
    description: 'Rapide et économique pour tâches ciblées',
    recommended: true
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'streaming', 'structured_output', 'reasoning', 'mcp'],
    contextWindow: 400000,
    maxOutput: 128000,
    speed: 600,
    pricing: { input: '$1.25', output: '$10.00' },
    description: 'Le meilleur pour coding et tâches agentiques avancées'
  },
  
  // Fireworks AI Models
  {
    id: 'fireworks/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'streaming', 'reasoning'],
    contextWindow: 256000,
    maxOutput: 4000,
    speed: 500,
    pricing: { input: '$1.00', output: '$3.00' },
    description: 'Contexte ultra-long (256k) avec reasoning avancé',
    recommended: true
  },
  {
    id: 'fireworks/z-ai-glm-4-7',
    name: 'GLM-4.7',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 128000,
    maxOutput: 8192,
    speed: 600,
    pricing: { input: 'Variable', output: 'Variable' },
    description: 'GLM-4.7 via Liminality avec support des outils avancés',
    recommended: false
  },
  
  // OpenRouter Models via Liminality
  {
    id: 'openrouter/mimo-v2-flash:free',
    name: 'MiMo-V2-Flash (free)',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 262144,
    maxOutput: 8192,
    speed: 700,
    pricing: { input: '$0.00', output: '$0.00' },
    description: 'Xiaomi MiMo-V2-Flash gratuit via OpenRouter, avec reasoning et outils',
    recommended: true
  },
  {
    id: 'openrouter/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 262144,
    maxOutput: 8192,
    speed: 500,
    pricing: { input: '$0.40', output: '$1.75' },
    description: 'MoonshotAI Kimi K2 Thinking via OpenRouter, contexte ultra-long (262K)',
    recommended: false
  },
  {
    id: 'openrouter/glm-4.7',
    name: 'GLM 4.7',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 202752,
    maxOutput: 8192,
    speed: 600,
    pricing: { input: '$0.40', output: '$1.50' },
    description: 'Z.AI GLM 4.7 via OpenRouter avec reasoning et outils avancés',
    recommended: false
  },
  {
    id: 'openrouter/gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 1000000,
    maxOutput: 8192,
    speed: 650,
    pricing: { input: '$0.50', output: '$3.00' },
    description: 'Google Gemini 3 Flash Preview via OpenRouter, multimodal avec contexte 1M',
    recommended: true
  },
  {
    id: 'openrouter/minimax-m2.1',
    name: 'MiniMax M2.1',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 204800,
    maxOutput: 8192,
    speed: 550,
    pricing: { input: '$0.30', output: '$1.20' },
    description: 'MiniMax M2.1 via OpenRouter avec reasoning et outils',
    recommended: false
  },
  {
    id: 'openrouter/qwen3-vl-30b-a3b-instruct',
    name: 'Qwen3 VL 30B A3B Instruct',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'streaming', 'structured_output'],
    contextWindow: 262144,
    maxOutput: 8192,
    speed: 500,
    pricing: { input: '$0.15', output: '$0.60' },
    description: 'Qwen3 VL 30B multimodal via OpenRouter, analyse d\'images et outils',
    recommended: false
  },
  
  // xAI Models via Liminality (pour orchestration avancée)
  {
    id: 'xai/grok-4-1-fast-reasoning',
    name: 'Grok 4.1 Fast Reasoning',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'streaming', 'structured_output', 'reasoning', 'mcp'],
    contextWindow: 2000000,
    maxOutput: 8000,
    speed: 700,
    pricing: { input: '$0.20', output: '$0.50' },
    description: 'Grok 4.1 via Liminality avec orchestration automatique des tools'
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
  'Liminality (Synesia) ⭐': GROQ_MODELS.filter(m => m.category === 'liminality'),
  'xAI Grok (Recommandé)': GROQ_MODELS.filter(m => m.category === 'xai'),
  'GPT-OSS': GROQ_MODELS.filter(m => m.category === 'gpt-oss'),
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

/**
 * Vérifier si un modèle est supporté
 */
export function isGroqModelSupported(modelId: string): boolean {
  return GROQ_MODELS.some(m => m.id === modelId);
}

/**
 * Obtenir les informations d'un modèle (alias pour compatibilité)
 */
export const getGroqModelInfo = getModelInfo;
