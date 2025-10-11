/**
 * AgenticOrchestrator V2 - Orchestrateur intelligent style Claude/ChatGPT
 * 
 * Stratégie agentique complète :
 * - 🧠 Thinking interleaved : Réflexion entre chaque outil
 * - 💬 Communication transparente : Progress updates en temps réel
 * - 🔁 Retry intelligent : Backoff exponentiel + fallback
 * - 🔀 Parallélisation : Exécution simultanée des outils indépendants
 * - ⚡ Enchainement robuste : Continue même avec des erreurs partielles
 */

import { GroqProvider, LLMResponse } from '../providers/implementations/groq';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
import { GroqHistoryBuilder } from './GroqHistoryBuilder';
import { DEFAULT_GROQ_LIMITS } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';
import { agentTemplateService, AgentTemplateConfig } from '../agentTemplateService';
import { UIContext } from '../ContextCollector';
import { mcpConfigService } from '../mcpConfigService';
import { getOpenAPIV2Tools } from '@/services/openApiToolsGenerator';
import { groqCircuitBreaker } from '@/services/circuitBreaker';
import {
  ThinkingBlock,
  ProgressUpdate,
  ToolCallStrategy,
  RetryStrategy,
  AgenticConfig,
  AgenticResponse,
  ToolCategory,
  ToolMetadata,
  CacheEntry,
  OrchestratorMetrics
} from '../types/agenticTypes';

/**
 * Contexte d'exécution pour l'orchestrateur
 */
export interface ChatContext {
  userToken: string;
  sessionId: string;
  agentConfig?: AgentTemplateConfig;
  uiContext?: UIContext;
  maxRetries?: number;
  maxToolCalls?: number;
}

/**
 * Registre des métadonnées des outils pour la catégorisation
 */
const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  // === LECTURE (Parallélisables) ===
  'getNote': { name: 'getNote', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 2 },
  'getClasseur': { name: 'getClasseur', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 2 },
  'getFolder': { name: 'getFolder', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 2 },
  'getUserProfile': { name: 'getUserProfile', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 3 },
  'listClasseurs': { name: 'listClasseurs', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 2 },
  'listAgents': { name: 'listAgents', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 3 },
  
  // === RECHERCHE (Parallélisables) ===
  'searchContent': { name: 'searchContent', category: ToolCategory.SEARCH, parallelizable: true, cacheable: true, timeout: 10000, priority: 1 },
  'searchFiles': { name: 'searchFiles', category: ToolCategory.SEARCH, parallelizable: true, cacheable: true, timeout: 10000, priority: 2 },
  
  // === ÉCRITURE (Séquentiels) ===
  'createNote': { name: 'createNote', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 10000, priority: 1 },
  'updateNote': { name: 'updateNote', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 10000, priority: 1 },
  'deleteResource': { name: 'deleteResource', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 10000, priority: 1 },
  'createClasseur': { name: 'createClasseur', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 10000, priority: 1 },
  'createFolder': { name: 'createFolder', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 10000, priority: 1 },
  'moveNote': { name: 'moveNote', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 10000, priority: 1 },
  
  // === AGENTS (Dépend du contexte, traiter comme séquentiel) ===
  'executeAgent': { name: 'executeAgent', category: ToolCategory.AGENT, parallelizable: false, cacheable: false, timeout: 30000, priority: 1 },
  
  // === NOTION MCP ===
  'mcp_Notion_notion-fetch': { name: 'mcp_Notion_notion-fetch', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 10000, priority: 2, fallbacks: ['searchContent'] },
  'mcp_Notion_notion-search': { name: 'mcp_Notion_notion-search', category: ToolCategory.SEARCH, parallelizable: true, cacheable: true, timeout: 10000, priority: 1 },
  'mcp_Notion_notion-create-pages': { name: 'mcp_Notion_notion-create-pages', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 15000, priority: 1 },
  'mcp_Notion_notion-update-page': { name: 'mcp_Notion_notion-update-page', category: ToolCategory.WRITE, parallelizable: false, cacheable: false, timeout: 15000, priority: 1 },
  
  // === SUPABASE MCP ===
  'mcp_supabase_execute_sql': { name: 'mcp_supabase_execute_sql', category: ToolCategory.DATABASE, parallelizable: false, cacheable: false, timeout: 15000, priority: 1 },
  'mcp_supabase_list_tables': { name: 'mcp_supabase_list_tables', category: ToolCategory.READ, parallelizable: true, cacheable: true, timeout: 5000, priority: 3 },
};

/**
 * Configuration par défaut de l'orchestrateur
 */
const DEFAULT_AGENTIC_CONFIG: AgenticConfig = {
  retryStrategy: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 10000,
    fallbackTools: {
      'mcp_Notion_notion-fetch': 'searchContent',
      'executeAgent': 'searchContent'
    }
  },
  streamThinking: true, // ✅ ACTIVÉ : Thinking interleaved visible
  streamProgress: true, // ✅ ACTIVÉ : Progress updates visibles
  enableParallelization: true,
  toolTimeout: 30000,
  enableCache: true // ✅ ACTIVÉ : Gain 10x sur reads répétés
};

/**
 * Orchestrateur agentique V2
 */
export class AgenticOrchestrator {
  private toolExecutor: SimpleToolExecutor;
  private historyBuilder: GroqHistoryBuilder;
  private thinkingBlocks: ThinkingBlock[] = [];
  private progressUpdates: ProgressUpdate[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: OrchestratorMetrics;

  constructor(private config: AgenticConfig = DEFAULT_AGENTIC_CONFIG) {
    this.toolExecutor = new SimpleToolExecutor();
    this.historyBuilder = new GroqHistoryBuilder(DEFAULT_GROQ_LIMITS);
    this.metrics = this.initMetrics();
  }

  /**
   * Initialiser les métriques
   */
  private initMetrics(): OrchestratorMetrics {
    return {
      totalSessions: 0,
      totalToolCalls: 0,
      successfulToolCalls: 0,
      totalRetries: 0,
      totalFallbacks: 0,
      avgToolExecutionTime: 0,
      avgSessionDuration: 0,
      successRate: 0,
      cacheHitRate: 0,
      avgParallelCalls: 0
    };
  }

  /**
   * 🧠 THINKING : Analyser la réponse du LLM
   */
  private async analyzeResponse(response: LLMResponse): Promise<ThinkingBlock> {
    const toolCalls = response.tool_calls || [];
    
    let content = '';
    
    if (toolCalls.length === 0) {
      content = "Le LLM a décidé de fournir une réponse finale sans utiliser d'outils.";
    } else {
      const toolNames = toolCalls.map(tc => tc.function.name).join(', ');
      const strategy = this.categorizeToolCalls(this.convertToolCalls(toolCalls));
      
      content = `Le LLM a demandé ${toolCalls.length} outil(s) : ${toolNames}.\n\n`;
      
      if (strategy.parallel.length > 0) {
        content += `✅ ${strategy.parallel.length} appel(s) peuvent être exécutés en parallèle pour optimiser la performance.\n`;
      }
      
      if (strategy.sequential.length > 0) {
        content += `⏭️ ${strategy.sequential.length} appel(s) doivent être exécutés séquentiellement car ils ont des dépendances.\n`;
      }
    }
    
    const thinking: ThinkingBlock = {
      type: 'thinking',
      content,
      timestamp: new Date().toISOString()
    };
    
    this.thinkingBlocks.push(thinking);
    
    if (this.config.streamThinking) {
      logger.dev(`[AgenticOrchestrator] 🧠 ${content}`);
    }
    
    return thinking;
  }

  /**
   * 🔀 PARALLÉLISATION : Catégoriser les tool calls
   */
  private categorizeToolCalls(toolCalls: ToolCall[]): ToolCallStrategy {
    if (!this.config.enableParallelization) {
      // Si parallélisation désactivée, tout en séquentiel
      return { parallel: [], sequential: toolCalls };
    }
    
    const parallel: ToolCall[] = [];
    const sequential: ToolCall[] = [];
    
    for (const tc of toolCalls) {
      const metadata = this.getToolMetadata(tc.function.name);
      
      if (metadata.parallelizable) {
        parallel.push(tc);
      } else {
        sequential.push(tc);
      }
    }
    
    // Trier par priorité (1 = haute priorité d'abord)
    parallel.sort((a, b) => {
      const prioA = this.getToolMetadata(a.function.name).priority || 5;
      const prioB = this.getToolMetadata(b.function.name).priority || 5;
      return prioA - prioB;
    });
    
    sequential.sort((a, b) => {
      const prioA = this.getToolMetadata(a.function.name).priority || 5;
      const prioB = this.getToolMetadata(b.function.name).priority || 5;
      return prioA - prioB;
    });
    
    return { parallel, sequential };
  }

  /**
   * Récupérer les métadonnées d'un outil avec auto-détection
   */
  private getToolMetadata(toolName: string): ToolMetadata {
    // 1. Chercher dans le registry explicite
    if (TOOL_REGISTRY[toolName]) {
      return TOOL_REGISTRY[toolName];
    }
    
    // 2. ✅ NOUVEAU : Auto-détection par convention de nommage
    const nameLower = toolName.toLowerCase();
    
    // READ operations (parallélisables)
    if (nameLower.startsWith('get') || nameLower.startsWith('list') || nameLower.startsWith('fetch')) {
      logger.dev(`[AgenticOrchestrator] 🔍 Auto-détecté comme READ: ${toolName}`);
      return {
        name: toolName,
        category: ToolCategory.READ,
        parallelizable: true,
        cacheable: true,
        timeout: 5000,
        priority: 2
      };
    }
    
    // SEARCH operations (parallélisables)
    if (nameLower.startsWith('search') || nameLower.startsWith('find') || nameLower.startsWith('query')) {
      logger.dev(`[AgenticOrchestrator] 🔍 Auto-détecté comme SEARCH: ${toolName}`);
      return {
        name: toolName,
        category: ToolCategory.SEARCH,
        parallelizable: true,
        cacheable: true,
        timeout: 10000,
        priority: 1
      };
    }
    
    // WRITE operations (séquentiels)
    if (nameLower.startsWith('create') || nameLower.startsWith('update') || 
        nameLower.startsWith('delete') || nameLower.startsWith('insert') ||
        nameLower.startsWith('modify') || nameLower.startsWith('remove')) {
      logger.dev(`[AgenticOrchestrator] 🔍 Auto-détecté comme WRITE: ${toolName}`);
      return {
        name: toolName,
        category: ToolCategory.WRITE,
        parallelizable: false,
        cacheable: false,
        timeout: 10000,
        priority: 1
      };
    }
    
    // 3. Default: séquentiel pour sécurité
    logger.warn(`[AgenticOrchestrator] ⚠️ Tool ${toolName} non reconnu, traité comme UNKNOWN (séquentiel)`);
    return {
      name: toolName,
      category: ToolCategory.UNKNOWN,
      parallelizable: false, // Par défaut, séquentiel pour la sécurité
      cacheable: false,
      timeout: this.config.toolTimeout,
      priority: 5
    };
  }

  /**
   * 🔁 RETRY : Exécuter un tool avec retry intelligent
   */
  private async executeWithRetry(
    toolCall: ToolCall,
    userToken: string,
    sessionId: string,
    retryCount = 0
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const metadata = this.getToolMetadata(toolCall.function.name);
    
    try {
      this.emitProgress('started', toolCall.function.name);
      
      // Vérifier le cache
      if (this.config.enableCache && metadata.cacheable) {
        const cacheKey = this.getCacheKey(toolCall);
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
          logger.dev(`[AgenticOrchestrator] 💾 Cache hit: ${toolCall.function.name}`);
          this.emitProgress('completed', toolCall.function.name);
          this.updateMetrics('cache_hit');
          return cached.result;
        }
      }
      
      // Exécuter le tool avec timeout
      const timeout = metadata.timeout || this.config.toolTimeout;
      const resultPromise = this.toolExecutor.executeSimple([toolCall], userToken);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout après ${timeout}ms`)), timeout!)
      );
      
      const results = await Promise.race([resultPromise, timeoutPromise]);
      const result = results[0];
      
      const duration = Date.now() - startTime;
      this.updateMetrics('tool_execution', duration);
      
      if (result.success) {
        this.emitProgress('completed', toolCall.function.name);
        this.metrics.successfulToolCalls++;
        
        // Mettre en cache si applicable
        if (this.config.enableCache && metadata.cacheable) {
          const cacheKey = this.getCacheKey(toolCall);
          this.setInCache(cacheKey, toolCall.function.name, result);
        }
        
        return result;
      }
      
      // ❌ Échec, tenter un retry
      if (retryCount < (this.config.retryStrategy?.maxRetries || 3)) {
        logger.warn(`[AgenticOrchestrator] ⚠️ Tool ${toolCall.function.name} failed, retrying (${retryCount + 1}/${this.config.retryStrategy?.maxRetries})`);
        this.metrics.totalRetries++;
        
        // Backoff
        const delay = this.calculateBackoff(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeWithRetry(toolCall, userToken, sessionId, retryCount + 1);
      }
      
      // ❌ Max retries atteint, tenter un fallback
      const fallbackTool = this.config.retryStrategy?.fallbackTools?.[toolCall.function.name] || metadata.fallbacks?.[0];
      if (fallbackTool) {
        logger.warn(`[AgenticOrchestrator] 🔄 Using fallback tool: ${fallbackTool}`);
        this.metrics.totalFallbacks++;
        
        const fallbackCall: ToolCall = {
          ...toolCall,
          function: {
            ...toolCall.function,
            name: fallbackTool
          }
        };
        
        return this.executeWithRetry(fallbackCall, userToken, sessionId, 0);
      }
      
      // ❌ Aucun fallback, retourner l'erreur
      this.emitProgress('failed', toolCall.function.name);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics('tool_execution', duration);
      
      logger.error(`[AgenticOrchestrator] ❌ Error executing ${toolCall.function.name}:`, error);
      
      // Retry si possible
      if (retryCount < (this.config.retryStrategy?.maxRetries || 3)) {
        this.metrics.totalRetries++;
        const delay = this.calculateBackoff(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(toolCall, userToken, sessionId, retryCount + 1);
      }
      
      this.emitProgress('failed', toolCall.function.name);
      
      return {
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }),
        success: false
      };
    }
  }

  /**
   * Calculer le délai de backoff
   */
  private calculateBackoff(retryCount: number): number {
    const strategy = this.config.retryStrategy;
    const initialDelay = strategy?.initialDelay || 1000;
    const maxDelay = strategy?.maxDelay || 10000;
    
    if (strategy?.backoff === 'exponential') {
      return Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);
    }
    
    // Linear
    return Math.min(initialDelay * (retryCount + 1), maxDelay);
  }

  /**
   * 💬 COMMUNICATION : Émettre une mise à jour de progression
   */
  private emitProgress(status: 'started' | 'completed' | 'failed', tool: string): void {
    const update: ProgressUpdate = {
      type: 'progress',
      action: status === 'started' ? `Exécution de ${tool}...` 
            : status === 'completed' ? `✅ ${tool} terminé`
            : `❌ ${tool} a échoué`,
      tool,
      status,
      timestamp: new Date().toISOString()
    };
    
    this.progressUpdates.push(update);
    
    if (this.config.streamProgress) {
      logger.dev(`[AgenticOrchestrator] 📝 ${update.action}`);
    }
  }

  /**
   * 💾 Gestion du cache
   */
  private getCacheKey(toolCall: ToolCall): string {
    return `${toolCall.function.name}:${toolCall.function.arguments}`;
  }

  private getFromCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Vérifier le TTL
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry;
  }

  private setInCache(key: string, toolName: string, result: ToolResult): void {
    const entry: CacheEntry = {
      key,
      toolName,
      result,
      createdAt: new Date().toISOString(),
      ttl: 300, // 5 minutes
      hits: 0
    };
    
    this.cache.set(key, entry);
    
    // Limiter la taille du cache (max 1000 entrées)
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 📊 Mettre à jour les métriques
   */
  private updateMetrics(type: 'tool_execution' | 'session' | 'cache_hit', value?: number): void {
    if (type === 'tool_execution' && value !== undefined) {
      this.metrics.totalToolCalls++;
      this.metrics.avgToolExecutionTime = 
        (this.metrics.avgToolExecutionTime * (this.metrics.totalToolCalls - 1) + value) / 
        this.metrics.totalToolCalls;
    } else if (type === 'session' && value !== undefined) {
      this.metrics.totalSessions++;
      this.metrics.avgSessionDuration = 
        (this.metrics.avgSessionDuration * (this.metrics.totalSessions - 1) + value) / 
        this.metrics.totalSessions;
    } else if (type === 'cache_hit') {
      const totalCalls = this.metrics.totalToolCalls + 1; // +1 car pas encore comptabilisé
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate * this.metrics.totalToolCalls + 100) / totalCalls;
    }
    
    // Calculer le taux de succès
    if (this.metrics.totalToolCalls > 0) {
      this.metrics.successRate = (this.metrics.successfulToolCalls / this.metrics.totalToolCalls) * 100;
    }
  }

  /**
   * 🚀 MAIN : Traiter un message avec la stratégie agentique complète
   */
  async processMessage(
    message: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<AgenticResponse> {
    const sessionStart = Date.now();
    const maxToolCalls = context.maxToolCalls ?? 10;
    let toolCallsCount = 0;
    
    // Reset des états
    this.thinkingBlocks = [];
    this.progressUpdates = [];
    
    logger.info(`[AgenticOrchestrator] 💬 Starting session s=${context.sessionId}`, {
      agentModel: context.agentConfig?.model || 'default',
      agentName: context.agentConfig?.name || 'default',
      maxToolCalls
    });
    
    const llmProvider = this.createProviderFromAgent(context.agentConfig);
    
    let currentMessage = message;
    let updatedHistory = [...history];
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let isFirstPass = true;
    
    // ✅ Compteurs pour éviter les boucles infinies
    const previousHistoryPatterns: string[] = [];

    try {
      while (toolCallsCount < maxToolCalls) {
        // 1️⃣ Appeler le LLM
        logger.info(`[AgenticOrchestrator] 🤖 LLM call (iteration ${toolCallsCount + 1}/${maxToolCalls})`);
        
        let response: LLMResponse;
        try {
          // ✅ Utiliser le circuit breaker global pour Groq
          response = await groqCircuitBreaker.execute(async () => {
            return await this.callLLM(currentMessage, updatedHistory, context, 'auto', llmProvider);
          });
          
        } catch (llmError) {
          const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);
          logger.error(`[AgenticOrchestrator] ❌ LLM error:`, errorMessage);
          
          // 🔧 Parser l'erreur Groq pour donner des détails au LLM
          const parsedError = this.parseGroqError(errorMessage);
          
          // ✅ NOUVEAU : Identifier le type d'erreur
          const isServerError = errorMessage.includes('500') || 
                               errorMessage.includes('502') || 
                               errorMessage.includes('503') ||
                               errorMessage.includes('Internal Server Error');
          
          const isFatalError = errorMessage.includes('401') || 
                              errorMessage.includes('403') || 
                              errorMessage.includes('API key') ||
                              errorMessage.includes('Configuration');
          
          const isRateLimitError = errorMessage.includes('429') || 
                                  errorMessage.includes('rate limit');
          
          // ❌ Erreurs fatales : Abandon immédiat
          if (isFatalError) {
            logger.error(`[AgenticOrchestrator] 💀 Erreur fatale détectée, abandon`);
            throw llmError;
          }
          
          // 🚨 Gestion erreurs serveur avec circuit breaker
          if (isServerError) {
            // Le circuit breaker gérera automatiquement les erreurs répétées
            logger.warn(`[AgenticOrchestrator] ⚠️ Erreur serveur Groq détectée (géré par circuit breaker)`);
            
            // Vérifier l'état du circuit breaker
            if (groqCircuitBreaker.isOpen()) {
              logger.error(`[AgenticOrchestrator] 🔴 Circuit breaker OPEN pour Groq`);
              
              // Retourner fallback immédiat
              const sessionDuration = Date.now() - sessionStart;
              return {
                success: true,
                content: "Le service d'IA est temporairement indisponible en raison d'un trop grand nombre d'erreurs. Le système se rétablira automatiquement dans quelques instants. Veuillez réessayer.",
                toolCalls: allToolCalls,
                toolResults: allToolResults,
                thinking: this.thinkingBlocks,
                progress: this.progressUpdates,
                reasoning: 'Circuit breaker Groq OPEN - Service temporairement indisponible',
                metadata: {
                  iterations: toolCallsCount,
                  duration: sessionDuration,
                  retries: this.metrics.totalRetries,
                  parallelCalls: 0,
                  sequentialCalls: 0,
                  circuitBreakerOpen: true,
                  isGroqFallback: true
                }
              };
            }
            
            // Backoff simple
            await new Promise(resolve => setTimeout(resolve, 2000));
            toolCallsCount++;
            currentMessage = '';
            continue;
          }
          
          // 🔄 Gestion spéciale rate limit
          if (isRateLimitError) {
            logger.error(`[AgenticOrchestrator] 🚫 Rate limit atteint, abandon`);
            throw new Error('Rate limit Groq atteint. Veuillez réessayer dans quelques minutes.');
          }
          
          // ✅ AMÉLIORATION : Pour les autres erreurs (400, validation, etc.)
          // Le LLM peut apprendre et corriger → Ajouter à l'historique
          
          // Injecter l'erreur détaillée et demander une correction
          if (isFirstPass) {
            // Première passe : Ajouter le message utilisateur d'abord
            updatedHistory.push({
              id: `msg-user-${Date.now()}`,
              role: 'user',
              content: message,
              timestamp: new Date().toISOString()
            });
            isFirstPass = false;
          }
          
          updatedHistory.push({
            id: `msg-error-${Date.now()}`,
            role: 'system',
            content: parsedError.helpfulMessage,
            timestamp: new Date().toISOString()
          });
          
          toolCallsCount++;
          logger.warn(`[AgenticOrchestrator] 🔁 Retry après erreur LLM (${toolCallsCount}/${maxToolCalls})`);
          
          // Vider currentMessage pour forcer l'utilisation de l'historique
          currentMessage = '';
          continue;
        }
        
        const newToolCalls = this.convertToolCalls(response.tool_calls || []);
        
        // ✅ NOUVEAU : Détection de boucle infinie (pattern répété)
        if (newToolCalls.length > 0) {
          const toolPattern = newToolCalls.map(tc => tc.function.name).sort().join('|');
          const patternCount = previousHistoryPatterns.filter(p => p === toolPattern).length;
          
          if (patternCount >= 2) {
            logger.error(`[AgenticOrchestrator] 🔁 BOUCLE INFINIE détectée: même pattern 3x`, {
              pattern: toolPattern,
              occurrences: patternCount + 1,
              toolCalls: newToolCalls.map(tc => tc.function.name)
            });
            
            // Forcer une réponse finale
            const finalResponse = await this.callLLM(
              "Tu es dans une boucle : tu as demandé ces mêmes outils plusieurs fois. STOP et donne ta réponse finale maintenant avec ce que tu as déjà.",
              updatedHistory,
              context,
              'none', // ✅ Désactiver les tools pour forcer la réponse
              llmProvider
            );
            
            const sessionDuration = Date.now() - sessionStart;
            return {
              success: true,
              content: finalResponse.content || "Je n'ai pas pu traiter complètement votre demande en raison d'une boucle de traitement. Voici ce que j'ai pu faire.",
              toolCalls: allToolCalls,
              toolResults: allToolResults,
              thinking: this.thinkingBlocks,
              progress: this.progressUpdates,
              reasoning: `Boucle infinie détectée (pattern répété ${patternCount + 1}x). Arrêt forcé.`,
              metadata: {
                iterations: toolCallsCount,
                duration: sessionDuration,
                retries: this.metrics.totalRetries,
                parallelCalls: 0,
                sequentialCalls: 0,
                infiniteLoopDetected: true,
                loopPattern: toolPattern
              }
            };
          }
          
          previousHistoryPatterns.push(toolPattern);
          if (previousHistoryPatterns.length > 10) {
            previousHistoryPatterns.shift(); // Garder seulement les 10 derniers
          }
        }
        
        // ✅ Terminé ?
        if (newToolCalls.length === 0) {
          logger.info(`[AgenticOrchestrator] ✅ LLM finished`);
          
          const sessionDuration = Date.now() - sessionStart;
          this.updateMetrics('session', sessionDuration);
          
          // 📊 Calculer les métriques finales de duplication
          const toolCallsByName = allToolCalls.reduce((acc, tc) => {
            const name = tc.function.name;
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const duplicatesDetected = Object.entries(toolCallsByName)
            .filter(([_, count]) => count > 1)
            .map(([name, count]) => ({ tool: name, count }));
          
          logger.info(`[AgenticOrchestrator] 🏁 Session terminée:`, {
            iterations: toolCallsCount,
            duration: sessionDuration,
            totalToolCalls: allToolCalls.length,
            uniqueToolNames: Object.keys(toolCallsByName).length,
            duplicatesDetected: duplicatesDetected.length > 0 ? duplicatesDetected : 'Aucun',
            retries: this.metrics.totalRetries
          });
          
          // ✅ FIX BUG O(n²) : Calculer une seule fois au lieu de filtrer pour chaque result
          const finalStrategy = this.categorizeToolCalls(allToolCalls);
          
          return {
            success: true,
            content: response.content,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            thinking: this.thinkingBlocks,
            progress: this.progressUpdates,
            reasoning: response.reasoning,
            metadata: {
              iterations: toolCallsCount,
              duration: sessionDuration,
              retries: this.metrics.totalRetries,
              parallelCalls: finalStrategy.parallel.length,
              sequentialCalls: finalStrategy.sequential.length,
              duplicatesDetected: duplicatesDetected.length
            }
          };
        }
        
        // 2️⃣ 🧠 THINKING : Analyser la stratégie
        await this.analyzeResponse(response);
        
        // 3️⃣ Déduplication
        const dedupedToolCalls = this.deduplicateToolCalls(newToolCalls, allToolCalls);
        
        if (dedupedToolCalls.length === 0) {
          logger.warn(`[AgenticOrchestrator] ⚠️ All tools are duplicates - ${newToolCalls.length} tool(s) filtered`, {
            attemptedTools: newToolCalls.map(tc => ({
              name: tc.function.name,
              args: tc.function.arguments.substring(0, 100)
            })),
            totalPreviousTools: allToolCalls.length
          });
          
          const finalResponse = await this.callLLM(
            "Tu as déjà appelé ces outils. Donne ta réponse finale basée sur les résultats précédents.",
            updatedHistory,
            context,
            'auto',
            llmProvider
          );
          
          const sessionDuration = Date.now() - sessionStart;
          this.updateMetrics('session', sessionDuration);
          
          return {
            success: true,
            content: finalResponse.content,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            thinking: this.thinkingBlocks,
            progress: this.progressUpdates,
            reasoning: finalResponse.reasoning,
            metadata: {
              iterations: toolCallsCount,
              duration: sessionDuration,
              retries: this.metrics.totalRetries,
              parallelCalls: 0,
              sequentialCalls: 0
            }
          };
        }
        
        // 4️⃣ 🔀 PARALLÉLISATION : Catégoriser les outils
        const strategy = this.categorizeToolCalls(dedupedToolCalls);
        logger.info(`[AgenticOrchestrator] 🔀 Strategy: ${strategy.parallel.length} parallel, ${strategy.sequential.length} sequential`, {
          parallel: strategy.parallel.map(tc => tc.function.name),
          sequential: strategy.sequential.map(tc => tc.function.name),
          dedupedCount: dedupedToolCalls.length,
          originalCount: newToolCalls.length,
          filteredCount: newToolCalls.length - dedupedToolCalls.length
        });
        
        // 5️⃣ ⚡ Exécuter en parallèle
        const parallelResults = await Promise.allSettled(
          strategy.parallel.map(tc => 
            this.executeWithRetry(tc, context.userToken, context.sessionId)
          )
        );
        
        const parallelToolResults = parallelResults.map((result, idx) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            logger.error(`[AgenticOrchestrator] ❌ Parallel tool failed:`, result.reason);
            return {
              tool_call_id: strategy.parallel[idx].id,
              name: strategy.parallel[idx].function.name,
              content: JSON.stringify({ error: String(result.reason) }),
              success: false
            };
          }
        });
        
        // 6️⃣ 📝 Exécuter en séquentiel avec court-circuit sur échec critique
        const sequentialToolResults: ToolResult[] = [];
        for (const tc of strategy.sequential) {
          const result = await this.executeWithRetry(tc, context.userToken, context.sessionId);
          sequentialToolResults.push(result);
          
          // ✅ NOUVEAU : Court-circuit si échec critique sur un tool WRITE/DATABASE
          if (!result.success && this.isCriticalTool(tc.function.name)) {
            logger.error(`[AgenticOrchestrator] ❌ Critical tool failed: ${tc.function.name}, aborting sequence`, {
              remaining: strategy.sequential.length - sequentialToolResults.length,
              failedTool: tc.function.name
            });
            
            // Ajouter des résultats d'erreur pour les tools restants (pour maintenir la correspondance)
            const remainingTools = strategy.sequential.slice(sequentialToolResults.length);
            for (const remainingTc of remainingTools) {
              sequentialToolResults.push({
                tool_call_id: remainingTc.id,
                name: remainingTc.function.name,
                content: JSON.stringify({ 
                  error: `Skipped due to previous critical failure: ${tc.function.name}`,
                  skipped: true 
                }),
                success: false
              });
            }
            
            break; // ✅ Sortir de la boucle
          }
        }
        
        // 7️⃣ 🔧 CORRECTION CRITIQUE : Réordonner les résultats pour correspondre à l'ordre des tool_calls
        // Créer un mapping tool_call_id → result
        const resultsMap = new Map<string, ToolResult>();
        [...parallelToolResults, ...sequentialToolResults].forEach(r => {
          resultsMap.set(r.tool_call_id, r);
        });
        
        // Réordonner selon l'ordre exact des dedupedToolCalls
        const toolResults = dedupedToolCalls.map(tc => {
          const result = resultsMap.get(tc.id);
          if (!result) {
            logger.error(`[AgenticOrchestrator] ❌ Result manquant pour tool call ${tc.id} (${tc.function.name})`);
            // Créer un résultat d'erreur de fallback
            return {
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify({ 
                error: 'Tool result not found in results map',
                tool_call_id: tc.id 
              }),
              success: false
            };
          }
          return result;
        });
        
        logger.dev(`[AgenticOrchestrator] ✅ Tool results réordonnés : ${toolResults.length} résultats dans l'ordre des tool_calls`);
        
        allToolCalls.push(...dedupedToolCalls);
        allToolResults.push(...toolResults);
        
        // 8️⃣ 💬 Log du résumé détaillé
        const successCount = toolResults.filter(r => r.success).length;
        const failedCount = toolResults.filter(r => !r.success).length;
        const duplicateErrors = toolResults.filter(r => 
          !r.success && r.content?.includes?.('déjà exécuté')
        ).length;
        
        logger.info(`[AgenticOrchestrator] 📊 Iteration ${toolCallsCount} Results:`, {
          success: successCount,
          failed: failedCount,
          duplicates: duplicateErrors,
          totalToolCalls: allToolCalls.length,
          totalResults: allToolResults.length,
          tools: toolResults.map(r => ({
            name: r.name,
            success: r.success,
            isDuplicate: !r.success && r.content?.includes?.('déjà exécuté')
          }))
        });
        
        // 9️⃣ Injecter dans l'historique
        const historyContext = {
          systemContent: '',
          userMessage: isFirstPass ? message : '',
          cleanedHistory: updatedHistory,
          toolCalls: dedupedToolCalls,
          toolResults: toolResults.map(r => ({ 
            ...r, 
            timestamp: r.timestamp || new Date().toISOString() // ✅ CORRECTION: Préserver le timestamp original
          }))
        };
        
        const historyResult = this.historyBuilder.buildSecondCallHistory(historyContext);
        updatedHistory = historyResult.messages;
        
        toolCallsCount++;
        currentMessage = '';
        isFirstPass = false;
      }
      
      // 🔟 Max iterations
      logger.warn(`[AgenticOrchestrator] ⚠️ Max iterations (${maxToolCalls}) reached`);
      const finalResponse = await this.callLLM(
        "Maximum d'itérations atteint. Donne ta réponse finale basée sur ce que tu as accompli.",
        updatedHistory,
        context,
        'auto',
        llmProvider
      );
      
      const sessionDuration = Date.now() - sessionStart;
      this.updateMetrics('session', sessionDuration);
      
      // Calculer les métriques finales
      const finalStrategy = this.categorizeToolCalls(allToolCalls);
      
      return {
        success: true,
        content: finalResponse.content,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        thinking: this.thinkingBlocks,
        progress: this.progressUpdates,
        reasoning: finalResponse.reasoning,
        metadata: {
          iterations: toolCallsCount,
          duration: sessionDuration,
          retries: this.metrics.totalRetries,
          parallelCalls: finalStrategy.parallel.length,
          sequentialCalls: finalStrategy.sequential.length
        }
      };
      
    } catch (error) {
      logger.error(`[AgenticOrchestrator] ❌ Fatal error:`, error);
      
      const sessionDuration = Date.now() - sessionStart;
      this.updateMetrics('session', sessionDuration);
      
      return {
        success: false,
        content: `Erreur lors du traitement: ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        thinking: this.thinkingBlocks,
        progress: this.progressUpdates,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          iterations: toolCallsCount,
          duration: sessionDuration,
          retries: this.metrics.totalRetries,
          parallelCalls: 0,
          sequentialCalls: 0
        }
      };
    }
  }

  /**
   * Créer un provider Groq avec la config de l'agent
   */
  private createProviderFromAgent(agentConfig?: AgentTemplateConfig): GroqProvider {
    const customConfig = agentConfig ? {
      model: agentConfig.model || 'openai/gpt-oss-20b',
      temperature: agentConfig.temperature || 0.7,
      maxTokens: agentConfig.max_completion_tokens || agentConfig.max_tokens || 8000,
      topP: agentConfig.top_p || 0.9,
      reasoningEffort: agentConfig.reasoning_effort || 'high'
    } : {};

    logger.dev(`[AgenticOrchestrator] 🎯 Creating provider with config:`, {
      model: customConfig.model || 'default',
      temperature: customConfig.temperature || 'default',
      maxTokens: customConfig.maxTokens || 'default'
    });

    return new GroqProvider(customConfig);
  }

  /**
   * Appeler le LLM
   */
  private async callLLM(
    message: string,
    history: ChatMessage[],
    context: ChatContext,
    toolChoice: 'auto' | 'none' = 'auto',
    llmProvider: GroqProvider
  ): Promise<LLMResponse> {
    const { agentConfig, uiContext } = context;
    let systemMessageContent: string = 'You are a helpful AI assistant.';
    
    if (agentConfig) {
      try {
        const renderedTemplate = uiContext 
          ? await agentTemplateService.renderAgentTemplateWithUIContext(agentConfig, uiContext)
          : agentTemplateService.renderAgentTemplate(agentConfig);
        systemMessageContent = renderedTemplate.content;
      } catch (error) {
        logger.error(`[AgenticOrchestrator] ❌ Template rendering error:`, error);
        systemMessageContent = agentConfig.system_instructions || systemMessageContent;
      }
    }
    
    // Construire l'historique
    let messages: ChatMessage[];
    
    const hasToolCalls = history.some(msg => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0);
    
    if (hasToolCalls) {
      const historyContext = {
        systemContent: systemMessageContent,
        userMessage: message,
        cleanedHistory: history,
        toolCalls: [],
        toolResults: []
      };
      
      const historyResult = this.historyBuilder.buildSecondCallHistory(historyContext);
      messages = historyResult.messages;
    } else {
      messages = this.historyBuilder.buildInitialHistory(
        systemMessageContent,
        message,
        history
      );
    }

    // Construire les tools
    const openApiTools = await getOpenAPIV2Tools();
    
    const tools = await mcpConfigService.buildHybridTools(
      agentConfig?.id || 'default',
      context.userToken,
      openApiTools
    );
    
    const mcpCount = tools.filter(t => t.type === 'mcp').length;
    const openapiCount = tools.filter(t => t.type === 'function').length;
    
    if (mcpCount > 0) {
      logger.dev(`[AgenticOrchestrator] 🔀 Hybrid mode: ${mcpCount} MCP + ${openapiCount} OpenAPI`);
    } else {
      logger.dev(`[AgenticOrchestrator] 📦 OpenAPI mode: ${openapiCount} tools`);
    }

    return llmProvider.callWithMessages(messages, tools);
  }

  /**
   * Dédupliquer les tool calls avec logging avancé
   */
  private deduplicateToolCalls(newToolCalls: ToolCall[], allPreviousToolCalls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    const seenByName = new Map<string, number>(); // Compteur par nom de tool
    
    logger.info(`[AgenticOrchestrator] 🔍 Déduplication : ${newToolCalls.length} nouveaux vs ${allPreviousToolCalls.length} précédents`);
    
    // Ajouter tous les appels précédents avec compteurs
    for (const prevCall of allPreviousToolCalls) {
      const key = this.getToolCallKey(prevCall);
      seen.add(key);
      
      const toolName = prevCall.function.name;
      seenByName.set(toolName, (seenByName.get(toolName) || 0) + 1);
      
      logger.dev(`[AgenticOrchestrator] 📝 Previous: ${toolName} | Key: ${key.substring(0, 80)}${key.length > 80 ? '...' : ''}`);
    }
    
    // Log des stats avant déduplication
    if (allPreviousToolCalls.length > 0) {
      logger.dev(`[AgenticOrchestrator] 📊 Previous tools by name:`, Object.fromEntries(seenByName));
    }
    
    // Filtrer les nouveaux appels
    const duplicateDetails: Array<{tool: string; reason: string; key: string}> = [];
    const deduped = newToolCalls.filter(call => {
      const key = this.getToolCallKey(call);
      const isDuplicate = seen.has(key);
      
      if (isDuplicate) {
        duplicateDetails.push({
          tool: call.function.name,
          reason: 'exact_match',
          key: key.substring(0, 100)
        });
        
        logger.warn(`[AgenticOrchestrator] 🔁 DUPLICATE DETECTED:`, {
          tool: call.function.name,
          id: call.id,
          key: key.substring(0, 100) + '...',
          arguments: call.function.arguments.substring(0, 150) + '...',
          matchedAgainst: 'previous_tool_calls'
        });
      } else {
        logger.dev(`[AgenticOrchestrator] ✅ New tool: ${call.function.name} | Key: ${key.substring(0, 80)}${key.length > 80 ? '...' : ''}`);
      }
      
      if (!isDuplicate) {
        seen.add(key);
      }
      
      return !isDuplicate;
    });
    
    const duplicateCount = newToolCalls.length - deduped.length;
    if (duplicateCount > 0) {
      logger.warn(`[AgenticOrchestrator] 🚨 DUPLICATION REPORT:`, {
        original: newToolCalls.length,
        deduped: deduped.length,
        filtered: duplicateCount,
        duplicatesByTool: duplicateDetails.reduce((acc, d) => {
          acc[d.tool] = (acc[d.tool] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        details: duplicateDetails
      });
    } else {
      logger.info(`[AgenticOrchestrator] ✅ Déduplication: ${newToolCalls.length} tools, 0 doublons`);
    }
    
    return deduped;
  }

  /**
   * Générer une clé unique pour un tool call avec normalisation robuste
   */
  private getToolCallKey(toolCall: ToolCall): string {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      
      // ✅ Supprimer les champs dynamiques
      const staticArgs = this.removeDynamicFields(args);
      
      // ✅ Normaliser récursivement
      const normalizedArgs = this.normalizeObject(staticArgs);
      
      return `${toolCall.function.name}:${normalizedArgs}`;
    } catch (error) {
      // ✅ AMÉLIORATION: Fallback plus robuste avec hash du contenu
      logger.warn(`[AgenticOrchestrator] ⚠️ Failed to parse tool call arguments, using hash:`, error);
      
      // Utiliser un hash simple du contenu brut pour éviter les faux positifs
      const hash = this.simpleHash(toolCall.function.arguments);
      
      return `${toolCall.function.name}:hash_${hash}`;
    }
  }

  /**
   * Hash simple et rapide d'une chaîne
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 🔧 Normalise récursivement un objet pour la comparaison
   */
  private normalizeObject(obj: any): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    
    if (Array.isArray(obj)) {
      return `[${obj.map(item => this.normalizeObject(item)).join(',')}]`;
    }
    
    // Trier les clés et normaliser récursivement
    const sortedKeys = Object.keys(obj).sort();
    const normalized = sortedKeys.map(key => {
      return `"${key}":${this.normalizeObject(obj[key])}`;
    }).join(',');
    
    return `{${normalized}}`;
  }

  /**
   * 🔧 Supprime les champs dynamiques (timestamp, id, etc.)
   */
  private removeDynamicFields(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const dynamicFields = [
      'timestamp', 'id', '_id', 'created_at', 'updated_at', 
      'requestId', 'sessionId', 'traceId', 'operationId',
      'created', 'modified', 'time', 'date'
    ];
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeDynamicFields(item));
    }
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!dynamicFields.includes(key)) {
        cleaned[key] = this.removeDynamicFields(value);
      }
    }
    
    return cleaned;
  }

  /**
   * Convertir les tool_calls du LLM en format ToolCall[]
   */
  private convertToolCalls(rawToolCalls: any[]): ToolCall[] {
    if (!Array.isArray(rawToolCalls) || rawToolCalls.length === 0) return [];

    return rawToolCalls
      .map((tc: any, idx: number) => {
        if (!tc.function?.name) {
          logger.warn(`[AgenticOrchestrator] ⚠️ Tool call ${idx} ignored: name missing`);
          return null;
        }

        const toolCall: ToolCall = {
          id: tc.id ?? `call-${Date.now()}-${idx}`,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: typeof tc.function.arguments === 'string' 
              ? tc.function.arguments 
              : JSON.stringify(tc.function.arguments ?? {})
          }
        };

        return toolCall;
      })
      .filter((tc): tc is ToolCall => tc !== null && tc.function.name.length > 0);
  }

  /**
   * 🔧 Parser les erreurs Groq pour donner des messages utiles au LLM
   */
  private parseGroqError(errorMessage: string): { helpfulMessage: string; toolName?: string } {
    // Erreur de validation de tool call
    if (errorMessage.includes('Tool call validation failed')) {
      try {
        // Extraire le nom du tool et les détails
        const toolNameMatch = errorMessage.match(/tool (\w+)/);
        const parametersMatch = errorMessage.match(/parameters for tool (\w+)/);
        const failedGenMatch = errorMessage.match(/"failed_generation":"(.+?)"/);
        
        const toolName = parametersMatch?.[1] || toolNameMatch?.[1] || 'unknown';
        const failedGen = failedGenMatch?.[1];
        
        let helpfulMessage = `⚠️ **Erreur de validation de tool call**

Le tool **${toolName}** a été appelé avec des paramètres invalides.

**Problème détecté** :
- Les paramètres ne correspondent pas au schéma attendu
${failedGen ? `- Génération échouée : ${failedGen.replace(/\\n/g, '\n').replace(/\\"/g, '"')}` : ''}

**Solution** :
1. Si le tool ne nécessite AUCUN paramètre, appelle-le sans arguments : \`{"name": "${toolName}", "arguments": "{}"}\`
2. Si le tool nécessite des paramètres, vérifie le schéma exact et fournis les bons champs
3. Si tu n'es pas sûr, essaye un autre tool ou demande plus d'informations

**Réessaye maintenant avec les bons paramètres.**`;
        
        return { helpfulMessage, toolName };
      } catch {
        // ✅ Fallback explicite si parsing échoue
        return {
          helpfulMessage: `⚠️ **Erreur de validation de tool call**\n\nLe format de l'erreur n'a pas pu être parsé. Réessaye avec des paramètres simplifiés ou utilise un autre tool.`,
          toolName: undefined
        };
      }
    }
    
    // Erreur 400 générique
    if (errorMessage.includes('400')) {
      return {
        helpfulMessage: `⚠️ **Erreur API (400 Bad Request)**

La requête envoyée à l'API est invalide.

**Cause probable** :
- Tool call mal formé
- Paramètres manquants ou invalides
- Schéma non respecté

**Solution** :
Réessaye en simplifiant ton approche :
1. Utilise moins de tools à la fois
2. Vérifie que les paramètres sont corrects
3. Ou demande plus d'informations à l'utilisateur

**Réessaye maintenant.**`
      };
    }
    
    // Erreur 424 (Failed Dependency)
    if (errorMessage.includes('424')) {
      return {
        helpfulMessage: `⚠️ **Erreur de dépendance (424)**

Un service externe requis est temporairement indisponible.

**Solution** :
1. Réessaye dans quelques secondes
2. Ou utilise un tool alternatif si disponible

**Réessaye maintenant.**`
      };
    }
    
    // Erreur 500
    if (errorMessage.includes('500')) {
      return {
        helpfulMessage: `⚠️ **Erreur serveur (500)**

Le serveur a rencontré une erreur interne.

**Solution** :
1. Réessaye immédiatement
2. Si l'erreur persiste, simplifie ton approche
3. Ou utilise un tool alternatif

**Réessaye maintenant.**`
      };
    }
    
    // Erreur générique
    return {
      helpfulMessage: `⚠️ **Erreur lors de l'appel LLM**

Détails : ${errorMessage}

**Solution** :
Réessaye avec une approche plus simple :
- Utilise moins de tools à la fois
- Divise ta tâche en étapes plus petites
- Ou demande plus d'informations

**Réessaye maintenant.**`
    };
  }

  /**
   * Récupérer les métriques actuelles
   */
  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  /**
   * Réinitialiser les métriques
   */
  resetMetrics(): void {
    this.metrics = this.initMetrics();
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * ✅ NOUVEAU : Vérifier si un tool est critique (échec = abort sequence)
   */
  private isCriticalTool(toolName: string): boolean {
    const metadata = this.getToolMetadata(toolName);
    return metadata.category === ToolCategory.WRITE || 
           metadata.category === ToolCategory.DATABASE ||
           metadata.category === ToolCategory.AGENT;
  }
}

// Instance singleton
export const agenticOrchestrator = new AgenticOrchestrator();

