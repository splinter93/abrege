/**
 * SpecializedAgentManager - Wrapper pour compatibilité
 * Délègue aux modules refactorés
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Wrapper léger qui délègue aux modules < 300 lignes
 * - Compatibilité 100% avec l'API existante
 */

// Re-exporter les types
export type {
  SpecializedAgentConfig,
  SpecializedAgentRequest,
  SpecializedAgentResponse,
  CreateSpecializedAgentRequest,
  CreateSpecializedAgentResponse,
  ValidationResult,
  SpecializedAgentError,
  AgentExecutionMetrics,
  OpenAPISchema,
  OpenAPIProperty
} from '@/types/specializedAgents';

// Importer les modules refactorés
import { AgentConfig } from './core/AgentConfig';
import { AgentManager } from './core/AgentManager';
import { AgentCRUD } from './core/AgentCRUD';
import { SystemMessageBuilder } from './core/SystemMessageBuilder';
import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig, CreateSpecializedAgentRequest, CreateSpecializedAgentResponse } from '@/types/specializedAgents';

/**
 * Classe wrapper pour compatibilité avec code existant
 * Toutes les méthodes délèguent aux modules refactorés
 */
export class SpecializedAgentManager {
  private agentConfig: AgentConfig;
  private agentManager: AgentManager;
  private agentCRUD: AgentCRUD;

  constructor() {
    this.agentConfig = new AgentConfig();
    this.agentManager = new AgentManager(this.agentConfig);
    this.agentCRUD = new AgentCRUD(this.agentConfig);
  }

  /**
   * Exécuter un agent spécialisé
   */
  async executeSpecializedAgent(
    agentId: string, 
    input: Record<string, unknown>, 
    userToken: string,
    sessionId?: string
  ) {
    return this.agentManager.executeSpecializedAgent(agentId, input, userToken, sessionId);
  }

  /**
   * Créer un nouvel agent spécialisé
   */
  async createSpecializedAgent(config: CreateSpecializedAgentRequest): Promise<CreateSpecializedAgentResponse> {
    return this.agentCRUD.createAgent(config);
  }

  /**
   * Obtenir les informations d'un agent
   */
  async getAgentInfo(agentId: string): Promise<SpecializedAgentConfig | null> {
    return this.agentConfig.getAgentByIdOrSlug(agentId);
  }

  /**
   * Récupérer un agent par référence (ID ou slug)
   */
  public async getAgentByRef(ref: string, userId: string): Promise<SpecializedAgentConfig | null> {
    return this.agentConfig.getAgentByIdOrSlug(ref);
  }

  /**
   * Lister tous les agents spécialisés
   */
  async listSpecializedAgents(): Promise<SpecializedAgentConfig[]> {
    return this.agentCRUD.listAgents('system');
  }

  /**
   * Lister tous les agents (alias)
   */
  async listAgents(userId: string): Promise<SpecializedAgentConfig[]> {
    return this.agentCRUD.listAgents(userId);
  }

  /**
   * Vider tout le cache
   */
  clearCache(): void {
    this.agentConfig.clearCache();
    logger.dev(`[SpecializedAgentManager] 🗑️ Cache vidé`);
  }

  /**
   * Invalider le cache pour un agent
   */
  public invalidateAgentCache(agentId: string): void {
    this.agentConfig.invalidateCache(agentId);
  }

  /**
   * Vider tout le cache (alias)
   */
  public clearAllCache(): void {
    this.clearCache();
  }

  /**
   * Supprimer un agent
   */
  async deleteAgent(agentId: string, traceId: string): Promise<boolean> {
    return this.agentCRUD.deleteAgent(agentId, traceId);
  }

  /**
   * Mettre à jour un agent
   */
  async updateAgent(agentId: string, data: Record<string, unknown>, traceId: string): Promise<SpecializedAgentConfig | null> {
    return this.agentCRUD.updateAgent(agentId, data, traceId);
  }

  /**
   * Mettre à jour partiellement un agent
   */
  async patchAgent(agentId: string, data: Record<string, unknown>, traceId: string): Promise<SpecializedAgentConfig | null> {
    return this.agentCRUD.patchAgent(agentId, data, traceId);
  }
}

