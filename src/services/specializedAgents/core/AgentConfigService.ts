/**
 * Service de gestion de la configuration et du cache des agents
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service de gestion de la configuration et du cache des agents
 */
export class AgentConfigService {
  private agentCache: Map<string, SpecializedAgentConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupérer un agent par ID ou slug (avec cache)
   */
  async getAgentByIdOrSlug(agentId: string): Promise<SpecializedAgentConfig | null> {
    logger.dev(`[AgentConfigService] 🔍 Recherche agent: ${agentId}`);
    
    // Vérifier le cache avec validation
    if (this.agentCache.has(agentId)) {
      const cachedAgent = this.agentCache.get(agentId)!;
      const cacheTime = this.cacheExpiry.get(agentId) || 0;
      
      if (Date.now() - cacheTime < this.CACHE_TTL && cachedAgent) {
        // Validation de l'agent en cache
        if (cachedAgent.id || cachedAgent.slug) {
          logger.dev(`[AgentConfigService] 📦 Agent ${agentId} récupéré du cache`);
          return cachedAgent;
        } else {
          // Agent en cache invalide, le supprimer
          logger.warn(`[AgentConfigService] ⚠️ Agent en cache invalide, suppression`, { agentId });
          this.agentCache.delete(agentId);
          this.cacheExpiry.delete(agentId);
        }
      } else if (Date.now() - cacheTime >= this.CACHE_TTL) {
        // Cache expiré, le nettoyer
        this.agentCache.delete(agentId);
        this.cacheExpiry.delete(agentId);
      }
    }

    try {
      // Construire la requête conditionnelle selon le type d'ID
      let query = supabase
        .from('agents')
        .select('*')
        .eq('is_active', true);

      // Si c'est un UUID, chercher par ID, sinon par slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
      
      logger.dev(`[AgentConfigService] 🔍 Type d'ID: ${isUUID ? 'UUID' : 'slug'}`);
      
      if (isUUID) {
        query = query.eq('id', agentId);
        logger.dev(`[AgentConfigService] 🔍 Recherche par ID: ${agentId}`);
      } else {
        query = query.eq('slug', agentId);
        logger.dev(`[AgentConfigService] 🔍 Recherche par slug: ${agentId}`);
      }

      const { data: agent, error } = await query.single();

      if (error) {
        logger.warn(`[AgentConfigService] ❌ Erreur requête agent ${agentId}:`, { error: error.message, code: error.code });
        return null;
      }

      if (!agent) {
        logger.warn(`[AgentConfigService] ❌ Agent non trouvé: ${agentId}`);
        return null;
      }

      // Validation et conversion des types numériques
      const processedAgent = {
        ...agent,
        temperature: typeof agent.temperature === 'string' ? parseFloat(agent.temperature) : agent.temperature,
        top_p: typeof agent.top_p === 'string' ? parseFloat(agent.top_p) : agent.top_p,
        max_tokens: typeof agent.max_tokens === 'string' ? parseInt(agent.max_tokens) : agent.max_tokens,
        max_completion_tokens: typeof agent.max_completion_tokens === 'string' ? parseInt(agent.max_completion_tokens) : agent.max_completion_tokens,
        priority: typeof agent.priority === 'string' ? parseInt(agent.priority) : agent.priority
      };

      // Validation des paramètres de l'agent
      if (processedAgent.temperature < 0 || processedAgent.temperature > 2) {
        logger.warn(`[AgentConfigService] ⚠️ Temperature invalide, utilisation de la valeur par défaut`, {
          agentId,
          temperature: processedAgent.temperature
        });
        processedAgent.temperature = 0.7;
      }

      if (processedAgent.max_tokens < 1 || processedAgent.max_tokens > 128000) {
        logger.warn(`[AgentConfigService] ⚠️ Max tokens invalide, utilisation de la valeur par défaut`, {
          agentId,
          max_tokens: processedAgent.max_tokens
        });
        processedAgent.max_tokens = 4000;
      }

      if (processedAgent.top_p < 0 || processedAgent.top_p > 1) {
        logger.warn(`[AgentConfigService] ⚠️ Top_p invalide, utilisation de la valeur par défaut`, {
          agentId,
          top_p: processedAgent.top_p
        });
        processedAgent.top_p = 1;
      }

      // Mettre en cache
      this.agentCache.set(agentId, processedAgent as SpecializedAgentConfig);
      this.cacheExpiry.set(agentId, Date.now());

      logger.dev(`[AgentConfigService] ✅ Agent ${agentId} trouvé: ${processedAgent.display_name || processedAgent.name}`);
      return processedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[AgentConfigService] ❌ Erreur récupération agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Invalider le cache d'un agent spécifique
   */
  invalidateAgentCache(agentId: string): void {
    this.agentCache.delete(agentId);
    this.cacheExpiry.delete(agentId);
    logger.dev(`[AgentConfigService] 🗑️ Cache invalidé pour agent: ${agentId}`);
  }

  /**
   * Vider tout le cache des agents
   */
  clearCache(): void {
    this.agentCache.clear();
    this.cacheExpiry.clear();
    logger.dev(`[AgentConfigService] 🗑️ Tout le cache vidé`);
  }
}

