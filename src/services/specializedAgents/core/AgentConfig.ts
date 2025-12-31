/**
 * Gestion de la configuration et du cache des agents
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class AgentConfig {
  private agentCache: Map<string, SpecializedAgentConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupérer un agent par ID ou slug (avec cache)
   */
  async getAgentByIdOrSlug(agentId: string): Promise<SpecializedAgentConfig | null> {
    // Vérifier le cache
    const cached = this.agentCache.get(agentId);
    const expiry = this.cacheExpiry.get(agentId);
    
    if (cached && expiry && Date.now() < expiry) {
      logger.dev(`[AgentConfig] ✅ Agent ${agentId} récupéré du cache`);
      return cached;
    }

    // Récupérer depuis la DB
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidPattern.test(agentId);

    let query = supabase
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (isUUID) {
      query = query.eq('id', agentId);
    } else {
      query = query.eq('slug', agentId);
    }

    const { data: agents, error } = await query.limit(1);

    if (error) {
      logger.error(`[AgentConfig] ❌ Erreur récupération agent:`, error);
      return null;
    }

    if (!agents || agents.length === 0) {
      logger.warn(`[AgentConfig] ⚠️ Agent ${agentId} non trouvé`);
      return null;
    }

    const agent = agents[0] as SpecializedAgentConfig;

    // Normaliser les types numériques
    const normalizedAgent: SpecializedAgentConfig = {
      ...agent,
      temperature: typeof agent.temperature === 'string' ? parseFloat(agent.temperature) : agent.temperature,
      top_p: typeof agent.top_p === 'string' ? parseFloat(agent.top_p) : agent.top_p,
      max_tokens: typeof agent.max_tokens === 'string' ? parseInt(agent.max_tokens) : agent.max_tokens,
      priority: typeof agent.priority === 'string' ? parseInt(agent.priority) : agent.priority
    };

    // Mettre en cache
    this.agentCache.set(agentId, normalizedAgent);
    this.cacheExpiry.set(agentId, Date.now() + this.CACHE_TTL);
    
    // Mettre aussi en cache par ID et slug si différents
    if (normalizedAgent.id && normalizedAgent.id !== agentId) {
      this.agentCache.set(normalizedAgent.id, normalizedAgent);
      this.cacheExpiry.set(normalizedAgent.id, Date.now() + this.CACHE_TTL);
    }
    if (normalizedAgent.slug && normalizedAgent.slug !== agentId) {
      this.agentCache.set(normalizedAgent.slug, normalizedAgent);
      this.cacheExpiry.set(normalizedAgent.slug, Date.now() + this.CACHE_TTL);
    }

    logger.dev(`[AgentConfig] ✅ Agent ${agentId} récupéré de la DB`);
    return normalizedAgent;
  }

  /**
   * Invalider le cache pour un agent
   */
  invalidateCache(agentId: string): void {
    this.agentCache.delete(agentId);
    this.cacheExpiry.delete(agentId);
  }

  /**
   * Vider tout le cache
   */
  clearCache(): void {
    this.agentCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Générer un slug unique pour un agent
   */
  async generateAgentSlug(displayName: string, excludeId?: string): Promise<string> {
    const baseSlug = this.slugify(displayName);
    let slug = baseSlug;
    let counter = 1;

    while (!(await this.checkSlugUniqueness(slug, excludeId))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Vérifier l'unicité d'un slug
   */
  private async checkSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('agents')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      logger.error(`[AgentConfig] ❌ Erreur vérification slug:`, error);
      return false;
    }

    return !data || data.length === 0;
  }

  /**
   * Convertir un texte en slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}

