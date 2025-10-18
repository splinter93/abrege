/**
 * Service de gestion des agents spécialisés
 * Orchestration et exécution des agents via l'infrastructure existante
 */

import { createClient } from '@supabase/supabase-js';
import { simpleOrchestrator } from '@/services/llm/services/SimpleOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';
import { SchemaValidator } from './schemaValidator';
import { MultimodalHandler } from './multimodalHandler';
import { isGroqModelSupported, getGroqModelInfo, GROQ_MODELS } from '@/constants/groqModels';
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
import { GroqRoundResult } from '@/services/llm/types/groqTypes';

// ✅ CORRECTION : Validation de la configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
}

// Client Supabase admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class SpecializedAgentManager {
  private agentCache: Map<string, SpecializedAgentConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // ✨ Utilise maintenant AgenticOrchestrator V2 (singleton)
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
    // ✅ CORRECTION : Validation du token utilisateur
    if (!userToken || typeof userToken !== 'string' || userToken.trim().length === 0) {
      logger.error(`[SpecializedAgentManager] ❌ Token utilisateur invalide`, { agentId });
      return {
        success: false,
        error: 'Token utilisateur invalide ou manquant',
        metadata: {
          agentId,
          executionTime: 0,
          model: 'unknown'
        }
      };
    }

    // ✅ CORRECTION : Validation du format du token (UUID ou JWT)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToken);
    const isJWT = userToken.includes('.') && userToken.split('.').length === 3;
    
    logger.info(`[SpecializedAgentManager] 🔍 Token reçu:`, {
      agentId,
      tokenType: isUUID ? 'UUID' : isJWT ? 'JWT' : 'INVALID',
      tokenLength: userToken.length,
      tokenStart: userToken.substring(0, 20) + '...'
    });
    
    if (!isUUID && !isJWT) {
      logger.error(`[SpecializedAgentManager] ❌ Format de token invalide`, { 
        agentId, 
        tokenType: typeof userToken,
        tokenLength: userToken.length 
      });
      return {
        success: false,
        error: 'Format de token invalide (attendu: UUID ou JWT)',
        metadata: {
          agentId,
          executionTime: 0,
          model: 'unknown'
        }
      };
    }

    // ✅ CORRECTION : Validation de l'input pour éviter les injections
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      logger.error(`[SpecializedAgentManager] ❌ Input invalide`, { agentId, inputType: typeof input });
      return {
        success: false,
        error: 'Input doit être un objet JSON valide',
        metadata: {
          agentId,
          executionTime: 0,
          model: 'unknown'
        }
      };
    }

    // ✅ CORRECTION : Validation de la taille de l'input
    const inputSize = JSON.stringify(input).length;
    const MAX_INPUT_SIZE = 1024 * 1024; // 1MB
    
    if (inputSize > MAX_INPUT_SIZE) {
      logger.error(`[SpecializedAgentManager] ❌ Input trop volumineux`, { 
        agentId, 
        inputSize, 
        maxSize: MAX_INPUT_SIZE 
      });
      return {
        success: false,
        error: `Input trop volumineux (${inputSize} bytes, max: ${MAX_INPUT_SIZE} bytes)`,
        metadata: {
          agentId,
          executionTime: 0,
          model: 'unknown'
        }
      };
    }

    // ✅ CORRECTION : Validation de l'agentId pour éviter les injections
    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      logger.error(`[SpecializedAgentManager] ❌ AgentId invalide`, { agentId });
      return {
        success: false,
        error: 'AgentId invalide ou manquant',
        metadata: {
          agentId: 'unknown',
          executionTime: 0,
          model: 'unknown'
        }
      };
    }

    // ✅ CORRECTION : Validation du format de l'agentId (UUID ou slug sécurisé)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
    const isValidSlug = /^[a-z0-9-]+$/.test(agentId);
    
    if (!isValidUUID && !isValidSlug) {
      logger.error(`[SpecializedAgentManager] ❌ Format d'agentId invalide`, { 
        agentId, 
        isValidUUID, 
        isValidSlug 
      });
      return {
        success: false,
        error: 'Format d\'agentId invalide (attendu: UUID ou slug alphanumérique)',
        metadata: {
          agentId,
          executionTime: 0,
          model: 'unknown'
        }
      };
    }

    // ✅ CORRECTION : Validation de la sessionId si fournie
    if (sessionId !== undefined) {
      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        logger.error(`[SpecializedAgentManager] ❌ SessionId invalide`, { agentId, sessionId });
        return {
          success: false,
          error: 'SessionId doit être une chaîne non-vide',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        };
      }
      
      // Validation du format de sessionId (alphanumérique + tirets)
      if (!/^[a-zA-Z0-9-_]+$/.test(sessionId)) {
        logger.error(`[SpecializedAgentManager] ❌ Format de sessionId invalide`, { agentId, sessionId });
        return {
          success: false,
          error: 'Format de sessionId invalide (attendu: alphanumérique, tirets et underscores)',
          metadata: {
            agentId,
            executionTime: 0,
            model: 'unknown'
          }
        };
      }
    }
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
      let isMultimodal = false;
      let groqPayload: {
        messages: Array<{
          role: string;
          content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
        }>;
        model: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        reasoning_effort?: string;
        stream?: boolean;
      } | null = null;
      
      logger.info(`[SpecializedAgentManager] 🔍 Vérification multimodale: ${agent.model}`, { 
        traceId, 
        isMultimodalModel: MultimodalHandler.isMultimodalModel(agent.model),
        inputKeys: Object.keys(input),
        hasImage: !!(input.image || input.imageUrl || input.image_url),
        inputImage: input.image,
        inputImageUrl: input.imageUrl,
        inputImage_url: input.image_url
      });
      
      if (MultimodalHandler.isMultimodalModel(agent.model)) {
        const multimodalPrep = MultimodalHandler.prepareGroqContent(input, agent.model);
        
        logger.info(`[SpecializedAgentManager] 🔍 Préparation multimodale:`, { 
          traceId, 
          text: multimodalPrep.text,
          imageUrl: multimodalPrep.imageUrl,
          error: multimodalPrep.error
        });
        
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
        groqPayload = MultimodalHandler.createGroqPayload(
          agent.model,
          multimodalPrep.text,
          multimodalPrep.imageUrl,
          {
            temperature: agent.temperature,
            max_completion_tokens: agent.max_tokens,
            stream: false
          }
        );
        isMultimodal = true;
      }

      // 4. Exécution selon le type de modèle
      let result: SpecializedAgentResponse;
      
      logger.info(`[SpecializedAgentManager] 🔍 Détection multimodale: ${isMultimodal}, payload: ${!!groqPayload}`, { 
        traceId, 
        model: agent.model,
        hasImage: !!(input.image || input.imageUrl || input.image_url) ? 'yes' : 'no',
        inputKeys: Object.keys(input)
      });
      
      // ✅ CORRECTION : Forcer l'exécution multimodale si une image est détectée
      const hasImage = !!(input.image || input.imageUrl || input.image_url);
      
      if (isMultimodal && groqPayload) {
        // Exécution directe avec l'API Groq pour les modèles multimodaux
        logger.info(`[SpecializedAgentManager] 🖼️ Exécution multimodale directe pour ${agentId}`, { traceId, model: agent.model });
        result = await this.executeMultimodalDirect(groqPayload, agent, traceId);
      } else if (hasImage && MultimodalHandler.isMultimodalModel(agent.model)) {
        // ✅ CORRECTION : Fallback pour forcer l'exécution multimodale si image détectée
        logger.warn(`[SpecializedAgentManager] ⚠️ Image détectée mais exécution multimodale non déclenchée, tentative de récupération`, { 
          traceId, 
          hasImage, 
          isMultimodal, 
          hasGroqPayload: !!groqPayload 
        });
        
        // Essayer de préparer le contenu multimodale à nouveau
        const fallbackMultimodalPrep = MultimodalHandler.prepareGroqContent(input, agent.model);
        if (!fallbackMultimodalPrep.error) {
          const fallbackGroqPayload = MultimodalHandler.createGroqPayload(
            agent.model,
            fallbackMultimodalPrep.text,
            fallbackMultimodalPrep.imageUrl,
            {
              temperature: agent.temperature,
              max_completion_tokens: agent.max_tokens,
              stream: false
            }
          );
          
          logger.info(`[SpecializedAgentManager] 🔄 Exécution multimodale de fallback pour ${agentId}`, { traceId });
          result = await this.executeMultimodalDirect(fallbackGroqPayload, agent, traceId);
        } else {
          logger.error(`[SpecializedAgentManager] ❌ Impossible de préparer le contenu multimodale de fallback`, { 
            traceId, 
            error: fallbackMultimodalPrep.error 
          });
          // Continuer avec l'exécution normale
          result = await this.executeNormalMode(agent, input, userToken, sessionId, traceId);
        }
      } else {
        // Exécution normale via l'orchestrateur
        result = await this.executeNormalMode(agent, input, userToken, sessionId, traceId);
      }

      // 5. Formater selon le schéma de sortie
      logger.info(`[SpecializedAgentManager] 🔍 Résultat brut de l'orchestrateur:`, { 
        traceId, 
        resultType: typeof result,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
        resultContent: result && typeof result === 'object' ? (result as any).content : 'N/A',
        resultSuccess: result && typeof result === 'object' ? (result as any).success : 'N/A'
      });
      
      const formattedResult = this.formatSpecializedOutput(result, agent.output_schema);
      
      logger.info(`[SpecializedAgentManager] 🔍 Résultat formaté:`, { 
        traceId, 
        formattedKeys: Object.keys(formattedResult),
        formattedResult: formattedResult
      });

      const executionTime = Date.now() - startTime;
      logger.info(`[SpecializedAgentManager] ✅ Agent ${agentId} exécuté avec succès`, { 
        traceId, 
        executionTime 
      });

      // 6. Mettre à jour les métriques
      await this.updateAgentMetrics(agentId, true, executionTime);

      // ✅ CORRECTION : Extraire la réponse finale avec une logique plus robuste
      let finalResponse = 'Aucune réponse générée';
      
      if (typeof formattedResult.result === 'string' && formattedResult.result.trim()) {
        finalResponse = formattedResult.result;
      } else if (typeof formattedResult.content === 'string' && formattedResult.content.trim()) {
        finalResponse = formattedResult.content;
      } else if (typeof formattedResult.response === 'string' && formattedResult.response.trim()) {
        finalResponse = formattedResult.response;
      } else if (typeof formattedResult === 'string' && (formattedResult as string).trim()) {
        finalResponse = formattedResult;
      } else if (formattedResult && typeof formattedResult === 'object') {
        // Essayer d'extraire n'importe quelle propriété string non-vide
        const obj = formattedResult as Record<string, unknown>;
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.trim()) {
            finalResponse = value;
            break;
          }
        }
      }
      
      logger.info(`[SpecializedAgentManager] 🔍 Réponse finale extraite:`, { 
        traceId, 
        finalResponse: finalResponse.substring(0, 100) + (finalResponse.length > 100 ? '...' : ''),
        finalResponseLength: finalResponse.length,
        formattedResultKeys: Object.keys(formattedResult)
      });

      return {
        success: true,
        data: {
          response: finalResponse,
          model: agent.model,
          provider: 'groq'
        },
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
    
    // ✅ CORRECTION : Vérifier le cache avec validation
    if (this.agentCache.has(agentId)) {
      const cachedAgent = this.agentCache.get(agentId)!;
      const cacheTime = this.cacheExpiry.get(agentId) || 0;
      
      if (Date.now() - cacheTime < this.CACHE_TTL && cachedAgent) {
        // Validation de l'agent en cache
        if (cachedAgent.id || cachedAgent.slug) {
          logger.dev(`[SpecializedAgentManager] 📦 Agent ${agentId} récupéré du cache`);
          return cachedAgent;
        } else {
          // Agent en cache invalide, le supprimer
          logger.warn(`[SpecializedAgentManager] ⚠️ Agent en cache invalide, suppression`, { agentId });
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

      // ✅ CORRECTION : Validation et conversion des types numériques
      const processedAgent = {
        ...agent,
        temperature: typeof agent.temperature === 'string' ? parseFloat(agent.temperature) : agent.temperature,
        top_p: typeof agent.top_p === 'string' ? parseFloat(agent.top_p) : agent.top_p,
        max_tokens: typeof agent.max_tokens === 'string' ? parseInt(agent.max_tokens) : agent.max_tokens,
        max_completion_tokens: typeof agent.max_completion_tokens === 'string' ? parseInt(agent.max_completion_tokens) : agent.max_completion_tokens,
        priority: typeof agent.priority === 'string' ? parseInt(agent.priority) : agent.priority
      };

      // ✅ CORRECTION : Validation des paramètres de l'agent
      if (processedAgent.temperature < 0 || processedAgent.temperature > 2) {
        logger.warn(`[SpecializedAgentManager] ⚠️ Temperature invalide, utilisation de la valeur par défaut`, {
          agentId,
          temperature: processedAgent.temperature
        });
        processedAgent.temperature = 0.7;
      }

      if (processedAgent.max_tokens < 1 || processedAgent.max_tokens > 8192) {
        logger.warn(`[SpecializedAgentManager] ⚠️ Max tokens invalide, utilisation de la valeur par défaut`, {
          agentId,
          max_tokens: processedAgent.max_tokens
        });
        processedAgent.max_tokens = 4000;
      }

      if (processedAgent.top_p < 0 || processedAgent.top_p > 1) {
        logger.warn(`[SpecializedAgentManager] ⚠️ Top_p invalide, utilisation de la valeur par défaut`, {
          agentId,
          top_p: processedAgent.top_p
        });
        processedAgent.top_p = 1;
      }

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
    
    // ✅ CORRECTION : Ajouter les instructions pour l'utilisation des tools
    systemMessage += `\n\n🔧 OUTILS DISPONIBLES :
Tu as accès à des outils pour interagir avec le système. Utilise-les quand c'est nécessaire pour répondre aux demandes de l'utilisateur.

Outils disponibles :
- get_note : Récupérer une note par ID ou slug
- update_note : Mettre à jour une note existante
- search_notes : Rechercher des notes par contenu
- list_notes : Lister toutes les notes de l'utilisateur
- create_note : Créer une nouvelle note
- delete_note : Supprimer une note
- list_classeurs : Lister les classeurs
- get_classeur : Récupérer un classeur
- create_classeur : Créer un classeur
- update_classeur : Mettre à jour un classeur
- delete_classeur : Supprimer un classeur
- list_dossiers : Lister les dossiers
- get_dossier : Récupérer un dossier
- create_dossier : Créer un dossier
- update_dossier : Mettre à jour un dossier
- delete_dossier : Supprimer un dossier

Instructions importantes :
1. Utilise les outils quand l'utilisateur demande des informations ou des actions sur ses données
2. Appelle les outils en premier pour récupérer les informations nécessaires
3. Puis fournis une réponse basée sur les résultats des outils
4. Si un outil échoue, essaie une approche alternative ou explique le problème`;
    
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
   * Exécute directement un modèle multimodal avec l'API Groq
   */
  private async executeMultimodalDirect(
    groqPayload: {
      messages: Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      }>;
      model: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      reasoning_effort?: string;
      stream?: boolean;
    }, 
    agent: SpecializedAgentConfig, 
    traceId: string
  ): Promise<SpecializedAgentResponse> {
    try {
      // Ajouter le message système au payload
      const systemMessage = {
        role: 'system',
        content: agent.system_instructions || 'Tu es un assistant IA spécialisé.'
      };
      
      groqPayload.messages.unshift(systemMessage);

      logger.info(`[SpecializedAgentManager] 🖼️ Payload Groq multimodale:`, { 
        traceId, 
        model: agent.model,
        messagesCount: groqPayload.messages.length,
        hasImage: groqPayload.messages.some((msg) => 
          Array.isArray(msg.content) && msg.content.some((c) => c.type === 'image_url')
        ),
        payload: JSON.stringify(groqPayload, null, 2)
      });

      // ✅ CORRECTION : Validation de la clé API Groq
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey || typeof groqApiKey !== 'string' || groqApiKey.trim().length === 0) {
        logger.error(`[SpecializedAgentManager] ❌ Clé API Groq manquante`, { traceId });
        return {
          success: false,
          error: 'Configuration API Groq manquante'
        };
      }

      // Appel direct à l'API Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify(groqPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[SpecializedAgentManager] ❌ Erreur API Groq multimodale: ${response.status}`, {
          traceId,
          error: errorText
        });
        
        // ✅ GESTION INTELLIGENTE DES ERREURS GROQ
        if (response.status === 400) {
          return this.handleGroq400Error(errorText, traceId, agent.model);
        } else if (response.status === 413) {
          return this.handleGroq413Error(errorText, traceId, agent.model);
        } else {
          throw new Error(`API Groq error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      
      // ✅ CORRECTION : Validation de la réponse de l'API Groq
      if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        logger.error(`[SpecializedAgentManager] ❌ Réponse API Groq invalide`, {
          traceId,
          model: agent.model,
          response: data
        });
        return {
          success: false,
          error: 'Réponse API Groq invalide ou vide'
        };
      }

      const choice = data.choices[0];
      if (!choice || !choice.message || typeof choice.message.content !== 'string') {
        logger.error(`[SpecializedAgentManager] ❌ Contenu de réponse invalide`, {
          traceId,
          model: agent.model,
          choice
        });
        return {
          success: false,
          error: 'Contenu de réponse invalide'
        };
      }
      
      logger.info(`[SpecializedAgentManager] ✅ Réponse multimodale reçue`, {
        traceId,
        model: agent.model,
        hasImage: groqPayload.messages.some((msg) => 
          Array.isArray(msg.content) && msg.content.some((c) => c.type === 'image_url')
        ),
        responseLength: choice.message.content.length
      });

      return {
        success: true,
        result: {
          response: choice.message.content,
          model: agent.model,
          provider: 'groq'
        }
      };

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur exécution multimodale:`, {
        traceId,
        error: error.message
      });
      
      return {
        success: false,
        error: `Erreur multimodale: ${error.message}`
      };
    }
  }

  /**
   * Gère les erreurs 400 de Groq (limitations d'images)
   */
  private handleGroq400Error(errorText: string, traceId: string, model: string): SpecializedAgentResponse {
    logger.warn(`[SpecializedAgentManager] ⚠️ Erreur 400 Groq - Limitations d'image`, {
      traceId,
      model,
      error: errorText
    });

    // Message d'erreur explicite pour l'utilisateur
    const errorMessage = `🖼️ Erreur d'image détectée par Groq. Vérifiez les limitations suivantes :

📏 **Taille maximale** : 20MB par image
🖥️ **Résolution maximale** : 33 mégapixels (33,177,600 pixels)
📊 **Images par requête** : Maximum 5 images
📝 **Format supporté** : JPG, PNG, WebP, GIF

💡 **Solutions** :
- Réduisez la taille de votre image
- Compressez l'image avant l'envoi
- Vérifiez que l'URL de l'image est accessible

Modèle utilisé : ${model}`;

    return {
      success: false,
      error: errorMessage,
      metadata: {
        errorType: 'GROQ_IMAGE_LIMIT',
        model,
        traceId,
        originalError: errorText
      }
    };
  }

  /**
   * Gère les erreurs 413 de Groq (images base64 trop grandes)
   */
  private handleGroq413Error(errorText: string, traceId: string, model: string): SpecializedAgentResponse {
    logger.warn(`[SpecializedAgentManager] ⚠️ Erreur 413 Groq - Image base64 trop grande`, {
      traceId,
      model,
      error: errorText
    });

    const errorMessage = `🖼️ Image trop volumineuse pour Groq.

📏 **Limite base64** : 4MB maximum
💡 **Solution** : Utilisez une URL d'image au lieu d'un encodage base64

Modèle utilisé : ${model}`;

    return {
      success: false,
      error: errorMessage,
      metadata: {
        errorType: 'GROQ_BASE64_LIMIT',
        model,
        traceId,
        originalError: errorText
      }
    };
  }

  /**
   * Normaliser les caractères Unicode pour éviter les erreurs d'encodage ByteString
   */
  private normalizeUnicode(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    return text
      .replace(/—/g, '-') // Tiret cadratin vers tiret normal
      .replace(/–/g, '-') // Tiret en vers tiret normal
      .replace(/"/g, '"') // Guillemets courbes vers guillemets droits
      .replace(/"/g, '"') // Guillemets courbes vers guillemets droits
      .replace(/'/g, "'") // Apostrophe courbe vers apostrophe droite
      .replace(/…/g, '...') // Points de suspension vers trois points
      .replace(/–/g, '-') // Tiret en vers tiret normal
      .replace(/—/g, '-') // Tiret cadratin vers tiret normal
      .replace(/[\u2010-\u2015]/g, '-') // Tous les types de tirets vers tiret normal
      .replace(/[\u2018\u2019]/g, "'") // Guillemets simples vers apostrophe droite
      .replace(/[\u201C\u201D]/g, '"') // Guillemets doubles vers guillemets droits
      .replace(/[\u2026]/g, '...') // Points de suspension vers trois points
      .replace(/[\u00A0]/g, ' ') // Espace insécable vers espace normal
      .replace(/[\u2000-\u200F]/g, ' ') // Espaces spéciaux vers espace normal
      .replace(/[\u2028\u2029]/g, '\n'); // Séparateurs de ligne vers newline
  }

  /**
   * Formater la sortie selon le schéma
   */
  private formatSpecializedOutput(result: unknown, outputSchema?: OpenAPISchema): Record<string, unknown> {
    logger.info(`[SpecializedAgentManager] 🔍 formatSpecializedOutput:`, { 
      hasOutputSchema: !!outputSchema,
      hasProperties: !!(outputSchema?.properties),
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A'
    });
    
    if (!outputSchema || !outputSchema.properties) {
      const resultObj = result as Record<string, unknown>;
      
      // Essayer d'extraire la réponse de différentes propriétés possibles
      const extractedResponse = resultObj?.content || 
                               resultObj?.response || 
                               resultObj?.message || 
                               resultObj?.text || 
                               (resultObj?.result as any)?.response ||
                               (resultObj?.result as any)?.content ||
                               result;
      
      // Normaliser les caractères Unicode pour éviter les erreurs d'encodage
      const normalizedResponse = typeof extractedResponse === 'string' 
        ? this.normalizeUnicode(extractedResponse) 
        : extractedResponse;
      
      const formatted = { 
        result: normalizedResponse,
        response: normalizedResponse,
        content: normalizedResponse
      };
      logger.info(`[SpecializedAgentManager] 🔍 Format simple (pas de schéma):`, { 
        extractedResponse,
        resultObjKeys: Object.keys(resultObj || {}),
        formatted 
      });
      return formatted;
    }

    const formatted: Record<string, unknown> = {};
    const resultObj = result as Record<string, unknown>;
    
    // Mapper les propriétés du schéma
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      if (key === 'answer' || key === 'result' || key === 'response') {
        const rawContent = resultObj?.content || resultObj?.message || 'Tâche exécutée';
        formatted[key] = typeof rawContent === 'string' ? this.normalizeUnicode(rawContent) : rawContent;
      } else if (key === 'success') {
        formatted[key] = resultObj?.success !== false;
      } else if (key === 'confidence') {
        // Essayer d'extraire un niveau de confiance du résultat
        formatted[key] = this.extractConfidence(result);
      } else if (key === 'formattedContent') {
        const rawContent = resultObj?.content || resultObj?.message || '';
        formatted[key] = typeof rawContent === 'string' ? this.normalizeUnicode(rawContent) : rawContent;
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
      return resultObj.changes.map(change => 
        typeof change === 'string' ? this.normalizeUnicode(change) : change
      );
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

    if (config.model && !isGroqModelSupported(config.model)) {
      const modelInfo = getGroqModelInfo(config.model);
      if (modelInfo) {
        errors.push(`Modèle ${modelInfo.name} non supporté. Modèles supportés: ${Object.keys(GROQ_MODELS).join(', ')}`);
      } else {
        errors.push(`Modèle '${config.model}' non supporté. Consultez la liste des modèles Groq disponibles.`);
      }
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
   * Exécution normale via l'orchestrateur (mode non-multimodal)
   */
  private async executeNormalMode(
    agent: SpecializedAgentConfig,
    input: Record<string, unknown>,
    userToken: string,
    sessionId: string | undefined,
    traceId: string
  ): Promise<SpecializedAgentResponse> {
    const systemMessage = this.buildSpecializedSystemMessage(agent, input);
    const userMessage = `Exécution de tâche spécialisée: ${JSON.stringify(input)}`;

    // ✅ CORRECTION : Configurer l'agent avec les capabilities pour les tool calls
    const agentConfigWithTools = {
      ...agent,
      // S'assurer que l'agent a accès aux tools
      capabilities: agent.capabilities || ['text', 'function_calling'],
      api_v2_capabilities: agent.api_v2_capabilities || ['get_note', 'update_note', 'search_notes', 'list_notes', 'create_note', 'delete_note']
    };

    const orchestratorResult = await simpleOrchestrator.processMessage(
      userMessage,
      {
        userToken,
        sessionId: sessionId || `specialized-${agent.id || agent.slug || 'unknown'}-${Date.now()}`,
        agentConfig: agentConfigWithTools
      },
      [] // history vide
    );
    
    // ✅ CORRECTION : Validation de la réponse de l'orchestrateur
    if (!orchestratorResult || typeof orchestratorResult !== 'object') {
      logger.error(`[SpecializedAgentManager] ❌ Réponse orchestrateur invalide`, { 
        traceId, 
        orchestratorResult 
      });
      return {
        success: false,
        result: {
          response: 'Erreur: Réponse orchestrateur invalide',
          model: agent.model,
          provider: 'groq'
        },
        error: 'Réponse orchestrateur invalide',
        metadata: {
          agentId: agent.id || agent.slug || 'unknown',
          executionTime: 0,
          model: agent.model
        }
      };
    }
    
    // Convertir ChatResponse en SpecializedAgentResponse
    logger.info(`[SpecializedAgentManager] 🔍 Résultat orchestrateur brut:`, { 
      traceId, 
      success: orchestratorResult.success,
      content: orchestratorResult.content,
      contentLength: orchestratorResult.content?.length || 0,
      hasError: !!orchestratorResult.error,
      error: orchestratorResult.error,
      orchestratorKeys: Object.keys(orchestratorResult)
    });
    
    // ✅ CORRECTION : Améliorer la gestion des réponses vides
    const responseContent = orchestratorResult.content || '';
    
    if (!responseContent.trim()) {
      logger.warn(`[SpecializedAgentManager] ⚠️ Réponse vide de l'orchestrateur`, { 
        traceId, 
        orchestratorResult: {
          success: orchestratorResult.success,
          hasContent: !!orchestratorResult.content,
          hasError: !!orchestratorResult.error,
          error: orchestratorResult.error
        }
      });
    }
    
    return {
      success: orchestratorResult.success,
      result: {
        response: responseContent || (orchestratorResult.error ? `Erreur: ${orchestratorResult.error}` : 'Aucune réponse générée'),
        model: agent.model,
        provider: 'groq'
      },
      error: orchestratorResult.error,
      metadata: {
        agentId: agent.id || agent.slug || 'unknown',
        executionTime: 0, // Sera calculé plus tard
        model: agent.model
      }
    };
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
