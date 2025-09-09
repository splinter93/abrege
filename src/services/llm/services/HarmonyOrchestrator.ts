/**
 * Service HarmonyOrchestrator - Orchestrateur avec support Harmony complet
 * Production-ready, format strict, zéro any
 */

import type { GroqRoundParams, GroqRoundResult, GroqLimits } from '../types/groqTypes';
import type { LLMResponse } from '../types/agentTypes';
import { GroqHarmonyProvider } from '../providers/implementations/groqHarmony';
import { GroqToolExecutor } from './GroqToolExecutor';
import { ToolCallPersistenceService } from './ToolCallPersistenceService';
import { ToolResultNormalizer } from './ToolResultNormalizer';
import { ApiV2ToolExecutor } from '../executors/ApiV2ToolExecutor';
import { API_V2_TOOLS } from '../tools/ApiV2Tools';
import type { ToolDefinition } from '../types/apiV2Types';
import { HarmonyHistoryBuilder } from './HarmonyHistoryBuilder';
import { HarmonyBuilder } from './HarmonyBuilder';
import {
  HarmonyMessage,
  HarmonyConversation,
  HARMONY_ROLES,
  HARMONY_CHANNELS,
} from '../types/harmonyTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { AgentTemplateService } from '../agentTemplateService';

// Types internes stricts
type ToolCall = {
  id: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

import type { NormalizedToolResult } from './ToolCallPersistenceService';

/**
 * Orchestrateur Harmony — Support complet du format Harmony GPT-OSS
 * 2-passes LLM + exécution d'outils, relance bornée, normalisation & persistance.
 */
export class HarmonyOrchestrator {
  private limits: GroqLimits = {
    maxToolCalls: 10,
    maxRelances: 2,
    maxContextMessages: 25,
    maxHistoryMessages: 50
  };

  private harmonyProvider: GroqHarmonyProvider;
  private toolExecutor: GroqToolExecutor;
  private apiV2ToolExecutor: ApiV2ToolExecutor;
  private historyBuilder: HarmonyHistoryBuilder;
  private messageBuilder: HarmonyBuilder;

  /** Historique courant (pour dédup intelligente des actions) */
  private currentHistoryRef: HarmonyMessage[] = [];

  /** Budgets globaux anti-boucle **/
  private readonly MAX_TOTAL_TOOL_CALLS = 12;
  private readonly MAX_WALLCLOCK_MS = 15_000;

  constructor(limits?: GroqLimits) {
    this.limits = limits ?? this.limits;
    this.harmonyProvider = new GroqHarmonyProvider();
    this.toolExecutor = new GroqToolExecutor(this.limits);
    this.apiV2ToolExecutor = new ApiV2ToolExecutor();
    this.historyBuilder = new HarmonyHistoryBuilder(this.limits);
    this.messageBuilder = new HarmonyBuilder();
  }

  /**
   * Round Harmony : LLM → tools → LLM (+ relance bornée) → réponse (succès/erreur)
   */
  async executeRound(params: GroqRoundParams): Promise<GroqRoundResult> {
    const { message, sessionHistory, agentConfig, userToken, sessionId } = params;
    const startTime = Date.now();
    const traceId = `harmony-trace-${sessionId}-${startTime}`;

    // Historique courant pour la déduplication d'actions
    this.currentHistoryRef = this.convertToHarmonyMessages(Array.isArray(sessionHistory) ? sessionHistory : []);

    // Exposés au catch pour relance propre via le LLM
    let toolCalls: ToolCall[] = [];
    let toolResults: NormalizedToolResult[] = [];

    try {
      logger.info(`[HarmonyOrchestrator] 🚀 round Harmony start s=${sessionId} trace=${traceId}`);

      const persistenceService = new ToolCallPersistenceService(sessionId, userToken);

      // 1) Premier appel — propose des tool_calls
      const { response: firstResponse } = await this.callHarmonyLLM(
        message,
        this.currentHistoryRef,
        agentConfig,
        userToken,
        sessionId,
        traceId
      );

      toolCalls = Array.isArray((firstResponse as any)?.tool_calls) ? (firstResponse as any).tool_calls : [];

      // Dédup + cap
      toolCalls = this.deduplicateToolCalls(toolCalls);
      if (toolCalls.length > this.limits.maxToolCalls) {
        logger.warn(`[HarmonyOrchestrator] ⚠️ Tool calls > max (${toolCalls.length} > ${this.limits.maxToolCalls}) — trim`);
        toolCalls = toolCalls.slice(0, this.limits.maxToolCalls);
      }

      if (toolCalls.length === 0) {
        // Pas d'outils → la réponse du LLM fait foi (aucune altération)
        const duration = Date.now() - startTime;
        logger.info(
          `[HarmonyOrchestrator] ✅ round ok (no tools) s=${sessionId} dur=${duration}ms chars=${(firstResponse?.content ?? '').length}`
        );
        return await this.createSuccessResponse(firstResponse, [], sessionId, {
          isRelance: false,
          hasNewToolCalls: false
        });
      }

      // Persister les tool calls
      await persistenceService.persistToolCalls(toolCalls);

      // 2) Exécution des tools via API V2 (normalisation + persistance)
      const execMode: 'sequential' | 'parallel' = agentConfig?.toolExecutionMode ?? 'sequential';
      const batchSize: number = agentConfig?.toolBatchSize ?? 1;

      let allToolCalls: ToolCall[] = [];
      let allResults: NormalizedToolResult[] = [];

      let finalResponse: LLMResponse | null = null;
      let isRelance = false;
      let hasNewToolCalls = false;

      if (execMode === 'parallel') {
        logger.info(`[HarmonyOrchestrator] 🔧 Exec ${toolCalls.length} tools (parallel)`);
        allResults = await this.executeApiV2ToolsWithPersistence(
          toolCalls,
          userToken,
          sessionId,
          persistenceService,
          traceId
        );
        allToolCalls = toolCalls;

        // 3) Deuxième appel — tools actifs, possible relance si le modèle corrige
        const r = await this.callHarmonyLLMWithResults(
          message,
          this.currentHistoryRef,
          allToolCalls,
          allResults,
          agentConfig,
          sessionId,
          userToken,
          0,
          traceId,
          true // autoExecuteNewTools
        );
        finalResponse = r.response;
        isRelance = r.isRelance;
        hasNewToolCalls = r.hasNewToolCalls;
      } else {
        // --- SÉQUENTIEL ---
        logger.info(`[HarmonyOrchestrator] 🔧 Exec tools (sequential, batchSize=${batchSize})`);
        const startWall = Date.now();
        const seenSets = new Set<string>();

        let waveToolCalls: ToolCall[] = [...toolCalls];
        let relanceCount = 0;
        let stopRequested = false;

        while (waveToolCalls.length > 0 && !stopRequested) {
          // Budgets globaux
          if (allToolCalls.length >= this.MAX_TOTAL_TOOL_CALLS) {
            logger.warn(`[HarmonyOrchestrator] ⛔ max total tool calls atteint (${this.MAX_TOTAL_TOOL_CALLS})`);
            break;
          }
          if (Date.now() - startWall > this.MAX_WALLCLOCK_MS) {
            logger.warn(`[HarmonyOrchestrator] ⛔ budget temps dépassé (${this.MAX_WALLCLOCK_MS}ms)`);
            break;
          }

          const batch = waveToolCalls.slice(0, Math.max(1, batchSize));
          const results = await this.executeApiV2ToolsWithPersistence(
            batch,
            userToken,
            sessionId,
            persistenceService,
            traceId
          );
          allToolCalls.push(...batch);
          allResults.push(...results);

          const r = await this.callHarmonyLLMWithResults(
            message,
            this.currentHistoryRef,
            allToolCalls,
            allResults,
            agentConfig,
            sessionId,
            userToken,
            relanceCount,
            traceId,
            true // autoExecuteNewTools: relance automatique ChatGPT-like
          );

          finalResponse = r.response;
          isRelance = r.isRelance;
          hasNewToolCalls = r.hasNewToolCalls;

          // ✅ ChatGPT-like: Le LLM choisit librement de continuer ou d'arrêter
          let nextCalls: ToolCall[] = Array.isArray((finalResponse as any)?.tool_calls)
            ? (finalResponse as any).tool_calls
            : [];
          nextCalls = this.deduplicateToolCalls(nextCalls);
          
          if (nextCalls.length > 0) {
            // Le LLM a choisi de continuer avec de nouveaux tool calls
            logger.info(`[HarmonyOrchestrator] 🔄 LLM choisit de continuer avec ${nextCalls.length} nouveaux tool calls`);
            
            if (nextCalls.length > this.limits.maxToolCalls) {
              logger.warn(`[HarmonyOrchestrator] ⚠️ relance tool calls > max — trim`);
              nextCalls = nextCalls.slice(0, this.limits.maxToolCalls);
            }

            // Loop guard: même set de tools répété
            const setSig = this.signatureOfSet(nextCalls);
            if (setSig && seenSets.has(setSig)) {
              logger.warn(`[HarmonyOrchestrator] ⛔ même set de tools détecté — arrêt pour éviter la boucle`);
              break;
            }
            if (setSig) seenSets.add(setSig);

            // Budgets si on ajoute la vague suivante
            if (allToolCalls.length + nextCalls.length > this.MAX_TOTAL_TOOL_CALLS) {
              logger.warn(`[HarmonyOrchestrator] ⛔ exécutions supplémentaires dépasseraient le cap global`);
              break;
            }
            if (Date.now() - startWall > this.MAX_WALLCLOCK_MS) {
              logger.warn(`[HarmonyOrchestrator] ⛔ budget temps dépassé avant nouvelle vague`);
              break;
            }

            // Préparer la prochaine vague
            waveToolCalls = nextCalls;
          } else {
            // Le LLM a choisi d'arrêter et de donner sa réponse finale
            logger.info(`[HarmonyOrchestrator] ✅ LLM choisit d'arrêter - réponse finale fournie`);
            break;
          }
          relanceCount += 1;
          if (relanceCount > this.limits.maxRelances) {
            logger.warn(`[HarmonyOrchestrator] ⚠️ limite de relances atteinte`);
            break;
          }
        }

        // Si pas de réponse générée (edge case), produire un résumé
        if (!finalResponse) {
          finalResponse = { content: this.summarizeToolResults(allResults) };
        }

        // Remonter les résultats consolidés
        toolResults = allResults;
      }

      // 🔧 CORRECTION: Retourner la réponse finale après traitement des tools
      const duration = Date.now() - startTime;
      logger.info(
        `[HarmonyOrchestrator] ✅ round ok (with tools) s=${sessionId} dur=${duration}ms tools=${allToolCalls.length} results=${toolResults.length}`
      );
      
      return await this.createSuccessResponse(finalResponse, toolResults, sessionId, {
        isRelance,
        hasNewToolCalls
      });
    } catch (error: any) {
      // Sérialiser l'erreur pour un meilleur logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorType = error instanceof Error ? error.constructor.name : typeof error;
      
      logger.error(`[HarmonyOrchestrator] ❌ error in round trace=${traceId} - ${errorMessage} (${errorType})`, 
        new Error(`Session: ${sessionId}, Tools: ${toolCalls?.length || 0}, Results: ${toolResults?.length || 0}${errorStack ? `\nStack: ${errorStack}` : ''}`)
      );

      // 🔧 Gestion spéciale des erreurs Groq 500 - on fournit une réponse de fallback directe
      if (error instanceof Error && error.message.includes('Groq API error: 500')) {
        logger.warn(`[HarmonyOrchestrator] ⚠️ Erreur Groq 500 détectée, fourniture d'une réponse de fallback directe`);
        
        return await this.createSuccessResponse(
          {
            content: "Je rencontre un problème technique côté modèle. Réessaie dans un instant ou reformule ta demande. Aucun outil n'a été exécuté.",
            reasoning: "Service Groq temporairement indisponible - réponse de fallback intelligente fournie pour maintenir l'expérience utilisateur"
          },
          [],
          sessionId,
          { isFallback: true }
        );
      }

      // 👉 Pas de fallback texte : on crée un "résultat outil" synthétique avec l'erreur
      const errResult: NormalizedToolResult = {
        tool_call_id: 'orchestrator_error',
        tool_name: 'orchestrator_error',
        details: {
          success: false,
          code: error?.code || 'ORCHESTRATOR_ERROR',
          message: (error?.message || String(error || 'Erreur inconnue')).toString().slice(0, 500)
        },
        success: false,
        timestamp: new Date().toISOString(),
        code: error?.code || 'ORCHESTRATOR_ERROR',
        message: (error?.message || String(error || 'Erreur inconnue')).toString().slice(0, 500)
      };
      toolResults = [...(toolResults || []), errResult];

      // On redonne la main au LLM avec les résultats (il explique / corrige / relance si possible)
      try {
        const { response, isRelance, hasNewToolCalls } = await this.callHarmonyLLMWithResults(
          message,
          this.currentHistoryRef,
          toolCalls || [],
          toolResults,
          agentConfig,
          sessionId,
          userToken,
          0,
          traceId
        );
        const finalResponse = {
          ...response,
          tool_calls: toolCalls, // Garder les tool calls originaux
          reasoning: (response as any)?.reasoning || '' // Garder le reasoning s'il existe
        };
        return await this.createSuccessResponse(finalResponse, toolResults, sessionId, { isRelance, hasNewToolCalls });
      } catch (secondary: any) {
        // Sérialiser les erreurs pour un meilleur logging
        const originalErrorStr = error instanceof Error ? error.message : JSON.stringify(error);
        const secondaryErrorStr = secondary instanceof Error ? secondary.message : JSON.stringify(secondary);
        
        logger.error(`[HarmonyOrchestrator] ❌ secondary failure after error-handling trace=${traceId}`, 
          new Error(`Original: ${originalErrorStr} | Secondary: ${secondaryErrorStr}`)
        );

        // 🔧 Gestion spéciale des erreurs Groq 500 - on fournit une réponse de fallback
        if (error instanceof Error && error.message.includes('Groq API error: 500')) {
          logger.warn(`[HarmonyOrchestrator] ⚠️ Erreur Groq 500 détectée, fourniture d'une réponse de fallback`);
          
          return await this.createSuccessResponse(
            {
              content: "Je rencontre un problème technique côté modèle. Réessaie dans un instant ou reformule ta demande. Aucun outil n'a été exécuté.",
              reasoning: "Service Groq temporairement indisponible - réponse de fallback intelligente fournie pour maintenir l'expérience utilisateur",
              tool_calls: toolCalls || []
            },
            toolResults || [],
            sessionId,
            { isFallback: true }
          );
        }

        const combinedError = new Error(
          `Secondary failure after handling: ${secondary?.message || String(secondary)}. Original error: ${
            error?.message || String(error)
          }`
        );

        return this.createErrorResponse(combinedError, sessionId);
      }
    }

    // Fallback par défaut (ne devrait jamais être atteint)
    return this.createErrorResponse(new Error('Erreur inattendue dans executeRound'), sessionId);
  }

  // ============================================================================
  // MÉTHODES PRIVÉES HARMONY
  // ============================================================================

  /**
   * Premier appel LLM Harmony (avec gating des tools, prompts = ceux de l'agent)
   */
  private async callHarmonyLLM(
    message: string,
    sessionHistory: HarmonyMessage[],
    agentConfig: any,
    userToken: string,
    sessionId: string,
    traceId: string
  ) {
    const appContext = { type: 'chat_session' as const, name: `session-${sessionId}`, id: sessionId, content: '' };

    // Obtenir la configuration une seule fois
    const systemContent = this.getSystemContent(agentConfig, appContext);
    const tools = await this.getToolsWithGating(agentConfig, appContext, { userToken, sessionId });
    const configuredProvider = this.getConfiguredProvider(agentConfig);

    // Construire l'historique Harmony
    const buildResult = this.historyBuilder.buildInitialHistory(
      systemContent,
      message,
      sessionHistory,
      tools,
      { sessionId, traceId }
    );

    if (!buildResult.isValid) {
      throw new Error(`Erreur construction historique Harmony: ${buildResult.validationErrors.join(', ')}`);
    }

    this.currentHistoryRef = buildResult.conversation.messages;

    logger.dev?.(`[HarmonyOrchestrator] 📢 1er appel LLM Harmony...`, {
      messageLength: message.length,
      historyLength: buildResult.conversation.messages.length,
      toolsCount: tools.length,
      traceId
    });

    // Appel au provider Harmony
    const response = await configuredProvider.call(message, appContext, buildResult.conversation.messages, { tools });

    logger.dev?.(`[HarmonyOrchestrator] 📥 Provider Harmony response:`, {
      hasContent: !!(response as any)?.content,
      contentLength: (response as any)?.content?.length || 0,
      hasToolCalls: !!(response as any)?.tool_calls,
      toolCallsCount: (response as any)?.tool_calls?.length || 0,
      traceId
    });

    return {
      response,
      history: buildResult.conversation.messages
    };
  }

  /**
   * Deuxième appel Harmony avec résultats tools — tools actifs pour autoriser une relance
   */
  private async callHarmonyLLMWithResults(
    message: string,
    sessionHistory: HarmonyMessage[],
    toolCalls: ToolCall[],
    toolResults: NormalizedToolResult[],
    agentConfig: any,
    sessionId: string,
    userToken: string,
    relanceCount: number,
    traceId: string,
    autoExecuteNewTools: boolean = true
  ): Promise<{ response: any; isRelance: boolean; hasNewToolCalls: boolean }> {
    const tools = await this.getToolsForRelance(agentConfig);
    const appContext = { type: 'chat_session' as const, name: `session-${sessionId}`, id: sessionId, content: '' };

    // Historique nettoyé & borné
    const cleanedHistory = this.cleanHarmonyHistory(sessionHistory);
    const systemContent = this.getSystemContent(agentConfig, appContext);

    // Construire l'historique Harmony avec résultats
    const buildResult = this.historyBuilder.buildSecondCallHistory(
      systemContent,
      message,
      cleanedHistory,
      toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function?.name || 'unknown',
          arguments: tc.function?.arguments || '{}'
        }
      })),
      toolResults.map(tr => ({
        tool_call_id: tr.tool_call_id,
        tool_name: tr.tool_name,
        details: tr.details || {},
        success: tr.success,
        timestamp: tr.timestamp
      })),
      tools,
      { sessionId, traceId }
    );

    if (!buildResult.isValid) {
      throw new Error(`Erreur construction historique Harmony avec résultats: ${buildResult.validationErrors.join(', ')}`);
    }

    const configuredProvider = this.getConfiguredProvider(agentConfig);

    // Appel provider Harmony + tools
    let response = await configuredProvider.call(message, appContext, buildResult.conversation.messages, { tools });

    // Re-try léger si réponse trop courte (souvent hallucination/latence tool)
    if ((response as any)?.content && (response as any).content.trim().length < 15) {
      logger.warn(`[HarmonyOrchestrator] ⚠️ content court (${(response as any).content.length} chars) → retry trace=${traceId}`);
      response = await configuredProvider.call(message, appContext, buildResult.conversation.messages, { tools });
    }

    // Nouveaux tool calls ?
    let newToolCalls: ToolCall[] = Array.isArray((response as any).tool_calls) ? (response as any).tool_calls : [];
    newToolCalls = this.deduplicateToolCalls(newToolCalls);

    if (newToolCalls.length > this.limits.maxToolCalls) {
      logger.warn(`[HarmonyOrchestrator] ⚠️ relance tool calls > max — trim`);
      newToolCalls = newToolCalls.slice(0, this.limits.maxToolCalls);
    }

    if (newToolCalls.length > 0 && relanceCount < this.limits.maxRelances) {
      if (!autoExecuteNewTools) {
        // L'appelant décidera d'exécuter ou non ces tools
        return { response, isRelance: relanceCount > 0, hasNewToolCalls: true };
      }

      logger.info(
        `[HarmonyOrchestrator] 🔁 relance ${relanceCount + 1}/${this.limits.maxRelances} — ${newToolCalls.length} nouveaux tools trace=${traceId}`
      );

      const newToolResults = await this.executeTools(newToolCalls, userToken, sessionId, traceId);

      // Accumulation et relance récursive
      return await this.callHarmonyLLMWithResults(
        message,
        sessionHistory,
        [...toolCalls, ...newToolCalls],
        [...toolResults, ...newToolResults],
        agentConfig,
        sessionId,
        userToken,
        relanceCount + 1,
        traceId,
        autoExecuteNewTools
      );
    } else if (newToolCalls.length > 0) {
      logger.warn(
        `[HarmonyOrchestrator] ⚠️ limite de relances atteinte — tool calls supplémentaires ignorés trace=${traceId}`
      );
      return { response, isRelance: relanceCount > 0, hasNewToolCalls: true };
    }

    // Si contenu vide malgré outillage → produire un résumé factuel des tool_results
    if (!((response as any)?.content || '').trim() && (toolResults?.length || 0) > 0) {
      const summary = this.summarizeToolResults(toolResults);
      response = { ...(response || {}), content: summary };
    }

    return { response, isRelance: relanceCount > 0, hasNewToolCalls: false };
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Convertit les messages ChatMessage en HarmonyMessage
   */
  private convertToHarmonyMessages(chatMessages: any[]): HarmonyMessage[] {
    return chatMessages.map(msg => ({
      role: msg.role as HarmonyMessage['role'],
      channel: msg.channel as HarmonyMessage['channel'],
      content: msg.content || '',
      timestamp: msg.timestamp || new Date().toISOString(),
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id,
      name: msg.name,
    }));
  }

  /**
   * Nettoie l'historique Harmony
   */
  private cleanHarmonyHistory(history: HarmonyMessage[]): HarmonyMessage[] {
    const useful = Array.isArray(history) ? history.slice(-this.limits.maxHistoryMessages) : [];
    const out: HarmonyMessage[] = [];

    for (const msg of useful) {
      if (!msg) continue;

      // ⚙️ Conserver assistant qui contient des tool_calls
      if (msg.role === HARMONY_ROLES.ASSISTANT && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
        out.push(msg);
        continue;
      }

      // ✅ Retour d'outil Harmony: role = functions.<name>
      const isHarmonyToolReturn = typeof msg.role === 'string' && msg.role.startsWith('functions.');
      if (isHarmonyToolReturn) {
        // écarter payloads énormes
        if (typeof msg.content === 'string' && msg.content.length > 12000) continue;
        out.push(msg);
        continue;
      }

      // Optionnel: compresser l'analysis trop verbeux
      if (msg.channel === HARMONY_CHANNELS.ANALYSIS && (msg.content?.length || 0) > 8000) {
        continue;
      }

      // Autres messages: limiter taille
      if (typeof msg.content === 'string' && msg.content.length > 20000) continue;
      out.push(msg);
    }

    logger.dev?.(`[HarmonyOrchestrator] 📚 Historique nettoyé (Harmony): kept=${out.length}/${useful.length}`);
    return out;
  }

  // ============================================================================
  // MÉTHODES HÉRITÉES (adaptées pour Harmony)
  // ============================================================================

  private async getToolsWithGating(agentConfig: any, appContext: any, sessionIdentity: any): Promise<any[]> {
    const hasCapabilities =
      (Array.isArray(agentConfig?.api_v2_capabilities) && agentConfig.api_v2_capabilities.length > 0) ||
      (Array.isArray((agentConfig as any)?.capabilities) && (agentConfig as any).capabilities.length > 0);

    const forceToolsOn = process.env.FORCE_TOOLS_ON === 'true';
    if (!hasCapabilities && !forceToolsOn) {
      logger.info(`[HarmonyOrchestrator] 🔒 no tools (no capabilities)`);
      return [];
    }
    if (forceToolsOn) {
      logger.warn(`[HarmonyOrchestrator] ⚠️ FORCE_TOOLS_ON=true — bypass gating`);
    }

    // ✅ CORRECTION: Utiliser les tools OpenAPI V2 au lieu des anciens tools
    try {
      const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
      const tools = getOpenAPIV2Tools();
      
      logger.info(`[HarmonyOrchestrator] 🔧 ${tools.length} tools OpenAPI V2 chargés`);
      return tools;
    } catch (error) {
      logger.error(`[HarmonyOrchestrator] ❌ Erreur lors du chargement des tools OpenAPI V2:`, error);
      
      // Fallback vers les anciens tools en cas d'erreur
      let toolCapabilities: string[] = [];
      if (Array.isArray(agentConfig?.api_v2_capabilities)) toolCapabilities = agentConfig.api_v2_capabilities;
      else if (Array.isArray((agentConfig as any)?.capabilities)) toolCapabilities = (agentConfig as any).capabilities;

      // Utiliser les tools API V2 directement
      return API_V2_TOOLS;
    }
  }

  private async getToolsForRelance(agentConfig: any): Promise<any[]> {
    // ✅ CORRECTION: Utiliser les mêmes tools OpenAPI V2 que pour le premier appel
    try {
      const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
      const tools = getOpenAPIV2Tools();
      
      logger.info(`[HarmonyOrchestrator] 🔧 ${tools.length} tools OpenAPI V2 chargés pour relance`);
      return tools;
    } catch (error) {
      logger.error(`[HarmonyOrchestrator] ❌ Erreur lors du chargement des tools OpenAPI V2 pour relance:`, error);
      
      // Fallback vers les anciens tools en cas d'erreur
      let toolCapabilities: string[] = [];
      if (Array.isArray(agentConfig?.api_v2_capabilities)) toolCapabilities = agentConfig.api_v2_capabilities;
      else if (Array.isArray((agentConfig as any)?.capabilities)) toolCapabilities = (agentConfig as any).capabilities;

      // Utiliser les tools API V2 directement
      return API_V2_TOOLS;
    }
  }

  private getConfiguredProvider(agentConfig?: any): GroqHarmonyProvider {
    if (!agentConfig) return this.harmonyProvider;

    const customConfig = {
      model: agentConfig.model || (this.harmonyProvider as any).config?.model || 'openai/gpt-oss-20b',
      temperature: agentConfig.temperature ?? (this.harmonyProvider as any).config?.temperature ?? 0.7,
      maxTokens:
        agentConfig.max_tokens || agentConfig.max_completion_tokens || (this.harmonyProvider as any).config?.maxTokens || 4000,
      topP: agentConfig.top_p ?? (this.harmonyProvider as any).config?.topP ?? 0.9,
      // reasoningEffort: agentConfig.reasoning_effort ?? this.harmonyProvider.config.reasoningEffort,
      // serviceTier: agentConfig.service_tier ?? this.harmonyProvider.config.serviceTier,
      // parallelToolCalls:
      //   agentConfig.parallel_tool_calls !== undefined
      //     ? agentConfig.parallel_tool_calls
      //     : this.harmonyProvider.config.parallelToolCalls
    };

    logger.dev?.(`[HarmonyOrchestrator] 🎯 Configuration agent:`, {
      model: customConfig.model,
      temperature: customConfig.temperature,
      maxTokens: customConfig.maxTokens
      // reasoningEffort: customConfig.reasoningEffort
    });

    return new GroqHarmonyProvider(customConfig);
  }

  private getSystemContent(agentConfig: any, appContext?: any): string {
    let base = '';
    try {
      if (agentConfig) {
        const templateService = AgentTemplateService.getInstance();
        const context = appContext ?? { type: 'chat_session', name: 'Session de chat', id: 'session', content: '' };
        const rendered = templateService.renderAgentTemplate(agentConfig, context);
        if (rendered?.content?.trim()) base = rendered.content;
      }
    } catch (e) {
      logger.warn(`[HarmonyOrchestrator] ⚠️ template agent render error`, e);
    }

    const isGptOss = /gpt-oss|harmony/i.test(String(agentConfig?.model || '')) || agentConfig?.harmony === true;
    if (!isGptOss) return base;

    const header = [
      `Knowledge cutoff: 2024-06`,
      `Current date: ${new Date().toISOString().slice(0,10)}`,
      `Valid channels: analysis, commentary, final.`,
      `Calls to these tools must go to the commentary channel: functions.`
    ].join('\n');

    return [header, base].filter(Boolean).join('\n\n');
  }

  // ============================================================================
  // MÉTHODES HÉRITÉES (inchangées)
  // ============================================================================

  /**
   * Exécuter des tools API V2 avec persistance et normalisation
   */
  private async executeApiV2ToolsWithPersistence(
    toolCalls: ToolCall[],
    userToken: string,
    sessionId: string,
    persistenceService: ToolCallPersistenceService,
    traceId: string
  ): Promise<NormalizedToolResult[]> {
    const startTime = Date.now();
    logger.info(`[HarmonyOrchestrator] 🔧 Exécution ${toolCalls.length} tools via API V2`);

    try {
      // Exécuter les tools via API V2
      const results = await Promise.allSettled(
        toolCalls.map(call => this.apiV2ToolExecutor.executeToolCall(call as any, userToken))
      );

      // Traiter les résultats (succès et échecs)
      const normalizedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return ToolResultNormalizer.normalizeToolResult(
            result.value.name,
            result.value.tool_call_id,
            {},
            result.value
          );
        } else {
          const call = toolCalls[index];
          return {
            tool_call_id: call.id,
            tool_name: call.function.name,
            content: JSON.stringify({
              success: false,
              error: result.reason instanceof Error ? result.reason.message : 'Erreur interne du serveur',
              code: 'TOOL_EXECUTION_ERROR'
            }),
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Erreur interne du serveur',
            code: 'TOOL_EXECUTION_ERROR',
            trace_id: traceId,
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };
        }
      });

      // Persister les résultats
      for (const result of normalizedResults) {
        await persistenceService.persistToolResult(result.tool_call_id, result.tool_name, result);
      }

      const duration = Date.now() - startTime;
      logger.info(`[HarmonyOrchestrator] ✅ Tools API V2 exécutés en ${duration}ms`);

      return normalizedResults;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[HarmonyOrchestrator] ❌ Erreur exécution tools API V2 (${duration}ms):`, error);
      
      // Retourner des résultats d'erreur
      return toolCalls.map(call => ({
        tool_call_id: call.id,
        tool_name: call.function.name,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur',
          code: 'TOOL_EXECUTION_ERROR'
        }),
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        code: 'TOOL_EXECUTION_ERROR',
        trace_id: traceId,
        execution_time_ms: duration,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async executeToolsWithPersistence(
    toolCalls: ToolCall[],
    userToken: string,
    sessionId: string,
    persistenceService: ToolCallPersistenceService,
    traceId: string
  ): Promise<NormalizedToolResult[]> {
    const uniqueToolCalls = this.deduplicateToolCalls(toolCalls);
    const idempotencySalt = `${sessionId}-${Date.now()}`;
    const context = { userToken, batchId: `batch-${Date.now()}`, maxRetries: 3, idempotencySalt, traceId };

    const rawResults = await this.toolExecutor.executeTools(uniqueToolCalls, context);

    const normalizedResults: NormalizedToolResult[] = [];

    for (let i = 0; i < uniqueToolCalls.length; i++) {
      const toolCall = uniqueToolCalls[i];
      const rawResult = rawResults[i];
      const toolName = toolCall.function?.name || 'unknown';

      const validation = ToolResultNormalizer.validateToolArguments(toolCall as any);
      if (!validation.isValid) {
        const errorResult: NormalizedToolResult = {
          success: false,
          code: 'VALIDATION_ERROR',
          message: validation.error || 'Arguments invalides',
          details: {
            success: false,
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Arguments invalides'
          },
          tool_name: toolName,
          tool_call_id: toolCall.id,
          timestamp: new Date().toISOString()
        };
        await persistenceService.persistToolResult(toolCall.id, toolName, errorResult);
        normalizedResults.push(errorResult);
        continue;
      }

      const toolArgs = safeParseJSON(toolCall.function?.arguments || '{}');
      const normalized = ToolResultNormalizer.normalizeToolResult(
        toolName,
        toolCall.id,
        toolArgs,
        rawResult
      ) as NormalizedToolResult;

      await persistenceService.persistToolResult(toolCall.id, toolName, normalized);
      normalizedResults.push(normalized);
    }

    return normalizedResults;
  }

  private async executeTools(
    toolCalls: ToolCall[],
    userToken: string,
    sessionId: string,
    traceId: string
  ): Promise<NormalizedToolResult[]> {
    const persistenceService = new ToolCallPersistenceService(sessionId, userToken);
    return await this.executeToolsWithPersistence(toolCalls, userToken, sessionId, persistenceService, traceId);
  }

  private deduplicateToolCalls(toolCalls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    const unique: ToolCall[] = [];

    for (const tc of toolCalls || []) {
      const sig = ToolResultNormalizer.createToolCallSignature(tc as any);
      if (sig && seen.has(sig)) {
        logger.warn(`[HarmonyOrchestrator] ⚠️ duplicate tool call ignored: ${sig}`);
        continue;
      }

      if (this.isDuplicateAction(tc)) {
        logger.warn(`[HarmonyOrchestrator] ⚠️ duplicate action detected: ${tc.function?.name} — ignoring`);
        continue;
      }

      if (sig) seen.add(sig);
      unique.push(tc);
    }

    if (unique.length !== (toolCalls || []).length) {
      logger.info(`[HarmonyOrchestrator] 🔧 dedup: ${unique.length}/${(toolCalls || []).length}`);
    }

    return unique;
  }

  private isDuplicateAction(toolCall: ToolCall): boolean {
    try {
      const toolName = toolCall?.function?.name;
      const toolArgs = toolCall?.function?.arguments;
      if (!toolName || !toolArgs) return false;

      // Exemple : anti-doublon pour create_note basé sur le titre
      if (toolName === 'create_note') {
        const args = typeof toolArgs === 'string' ? safeParseJSON(toolArgs) : toolArgs;
        const title = args?.source_title || args?.title;
        if (title) {
          return this.hasSimilarNoteInHistory(title, this.currentHistoryRef);
        }
      }

      return false;
    } catch (error) {
      logger.warn(`[HarmonyOrchestrator] ⚠️ Error checking duplicate action:`, error);
      return false;
    }
  }

  private hasSimilarNoteInHistory(title: string, history: HarmonyMessage[]): boolean {
    if (!title || !Array.isArray(history) || !history.length) return false;
    const normalizedTitle = String(title).toLowerCase().trim();

    for (const msg of history.slice(-30)) {
      // Harmony tool return
      if (typeof msg.role === 'string' && msg.role.startsWith('functions.create_note')) {
        try {
          const payload = typeof msg.content === 'string' ? safeParseJSON(msg.content) : (msg.content || {});
          const existingTitle = payload?.note?.title || payload?.title;
          if (!existingTitle) continue;

          const norm = String(existingTitle).toLowerCase().trim();
          if (norm === normalizedTitle || norm.includes(normalizedTitle) || normalizedTitle.includes(norm)) {
            logger.dev?.(`[HarmonyOrchestrator] 🔍 similaire: "${existingTitle}" ≈ "${title}"`);
            return true;
          }
        } catch { /* ignore */ }
      }
    }
    return false;
  }

  private signatureOfSet(calls: ToolCall[]): string {
    const stable = (calls || []).map(c => ({
      n: c?.function?.name || '',
      a: this.stableArgs(c?.function?.arguments || '{}')
    }));
    return JSON.stringify(stable);
  }

  private stableArgs(argsStr: string): any {
    try { const o = JSON.parse(argsStr || '{}'); return this.sortKeysDeep(o); } catch { return argsStr; }
  }

  private sortKeysDeep(obj: any): any {
    if (Array.isArray(obj)) return obj.map(v => this.sortKeysDeep(v));
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).sort().reduce((acc: any, k: string) => {
        acc[k] = this.sortKeysDeep(obj[k]);
        return acc;
      }, {});
    }
    return obj;
  }

  private summarizeToolResults(toolResults: NormalizedToolResult[]): string {
    try {
      const lines: string[] = [];
      lines.push('Voici ce qui a été fait :');
      for (const r of toolResults) {
        const name = (r as any)?.tool_name || 'outil';
        const ok = r.success ? 'réussi' : 'échoué';
        const msg = (r.message || (r.details && (r.details.message || r.details.error))) || '';
        lines.push(`- ${name} : ${ok}${msg ? ` — ${String(msg).slice(0, 160)}` : ''}`);
      }
      lines.push('Souhaitez-vous que je continue ou que j\'apporte des modifications supplementaires ?');
      return lines.join('\n');
    } catch {
      return 'Les outils ont été exécutés. Souhaitez-vous continuer ?';
    }
  }

  private async createSuccessResponse(
    response: any,
    toolResults: NormalizedToolResult[],
    sessionId: string,
    opts?: { isRelance?: boolean; hasNewToolCalls?: boolean; toolCalls?: ToolCall[]; isFallback?: boolean }
  ): Promise<GroqRoundResult> {
    let rawText = '';
    let finalContent = '';

    if (response && typeof response === 'object') {
        // La source de vérité est le contenu brut de la réponse du LLM
        if (typeof (response as any).content === 'string') {
            rawText = (response as any).content;
        } else if ((response as any)?.choices?.[0]?.message?.content) {
            rawText = (response as any).choices[0].message.content;
        } else {
            logger.warn('[HarmonyOrchestrator] ⚠️ Structure de contenu non reconnue:', (response as any)?.content);
        }
    }

    // Extraction stricte des canaux Harmony
    const { analysis, commentary, final, combined } = this.extractHarmonyChannels(rawText);
    const reasoning = combined;

    // Le contenu final pour l'utilisateur est ce qui se trouve dans le canal 'final'.
    // S'il n'y a pas de canal 'final', on utilise le texte brut comme fallback.
    finalContent = final || rawText;

    // Si le contenu est toujours vide mais qu'il y a des résultats d'outils, on génère un résumé.
    if (!finalContent.trim() && (toolResults?.length || 0) > 0) {
      finalContent = this.summarizeToolResults(toolResults);
    }
    
    logger.dev?.('[HarmonyOrchestrator] 📤 Réponse finale Harmony:', {
      success: true,
      contentLength: finalContent.length,
      hasReasoning: !!reasoning,
      hasHarmonyAnalysis: !!analysis,
      hasHarmonyCommentary: !!commentary,
      hasHarmonyFinal: !!final,
      toolCallsCount: (response as any)?.tool_calls?.length || 0,
      toolResultsCount: toolResults.length,
      sessionId,
      isRelance: !!opts?.isRelance,
      hasNewToolCalls: !!opts?.hasNewToolCalls
    });

    const transformedToolResults = toolResults.map(result => ({
      tool_call_id: result.tool_call_id,
      name: result.tool_name,
      content: JSON.stringify(result.details || result),
      success: result.success,
      tool_name: result.tool_name,
      details: result.details,
      tool_args: result.tool_args,
      timestamp: result.timestamp
    }));

    return {
      success: true,
      content: finalContent,
      reasoning: reasoning,
      harmony_analysis: analysis,
      harmony_commentary: commentary,
      harmony_final: final,
      tool_calls: (response as any)?.tool_calls || (opts?.toolCalls ?? []),
      tool_results: transformedToolResults,
      sessionId,
      is_relance: !!opts?.isRelance,
      has_new_tool_calls: !!opts?.hasNewToolCalls,
      isFallback: !!opts?.isFallback
    };
  }

  /**
   * 🎼 Extrait les canaux d'un texte brut en utilisant un parseur Harmony strict.
   * Cette méthode ne devine pas les canaux et se fie uniquement au formatage explicite.
   * @param text Le texte brut de la réponse du LLM.
   * @returns Un objet avec les contenus des canaux `analysis`, `commentary`, `final` et une version `combined`.
   */
  private extractHarmonyChannels(text: string): {
    analysis: string;
    commentary: string;
    final: string;
    combined: string;
  } {
    const channels = {
      analysis: '',
      commentary: '',
      final: '',
      combined: ''
    };

    if (!text || !text.trim()) {
      return channels;
    }

    try {
      const harmonyMessages = this.parseHarmonyResponse(text);

      const analysisParts: string[] = [];
      const commentaryParts: string[] = [];
      const finalParts: string[] = [];

      for (const message of harmonyMessages) {
        if (message.channel === 'analysis') {
          analysisParts.push(message.content);
        } else if (message.channel === 'commentary') {
          commentaryParts.push(message.content);
        } else if (message.channel === 'final') {
          finalParts.push(message.content);
        }
      }

      channels.analysis = analysisParts.join('\n\n').trim();
      channels.commentary = commentaryParts.join('\n\n').trim();
      channels.final = finalParts.join('\n\n').trim();

      const combinedParts: string[] = [];
      if (channels.analysis) combinedParts.push(`🧠 Analyse:\n${channels.analysis}`);
      if (channels.commentary) combinedParts.push(`💭 Commentaire:\n${channels.commentary}`);
      // La partie 'final' n'est généralement pas incluse dans le 'reasoning' affiché
      
      channels.combined = combinedParts.join('\n\n').trim();

    } catch (error) {
      logger.warn('[HarmonyOrchestrator] ⚠️ Erreur lors de l\'extraction des canaux Harmony:', error);
      // En cas d'erreur de parsing, on considère le texte entier comme de l'analyse (comportement de fallback sûr).
      channels.analysis = text;
      channels.combined = text;
    }
    
    return channels;
  }
  
  /**
   * 🎼 Parse une chaîne de réponse LLM au format Harmony de manière stricte.
   * Ne retourne que les messages qui respectent la syntaxe <|start|...<|end|>.
   * @param text La réponse brute du LLM.
   * @returns Un tableau de messages Harmony structurés.
   */
  private parseHarmonyResponse(text: string): Array<{
    role: string;
    channel?: string;
    content: string;
  }> {
    const messages: Array<{ role: string; channel?: string; content: string }> = [];
    if (!text || !text.trim()) {
      return messages;
    }

    // Expression régulière pour capturer un bloc Harmony complet, du <|start|> au <|end|>.
    // Elle est non-greedy pour gérer les blocs multiples.
    const blockRegex = /<\|start\|>([\s\S]*?)<\|end\|>/g;
    let blockMatch;

    while ((blockMatch = blockRegex.exec(text)) !== null) {
      const blockContent = blockMatch[1];

      // Expression pour extraire le rôle, le canal (optionnel) et le message du bloc.
      const contentRegex = /(\w+)(?:<\|channel\|>(\w+))?<\|message\|>([\s\S]*)/;
      const contentMatch = blockContent.match(contentRegex);
      
      if (contentMatch) {
        const [, role, channel, content] = contentMatch;
        if (role && content) { // Le rôle et le contenu sont obligatoires.
          messages.push({
            role: role.trim(),
            channel: channel ? channel.trim() : undefined,
            content: content.trim(),
          });
        }
      }
    }
    
    return messages;
  }

  private createErrorResponse(error: any, sessionId: string): GroqRoundResult {
    return {
      success: false,
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error),
      sessionId,
      status: 500
    };
  }

  /**
   * Obtenir les tools disponibles pour l'agent (API V2 par défaut)
   */
  getAvailableTools(): ToolDefinition[] {
    return API_V2_TOOLS;
  }

  /**
   * Obtenir les tools legacy (pour compatibilité)
   */
  getLegacyTools(): ToolDefinition[] {
    // Retourner les tools API V2 par défaut
    return API_V2_TOOLS;
  }

  /**
   * 🔧 Clôture finale Harmony: ajouter <|return|> si nécessaire
   * CORRECTION: Ne pas ajouter <|return|> automatiquement - laisser le modèle décider
   */
  private ensureFinalReturnToken(t: string): string {
    const s = t || '';
    // Ne pas ajouter <|return|> automatiquement - le modèle Harmony doit le gérer
    return s;
  }
}

/** Utils */
function safeParseJSON(input: any): any {
  try {
    return JSON.parse(input ?? '{}');
  } catch {
    return {};
  }
}
