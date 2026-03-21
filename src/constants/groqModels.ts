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
  category: 'gpt-oss' | 'llama' | 'qwen' | 'xai' | 'whisper' | 'tts' | 'liminality' | 'deepseek' | 'other';
  provider?: 'groq' | 'xai' | 'liminality' | 'cerebras' | 'deepseek'; // Provider du modèle
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
    id: 'grok-4.20-0309-reasoning',
    name: 'Grok 4.20 0309 Reasoning',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output', 'reasoning', 'images'],
    contextWindow: 2000000,
    maxOutput: 8000,
    speed: 500,
    pricing: { input: '$2.00', output: '$6.00' },
    description: 'Grok 4.20 (build 0309), contexte 2M, 4M tpm, 607 rpm — reasoning et images'
  },
  {
    id: 'grok-4.20-0309-non-reasoning',
    name: 'Grok 4.20 0309 Fast',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output', 'images'],
    contextWindow: 2000000,
    maxOutput: 8000,
    speed: 500,
    pricing: { input: '$2.00', output: '$6.00' },
    description: 'Grok 4.20 (build 0309) sans reasoning, 2M contexte, 4M tpm, 607 rpm'
  },
  {
    id: 'grok-4.20-multi-agent-0309',
    name: 'Grok 4.20 Multi-Agent 0309',
    category: 'xai',
    provider: 'xai',
    capabilities: ['text', 'function_calling', 'streaming', 'structured_output', 'multi_agent'],
    contextWindow: 2000000,
    maxOutput: 8000,
    speed: 500,
    pricing: { input: '$2.00', output: '$6.00' },
    description: 'Multi-agent Grok 4.20 (0309), 2M contexte, 4M tpm, 607 rpm'
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat V3.2',
    category: 'deepseek',
    provider: 'deepseek',
    capabilities: ['text', 'function_calling', 'streaming'],
    contextWindow: 64000,
    maxOutput: 16000,
    speed: 800,
    pricing: { input: '$0.14', output: '$0.28' },
    description: 'DeepSeek V3.2 rapide et économique, excellent rapport qualité/prix',
    recommended: true
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner V3.2',
    category: 'deepseek',
    provider: 'deepseek',
    capabilities: ['text', 'function_calling', 'streaming', 'reasoning'],
    contextWindow: 64000,
    maxOutput: 16000,
    speed: 700,
    pricing: { input: '$0.14', output: '$0.28' },
    description: 'DeepSeek V3.2 avec thinking mode (reasoning avancé), idéal pour tâches complexes',
    recommended: true
  },
  {
    id: 'openrouter/mimo-v2-flash',
    name: 'Xiaomi MiMo-V2-Flash',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 262144,
    maxOutput: 8192,
    speed: 700,
    pricing: { input: '$0.10', output: '$0.30' },
    description: 'Xiaomi MiMo-V2-Flash via OpenRouter, avec reasoning et outils',
    recommended: true
  },
  {
    id: 'openrouter/mimo-v2-pro',
    name: 'Xiaomi MiMo-V2-Pro',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 1048576,
    maxOutput: 131072,
    speed: 500,
    pricing: { input: '$1.00', output: '$3.00' },
    description: 'Xiaomi MiMo-V2-Pro via OpenRouter, contexte 1M, reasoning et outils',
    recommended: false
  },
  {
    id: 'openrouter/kimi-k2.5',
    name: 'Kimi K2.5',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 262144,
    maxOutput: 8192,
    speed: 500,
    pricing: { input: '$0.40', output: '$1.75' },
    description: 'MoonshotAI Kimi K2.5 Thinking via OpenRouter, vision native (lit les images), contexte 262K',
    recommended: false
  },
  {
    id: 'fireworks/kimi-k2p5',
    name: 'Kimi K2.5(Fireworks)',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 262144,
    maxOutput: 8192,
    speed: 500,
    pricing: { input: '$0.40', output: '$1.75' },
    description: 'MoonshotAI Kimi K2.5 P via Fireworks, vision native (lit les images), contexte 262K',
    recommended: false
  },
  {
    id: 'fireworks/glm-5',
    name: 'GLM 5 Fireworks',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 128000,
    maxOutput: 8192,
    speed: 600,
    pricing: { input: '$0.40', output: '$1.50' },
    description: 'Z.AI GLM 5 via Fireworks avec reasoning et outils avancés',
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
    id: 'openrouter/minimax-m2.7',
    name: 'MiniMax M2.7',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 204800,
    maxOutput: 8192,
    speed: 550,
    pricing: { input: 'Variable', output: 'Variable' },
    description: 'MiniMax M2.7 via OpenRouter (Liminality)',
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
  {
    id: 'openrouter/qwen3.5-397b-a17b',
    name: 'Qwen3.5 397B A17B',
    category: 'liminality',
    provider: 'liminality',
    capabilities: ['text', 'images', 'function_calling', 'reasoning', 'streaming', 'structured_output'],
    contextWindow: 131072,
    maxOutput: 8192,
    speed: 400,
    pricing: { input: 'Variable', output: 'Variable' },
    description: 'Qwen3.5 397B A17B via OpenRouter, vision et analyse d\'images',
    recommended: false
  },
];

/**
 * Tous les modèles sont des LLM (pas de Whisper ni TTS dans cette liste)
 */
export const LLM_MODELS = GROQ_MODELS;

const GROQ_MODELS_BY_CATEGORY_ENTRIES: [string, GroqModelInfo[]][] = [
  ['DeepSeek', GROQ_MODELS.filter(m => m.category === 'deepseek')],
  ['Liminality (Synesia)', GROQ_MODELS.filter(m => m.category === 'liminality')],
  ['Cerebras', GROQ_MODELS.filter(m => m.provider === 'cerebras')],
  ['xAI Grok', GROQ_MODELS.filter(m => m.category === 'xai')],
  ['GPT-OSS', GROQ_MODELS.filter(m => m.category === 'gpt-oss')],
  ['Llama 4 (Multimodal)', GROQ_MODELS.filter(m => m.category === 'llama')],
  ['Qwen3', GROQ_MODELS.filter(m => m.category === 'qwen')],
  ['Kimi K2', GROQ_MODELS.filter(m => m.category === 'other' && m.provider !== 'cerebras')],
];

/**
 * Grouper les modèles par catégorie pour le menu déroulant (catégories vides omises)
 */
export const GROQ_MODELS_BY_CATEGORY = Object.fromEntries(
  GROQ_MODELS_BY_CATEGORY_ENTRIES.filter(([, models]) => models.length > 0)
) as Record<string, GroqModelInfo[]>;

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
