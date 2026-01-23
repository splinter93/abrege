/**
 * Helpers pour la route streaming LLM
 * Extrait de /api/chat/llm/stream/route.ts pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import type { AgentConfig } from '@/services/llm/types/agentTypes';

const DEFAULT_AGENT_SCOPES = [
  'notes:read', 'notes:write', 'notes:create', 'notes:update', 'notes:delete',
  'classeurs:read', 'classeurs:write', 'classeurs:create', 'classeurs:update', 'classeurs:delete',
  'dossiers:read', 'dossiers:write', 'dossiers:create', 'dossiers:update', 'dossiers:delete',
  'files:read', 'files:write', 'files:upload', 'files:delete',
  'agents:execute', 'agents:read',
  'search:content', 'profile:read'
];

/**
 * Valide le JWT et extrait le userId
 */
export async function validateAndExtractUserId(
  userToken: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  try {
    // ✅ JWT OBLIGATOIRE : on rejette tout token non signé
    if (!userToken.includes('.')) {
      logger.error('[Stream Helpers] ❌ Token non signé reçu (UUID nu rejeté)');
      return { success: false, error: 'Token JWT requis' };
    }

    const { data: { user }, error } = await supabase.auth.getUser(userToken);

    if (error || !user) {
      logger.error('[Stream Helpers] ❌ JWT invalide ou expiré:', error);
      return { success: false, error: 'JWT invalide ou expiré' };
    }

    return { success: true, userId: user.id };
  } catch (verifyError) {
    logger.error('[Stream Helpers] ❌ Erreur validation token:', verifyError);
    return { success: false, error: 'Token invalide' };
  }
}

/**
 * Résout l'agent à partir du contexte (agentId ou provider)
 */
export async function resolveAgent(
  agentId: string | undefined,
  providerName: string | undefined,
  providedAgentConfig: unknown,
  supabase: ReturnType<typeof createClient>
): Promise<AgentConfig | null> {
  let finalAgentConfig = providedAgentConfig as AgentConfig | null;
  
  try {
    // 1) Priorité à l'agent explicitement sélectionné
    if (agentId) {
      logger.dev(`[Stream Helpers] 🔍 Récupération de l'agent par ID: ${agentId}`);
      const { data: agentById, error: agentByIdError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('is_active', true)
        .single();

      const agentByIdRecord = agentById as AgentConfig | null;
      if (!agentByIdError && agentByIdRecord) {
        finalAgentConfig = agentByIdRecord;
        logger.dev(`[Stream Helpers] ✅ Agent trouvé: ${agentByIdRecord.name ?? 'unknown'}`);
      }
    }

    // 2) Sinon fallback par provider
    if (!finalAgentConfig && providerName) {
      logger.dev(`[Stream Helpers] 🔍 Récupération de l'agent pour le provider: ${providerName}`);
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('provider', providerName)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      const agentRecord = agent as AgentConfig | null;
      if (!error && agentRecord) {
        finalAgentConfig = agentRecord;
        logger.dev(`[Stream Helpers] ✅ Agent trouvé par provider: ${agentRecord.name ?? 'unknown'}`);
      }
    }

    // 3) Fallback final : premier agent actif
    if (!finalAgentConfig) {
      logger.dev(`[Stream Helpers] 🔍 Récupération du premier agent actif`);
      const { data: defaultAgent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      const defaultAgentRecord = defaultAgent as AgentConfig | null;
      if (!error && defaultAgentRecord) {
        finalAgentConfig = defaultAgentRecord;
        logger.dev(`[Stream Helpers] ✅ Agent par défaut: ${defaultAgentRecord.name ?? 'unknown'}`);
      }
    }
    
    return finalAgentConfig;
  } catch (error) {
    logger.error(`[Stream Helpers] ❌ Erreur récupération agent:`, error);
    return null;
  }
}

/**
 * Valide et normalise le modèle LLM
 */
export function validateAndNormalizeModel(
  providerType: string,
  model: string
): string {
  // Liminality gère tous types de modèles via son orchestrateur
  if (providerType === 'liminality') {
    return model;
  }
  
  // Cerebras gère ses propres modèles
  if (providerType === 'cerebras') {
    const isCerebrasModel = model.includes('zai-glm') || model.includes('gpt-oss') || model.includes('llama-3.3') || model.includes('llama-3.1') || model.startsWith('cerebras/');
    if (!isCerebrasModel) {
      logger.warn(`[Stream Helpers] ⚠️ Modèle non Cerebras (${model}), utilisation du modèle par défaut`);
      return 'zai-glm-4.7'; // ✅ Modèle par défaut mis à jour
    }
    return model;
  }
  
  const isXaiModel = model.includes('grok') && !model.includes('/');
  const isGroqModel = model.startsWith('openai/gpt-oss-') || model.includes('llama') || model.includes('moonshotai/');
  
  // Détecter incohérence provider/modèle
  if (providerType === 'xai' && isGroqModel) {
    logger.warn(`[Stream Helpers] ⚠️ INCOHÉRENCE: Provider xAI avec modèle Groq (${model}), correction automatique`);
    return 'grok-4-1-fast-reasoning'; // Fallback vers un modèle xAI
  } else if (providerType === 'groq' && isXaiModel) {
    logger.warn(`[Stream Helpers] ⚠️ INCOHÉRENCE: Provider Groq avec modèle xAI (${model}), correction automatique`);
    return 'openai/gpt-oss-20b'; // Fallback vers un modèle Groq
  }
  
  return model;
}

/**
 * Valide et normalise les paramètres LLM
 */
export function normalizeLLMParams(agentConfig: AgentConfig | null): {
  temperature: number;
  topP: number;
  maxTokens: number;
} {
  const temperature = typeof agentConfig?.temperature === 'number'
    ? Math.max(0, Math.min(2, agentConfig.temperature))
    : 0.7;
  
  const topP = typeof agentConfig?.top_p === 'number'
    ? Math.max(0, Math.min(1, agentConfig.top_p))
    : 0.9;
  
  const maxTokens = typeof agentConfig?.max_tokens === 'number'
    ? Math.max(1, Math.min(100000, agentConfig.max_tokens))
    : 8000;
    
  return { temperature, topP, maxTokens };
}

/**
 * Extrait le texte d'un MessageContent (string ou array multi-modal)
 */
export function extractTextFromContent(
  content: string | null | Array<{ type: string; text?: string }>
): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  
  // Si array, trouver la partie texte
  const textPart = content.find((part): part is { type: 'text'; text: string } => 
    typeof part === 'object' && part.type === 'text'
  );
  return textPart?.text || '[Multi-modal content]';
}


