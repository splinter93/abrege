/**
 * Service de gestion des agents spécialisés - Wrapper de compatibilité
 * Délègue aux modules refactorés pour maintenir la compatibilité avec le code existant
 */

import type {
  SpecializedAgentConfig,
  SpecializedAgentRequest,
  SpecializedAgentResponse,
  CreateSpecializedAgentRequest,
  CreateSpecializedAgentResponse
} from '@/types/specializedAgents';
import { AgentManager } from './core/AgentManager';
import { AgentCRUDService } from './core/AgentCRUDService';
import { AgentConfigService } from './core/AgentConfigService';

/**
 * Wrapper de compatibilité pour SpecializedAgentManager
 * Délègue toutes les opérations aux modules refactorés
 */
export class SpecializedAgentManager {
  private agentManager: AgentManager;
  private crudService: AgentCRUDService;
  private configService: AgentConfigService;

  constructor() {
    this.configService = new AgentConfigService();
    this.agentManager = new AgentManager();
    this.crudService = new AgentCRUDService(this.configService);
  }

  /**
   * Exécuter un agent spécialisé via l'infrastructure existante
   * Supporte les requêtes multimodales (texte + images)
   */
  async executeSpecializedAgent(
    agentId: string, 
    input: Record<string, unknown>, 
    userToken: string,
    sessionId?: string
  ): Promise<SpecializedAgentResponse> {
    return await this.agentManager.executeSpecializedAgent(agentId, input, userToken, sessionId);
  }

  /**
   * Créer un nouvel agent spécialisé
   */
  async createSpecializedAgent(config: CreateSpecializedAgentRequest): Promise<CreateSpecializedAgentResponse> {
    return await this.crudService.createSpecializedAgent(config);
  }

  /**
   * Supprimer un agent spécialisé
   */
  async deleteAgent(agentId: string, traceId: string): Promise<boolean> {
    return await this.crudService.deleteAgent(agentId, traceId);
  }

  /**
   * Obtenir les informations d'un agent (pour GET)
   */
  async getAgentInfo(agentId: string): Promise<SpecializedAgentConfig | null> {
    return await this.crudService.getAgentInfo(agentId);
  }

  /**
   * Récupérer un agent par référence (ID ou slug) - alias public
   */
  public async getAgentByRef(ref: string, userId: string): Promise<SpecializedAgentConfig | null> {
    return await this.crudService.getAgentByRef(ref, userId);
  }

  /**
   * Lister tous les agents spécialisés
   */
  async listSpecializedAgents(): Promise<SpecializedAgentConfig[]> {
    return await this.crudService.listSpecializedAgents();
  }

  /**
   * Lister tous les agents spécialisés disponibles (tous types)
   */
  async listAgents(userId: string): Promise<SpecializedAgentConfig[]> {
    return await this.crudService.listAgents(userId);
  }

  /**
   * Mettre à jour complètement un agent spécialisé
   */
  async updateAgent(
    agentId: string, 
    updateData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    return await this.crudService.updateAgent(agentId, updateData, traceId);
  }

  /**
   * Mettre à jour partiellement un agent spécialisé
   */
  async patchAgent(
    agentId: string, 
    patchData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    return await this.crudService.patchAgent(agentId, patchData, traceId);
  }

  /**
   * Invalider le cache d'un agent spécifique
   */
  public invalidateAgentCache(agentId: string): void {
    this.configService.invalidateAgentCache(agentId);
  }

  /**
   * Vider tout le cache des agents
   */
  public clearAllCache(): void {
    this.configService.clearCache();
  }

  /**
   * Alias pour clearAllCache (compatibilité)
   */
  clearCache(): void {
    this.configService.clearCache();
  }
}
