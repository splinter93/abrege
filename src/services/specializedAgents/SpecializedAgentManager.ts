/**
 * Service de gestion des agents spécialisés
 * Orchestration et exécution des agents via l'infrastructure existante
 */

import { createClient } from '@supabase/supabase-js';
import { GroqOrchestrator } from '@/services/llm/services/GroqOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';
import { SchemaValidator } from './schemaValidator';
import { MultimodalHandler } from './multimodalHandler';
import {
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

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class SpecializedAgentManager {
  private orchestrator: GroqOrchestrator;
  private agentCache: Map<string, SpecializedAgentConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.orchestrator = new GroqOrchestrator();
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
    const startTime = Date.now();
    const traceId = `agent-${agentId}-${Date.now()}`;

    try {
      logger.info(`[SpecializedAgentManager] 🚀 Exécution agent ${agentId}`, { traceId, agentId });

      // 1. Récupérer l'agent (avec cache)
      const agent = await this.getAgentByIdOrSlug(agentId);
      if (!agent) {
        logger.warn(`[SpecializedAgentManager] ❌ Agent non trouvé: ${agentId}`, { traceId });
        return {
          success: false,
          error: `Agent ${agentId} not found`,
          metadata: {
            agentId,
            executionTime: Date.now() - startTime,
            model: 'unknown'
          }
        };
      }

      // 2. Validation du schéma d'entrée
      if (agent.input_schema) {
        const validation = SchemaValidator.validateInput(input, agent.input_schema);
        if (!validation.valid) {
          logger.warn(`[SpecializedAgentManager] ❌ Validation échouée pour ${agentId}`, { 
            traceId, 
            errors: validation.errors 
          });
          return {
            success: false,
            error: `Validation failed: ${validation.errors.join(', ')}`,
            metadata: {
              agentId,
              executionTime: Date.now() - startTime,
              model: agent.model
            }
          };
        }
      }

      // 3. Préparation du contenu multimodale si le modèle le supporte
      let processedInput = input;
      if (MultimodalHandler.isMultimodalModel(agent.model)) {
        const multimodalPrep = MultimodalHandler.prepareGroqContent(input, agent.model);
        
        if (multimodalPrep.error) {
          logger.warn(`[SpecializedAgentManager] ❌ Erreur préparation multimodale pour ${agentId}`, { 
            traceId, 
            error: multimodalPrep.error 
          });
          return {
            success: false,
            error: `Erreur multimodale: ${multimodalPrep.error}`,
            metadata: {
              agentId,
              executionTime: Date.now() - startTime,
              model: agent.model
            }
          };
        }

        // Log de la requête multimodale
        MultimodalHandler.logMultimodalRequest(
          agent.model,
          multimodalPrep.text,
          multimodalPrep.imageUrl,
          traceId
        );

        // Préparer le payload Groq multimodale
        const groqPayload = MultimodalHandler.createGroqPayload(
          agent.model,
          multimodalPrep.text,
          multimodalPrep.imageUrl,
          {
            temperature: agent.temperature,
            max_completion_tokens: agent.max_tokens,
            stream: false
          }
        );
        processedInput = groqPayload as unknown as Record<string, unknown>;
      }

      // 4. Préparer le contexte spécialisé
      const systemMessage = this.buildSpecializedSystemMessage(agent, input);
      const userMessage = `Exécution de tâche spécialisée: ${JSON.stringify(input)}`;

      // 4. Utiliser l'orchestrateur existant
      const result = await this.orchestrator.executeRound({
        message: userMessage,
        sessionHistory: [],
        agentConfig: agent,
        userToken,
        sessionId: sessionId || `specialized-${agentId}-${Date.now()}`,
        appContext: {
          type: 'chat_session',
          id: agentId,
          name: agent.display_name || agent.name
        } // Contexte d'application pour les agents spécialisés
      });

      // 5. Formater selon le schéma de sortie
      const formattedResult = this.formatSpecializedOutput(result, agent.output_schema);

      const executionTime = Date.now() - startTime;
      logger.info(`[SpecializedAgentManager] ✅ Agent ${agentId} exécuté avec succès`, { 
        traceId, 
        executionTime 
      });

      // 6. Mettre à jour les métriques
      await this.updateAgentMetrics(agentId, true, executionTime);

      return {
        success: true,
        result: formattedResult,
        metadata: {
          agentId,
          executionTime,
          model: agent.model
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[SpecializedAgentManager] ❌ Erreur exécution ${agentId}:`, { 
        traceId, 
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      // Mettre à jour les métriques d'erreur
      await this.updateAgentMetrics(agentId, false, executionTime);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        metadata: {
          agentId,
          executionTime,
          model: 'unknown'
        }
      };
    }
  }

  /**
   * Récupérer un agent par ID ou slug (avec cache)
   */
  private async getAgentByIdOrSlug(agentId: string): Promise<SpecializedAgentConfig | null> {
    logger.dev(`[SpecializedAgentManager] 🔍 Recherche agent: ${agentId}`);
    
    // Vérifier le cache
    if (this.agentCache.has(agentId)) {
      const cachedAgent = this.agentCache.get(agentId)!;
      const cacheTime = this.cacheExpiry.get(agentId) || 0;
      
      if (Date.now() - cacheTime < this.CACHE_TTL) {
        logger.dev(`[SpecializedAgentManager] 📦 Agent ${agentId} récupéré du cache`);
        return cachedAgent;
      }
    }

    try {
      // Construire la requête conditionnelle selon le type d'ID
      let query = supabase
        .from('agents')
        .select('*')
        .eq('is_endpoint_agent', true)
        .eq('is_active', true);

      // Si c'est un UUID, chercher par ID, sinon par slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
      
      logger.dev(`[SpecializedAgentManager] 🔍 Type d'ID: ${isUUID ? 'UUID' : 'slug'}`);
      
      if (isUUID) {
        query = query.eq('id', agentId);
        logger.dev(`[SpecializedAgentManager] 🔍 Recherche par ID: ${agentId}`);
      } else {
        query = query.eq('slug', agentId);
        logger.dev(`[SpecializedAgentManager] 🔍 Recherche par slug: ${agentId}`);
      }

      const { data: agent, error } = await query.single();

      if (error) {
        logger.warn(`[SpecializedAgentManager] ❌ Erreur requête agent ${agentId}:`, { error: error.message, code: error.code });
        return null;
      }

      if (!agent) {
        logger.warn(`[SpecializedAgentManager] ❌ Agent non trouvé: ${agentId}`);
        return null;
      }

      // Convertir les types numériques
      const processedAgent = {
        ...agent,
        temperature: typeof agent.temperature === 'string' ? parseFloat(agent.temperature) : agent.temperature,
        top_p: typeof agent.top_p === 'string' ? parseFloat(agent.top_p) : agent.top_p,
        max_tokens: typeof agent.max_tokens === 'string' ? parseInt(agent.max_tokens) : agent.max_tokens,
        max_completion_tokens: typeof agent.max_completion_tokens === 'string' ? parseInt(agent.max_completion_tokens) : agent.max_completion_tokens,
        priority: typeof agent.priority === 'string' ? parseInt(agent.priority) : agent.priority
      };

      // Mettre en cache
      this.agentCache.set(agentId, processedAgent as SpecializedAgentConfig);
      this.cacheExpiry.set(agentId, Date.now());

      logger.dev(`[SpecializedAgentManager] ✅ Agent ${agentId} trouvé: ${processedAgent.display_name || processedAgent.name}`);
      return processedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur récupération agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Construire le message système spécialisé
   */
  private buildSpecializedSystemMessage(agent: SpecializedAgentConfig, input: Record<string, unknown>): string {
    let systemMessage = agent.system_instructions || agent.description || '';
    
    // Ajouter le contexte spécialisé
    if (agent.input_schema && agent.input_schema.properties) {
      systemMessage += `\n\nContexte de la tâche spécialisée:\n`;
      for (const [key, schema] of Object.entries(agent.input_schema.properties)) {
        if (input[key] !== undefined) {
          systemMessage += `- ${key}: ${JSON.stringify(input[key])}\n`;
        }
      }
    }

    // Ajouter les instructions de formatage de sortie
    if (agent.output_schema && agent.output_schema.properties) {
      systemMessage += `\n\nFormat de réponse attendu:\n`;
      for (const [key, schema] of Object.entries(agent.output_schema.properties)) {
        systemMessage += `- ${key}: ${schema.description || 'Valeur de type ' + schema.type}\n`;
      }
    }

    return systemMessage;
  }

  /**
   * Formater la sortie selon le schéma
   */
  private formatSpecializedOutput(result: unknown, outputSchema?: OpenAPISchema): Record<string, unknown> {
    if (!outputSchema || !outputSchema.properties) {
      const resultObj = result as Record<string, unknown>;
      return { result: resultObj?.content || result };
    }

    const formatted: Record<string, unknown> = {};
    const resultObj = result as Record<string, unknown>;
    
    // Mapper les propriétés du schéma
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      if (key === 'answer' || key === 'result' || key === 'response') {
        formatted[key] = resultObj?.content || resultObj?.message || 'Tâche exécutée';
      } else if (key === 'success') {
        formatted[key] = resultObj?.success !== false;
      } else if (key === 'confidence') {
        // Essayer d'extraire un niveau de confiance du résultat
        formatted[key] = this.extractConfidence(result);
      } else if (key === 'formattedContent') {
        formatted[key] = resultObj?.content || resultObj?.message || '';
      } else if (key === 'changes') {
        formatted[key] = this.extractChanges(result);
      } else {
        // Valeur par défaut selon le type
        formatted[key] = this.getDefaultValue(schema);
      }
    }

    return formatted;
  }

  /**
   * Extraire le niveau de confiance du résultat
   */
  private extractConfidence(result: unknown): number {
    const resultObj = result as Record<string, unknown>;
    if (typeof resultObj?.confidence === 'number') {
      return resultObj.confidence;
    }
    if (typeof resultObj?.reasoning === 'string' && resultObj.reasoning.includes('confiance')) {
      // Essayer d'extraire un pourcentage de confiance du texte
      const match = resultObj.reasoning.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        return parseFloat(match[1]) / 100;
      }
    }
    return 0.8; // Confiance par défaut
  }

  /**
   * Extraire les changements du résultat
   */
  private extractChanges(result: unknown): string[] {
    const resultObj = result as Record<string, unknown>;
    if (Array.isArray(resultObj?.changes)) {
      return resultObj.changes;
    }
    if (typeof resultObj?.reasoning === 'string' && resultObj.reasoning.includes('modifié')) {
      return ['Contenu reformaté selon les instructions'];
    }
    return [];
  }

  /**
   * Obtenir une valeur par défaut selon le schéma
   */
  private getDefaultValue(schema: OpenAPIProperty): unknown {
    if (schema.default !== undefined) {
      return schema.default;
    }
    
    switch (schema.type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return null;
    }
  }

  /**
   * Créer un nouvel agent spécialisé
   */
  async createSpecializedAgent(config: CreateSpecializedAgentRequest): Promise<CreateSpecializedAgentResponse> {
    try {
      logger.info(`[SpecializedAgentManager] 🚀 Création agent spécialisé: ${config.slug}`);

      // Validation des données
      const validation = this.validateCreateRequest(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Vérifier que le slug n'existe pas déjà
      const existingAgent = await this.getAgentByIdOrSlug(config.slug);
      if (existingAgent) {
        return {
          success: false,
          error: `Agent avec le slug '${config.slug}' existe déjà`
        };
      }

      // Préparer les données d'insertion
      const agentData = {
        name: config.display_name,
        slug: config.slug,
        display_name: config.display_name,
        description: config.description,
        model: config.model,
        provider: config.provider || 'groq',
        system_instructions: config.system_instructions,
        is_endpoint_agent: true,
        is_chat_agent: config.is_chat_agent || false,
        is_active: true,
        priority: 10,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 4000,
        capabilities: ['text', 'function_calling'],
        api_v2_capabilities: config.api_v2_capabilities || ['get_note', 'update_note', 'search_notes'],
        input_schema: config.input_schema || null,
        output_schema: config.output_schema || null
      };

      // Insérer en base
      const { data: agent, error } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();

      if (error) {
        logger.error(`[SpecializedAgentManager] ❌ Erreur création agent:`, error);
        return {
          success: false,
          error: `Erreur lors de la création: ${error.message}`
        };
      }

      // Invalider le cache
      this.agentCache.delete(config.slug);

      logger.info(`[SpecializedAgentManager] ✅ Agent spécialisé créé: ${config.slug}`);

      return {
        success: true,
        agent: agent as SpecializedAgentConfig,
        endpoint: `/api/v2/agents/${config.slug}`
      };

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur fatale création agent:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      };
    }
  }

  /**
   * Valider une requête de création d'agent
   */
  private validateCreateRequest(config: CreateSpecializedAgentRequest): ValidationResult {
    const errors: string[] = [];

    if (!config.slug || !config.slug.match(/^[a-z0-9-]+$/)) {
      errors.push('Slug requis et doit contenir uniquement des lettres minuscules, chiffres et tirets');
    }

    if (!config.display_name || config.display_name.trim().length === 0) {
      errors.push('Nom d\'affichage requis');
    }

    if (!config.model || config.model.trim().length === 0) {
      errors.push('Modèle requis');
    }

    if (!config.system_instructions || config.system_instructions.trim().length === 0) {
      errors.push('Instructions système requises');
    }

    // Valider les schémas si fournis
    if (config.input_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.input_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma d'entrée invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    if (config.output_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.output_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma de sortie invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Mettre à jour les métriques d'exécution d'un agent
   */
  private async updateAgentMetrics(agentId: string, success: boolean, executionTime: number): Promise<void> {
    try {
      // Ici on pourrait implémenter un système de métriques plus sophistiqué
      // Pour l'instant, on log simplement
      logger.dev(`[SpecializedAgentManager] 📊 Métriques agent ${agentId}:`, {
        success,
        executionTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`[SpecializedAgentManager] ⚠️ Erreur mise à jour métriques:`, error);
    }
  }

  /**
   * Obtenir les informations d'un agent (pour GET)
   */
  async getAgentInfo(agentId: string): Promise<SpecializedAgentConfig | null> {
    return await this.getAgentByIdOrSlug(agentId);
  }

  /**
   * Récupérer un agent par référence (ID ou slug) - alias public
   */
  public async getAgentByRef(ref: string, userId: string): Promise<SpecializedAgentConfig | null> {
    return await this.getAgentByIdOrSlug(ref);
  }

  /**
   * Lister tous les agents spécialisés
   */
  async listSpecializedAgents(): Promise<SpecializedAgentConfig[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_endpoint_agent', true)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error(`[SpecializedAgentManager] ❌ Erreur liste agents:`, error);
        return [];
      }

      return (agents || []) as SpecializedAgentConfig[];
    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur fatale liste agents:`, error);
      return [];
    }
  }

  /**
   * Invalider le cache d'un agent
   */
  invalidateAgentCache(agentId: string): void {
    this.agentCache.delete(agentId);
    this.cacheExpiry.delete(agentId);
    logger.dev(`[SpecializedAgentManager] 🗑️ Cache invalidé pour agent: ${agentId}`);
  }

  /**
   * Vider tout le cache
   */
  clearCache(): void {
    this.agentCache.clear();
    this.cacheExpiry.clear();
    logger.dev(`[SpecializedAgentManager] 🗑️ Cache vidé`);
  }

  /**
   * Valider la configuration d'un agent
   */
  private validateAgentConfig(config: Partial<SpecializedAgentConfig>): ValidationResult {
    const errors: string[] = [];

    if (config.slug && !/^[a-z0-9-]+$/.test(config.slug)) {
      errors.push('Slug doit contenir uniquement des lettres minuscules, chiffres et tirets');
    }

    if (config.model && !config.model.includes('groq') && !config.model.includes('llama') && !config.model.includes('deepseek') && !config.model.includes('openai/gpt-oss')) {
      errors.push('Seuls les modèles Groq (llama, deepseek) et OpenAI GPT-OSS sont supportés actuellement');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature doit être entre 0 et 2');
    }

    if (config.max_tokens !== undefined && (config.max_tokens < 1 || config.max_tokens > 8192)) {
      errors.push('Max tokens doit être entre 1 et 8192');
    }

    if (config.input_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.input_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma d'entrée invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    if (config.output_schema) {
      const schemaValidation = SchemaValidator.validateSchema(config.output_schema);
      if (!schemaValidation.valid) {
        errors.push(`Schéma de sortie invalide: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Mettre à jour complètement un agent spécialisé
   */
  async updateAgent(
    agentId: string, 
    updateData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    try {
      logger.dev(`[SpecializedAgentManager] 🔄 Mise à jour complète agent ${agentId}`, { traceId });

      // Validation des données de mise à jour
      const validation = this.validateAgentConfig(updateData as Partial<SpecializedAgentConfig>);
      if (!validation.valid) {
        logger.warn(`[SpecializedAgentManager] ❌ Validation échouée:`, validation.errors);
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Vérifier que l'agent existe
      const existingAgent = await this.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[SpecializedAgentManager] ❌ Agent ${agentId} non trouvé`);
        return null;
      }

      // Préparer les données de mise à jour
      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Mettre à jour en base
      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(updatePayload)
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        logger.error(`[SpecializedAgentManager] ❌ Erreur mise à jour agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.invalidateAgentCache(agentId);

      logger.dev(`[SpecializedAgentManager] ✅ Agent ${agentId} mis à jour`, { 
        traceId,
        updatedFields: Object.keys(updateData)
      });

      return updatedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur mise à jour agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Invalider le cache d'un agent spécifique
   */
  public invalidateAgentCache(agentId: string): void {
    this.agentCache.delete(agentId);
    this.cacheExpiry.delete(agentId);
    logger.dev(`[SpecializedAgentManager] 🗑️ Cache invalidé pour agent: ${agentId}`);
  }

  /**
   * Vider tout le cache des agents
   */
  public clearAllCache(): void {
    this.agentCache.clear();
    this.cacheExpiry.clear();
    logger.dev(`[SpecializedAgentManager] 🗑️ Tout le cache vidé`);
  }

  /**
   * Mettre à jour partiellement un agent spécialisé
   */
  async patchAgent(
    agentId: string, 
    patchData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    try {
      logger.dev(`[SpecializedAgentManager] 🔧 Mise à jour partielle agent ${agentId}`, { traceId });

      // Vérifier que l'agent existe
      const existingAgent = await this.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[SpecializedAgentManager] ❌ Agent ${agentId} non trouvé`);
        return null;
      }

      // Validation seulement des champs modifiés
      const validation = this.validateAgentConfig(patchData);
      if (!validation.valid) {
        logger.warn(`[SpecializedAgentManager] ❌ Validation échouée pour les champs modifiés:`, validation.errors);
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Fusionner les données existantes avec les nouvelles
      const mergedData = {
        ...existingAgent,
        ...patchData,
        updated_at: new Date().toISOString()
      };

      // Mettre à jour en base
      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(mergedData)
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        logger.error(`[SpecializedAgentManager] ❌ Erreur patch agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.invalidateAgentCache(agentId);

      logger.dev(`[SpecializedAgentManager] ✅ Agent ${agentId} patché`, { 
        traceId,
        patchedFields: Object.keys(patchData)
      });

      return updatedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur patch agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Lister tous les agents spécialisés disponibles
   */
  async listAgents(userId: string): Promise<SpecializedAgentConfig[]> {
    try {
      logger.dev(`[SpecializedAgentManager] 📋 Récupération liste des agents`, { userId });

      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_endpoint_agent', true)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`[SpecializedAgentManager] ❌ Erreur récupération liste agents:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Convertir les types numériques pour tous les agents
      const processedAgents = (agents || []).map(agent => ({
        ...agent,
        temperature: typeof agent.temperature === 'string' ? parseFloat(agent.temperature) : agent.temperature,
        top_p: typeof agent.top_p === 'string' ? parseFloat(agent.top_p) : agent.top_p,
        max_tokens: typeof agent.max_tokens === 'string' ? parseInt(agent.max_tokens) : agent.max_tokens,
        max_completion_tokens: typeof agent.max_completion_tokens === 'string' ? parseInt(agent.max_completion_tokens) : agent.max_completion_tokens,
        priority: typeof agent.priority === 'string' ? parseInt(agent.priority) : agent.priority
      }));

      logger.dev(`[SpecializedAgentManager] ✅ ${processedAgents.length} agents récupérés`, { 
        userId, 
        count: processedAgents.length 
      });

      return processedAgents as SpecializedAgentConfig[];

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur liste agents:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un agent spécialisé
   */
  async deleteAgent(agentId: string, traceId: string): Promise<boolean> {
    try {
      logger.dev(`[SpecializedAgentManager] 🗑️ Suppression agent ${agentId}`, { traceId });

      // Vérifier que l'agent existe
      const existingAgent = await this.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[SpecializedAgentManager] ❌ Agent ${agentId} non trouvé`);
        return false;
      }

      // Supprimer de la base (soft delete en désactivant)
      const { error } = await supabase
        .from('agents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id);

      if (error) {
        logger.error(`[SpecializedAgentManager] ❌ Erreur suppression agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.invalidateAgentCache(agentId);

      logger.dev(`[SpecializedAgentManager] ✅ Agent ${agentId} supprimé (désactivé)`, { traceId });

      return true;

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur suppression agent ${agentId}:`, error);
      throw error;
    }
  }
}
