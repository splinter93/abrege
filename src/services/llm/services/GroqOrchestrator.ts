import type { GroqRoundParams, GroqRoundResult, GroqLimits } from '../types/groqTypes';
import type { LLMResponse } from '../types/agentTypes';
import { GroqProvider } from '../providers';
import { GroqToolExecutor } from './GroqToolExecutor';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { ToolCallPersistenceService } from './ToolCallPersistenceService';
import { ToolResultNormalizer } from './ToolResultNormalizer';
import { simpleLogger as logger } from '@/utils/logger';
import { AgentTemplateService } from '../agentTemplateService';
import { ChatMessage } from '@/types/chat';
import { GroqHistoryBuilder } from './GroqHistoryBuilder';

// Types internes stricts pour fiabiliser le pipeline
type ToolCall = {
  id: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

// Utiliser le type de ToolCallPersistenceService pour la cohérence
import type { NormalizedToolResult } from './ToolCallPersistenceService';

/**
 * Orchestrateur Groq — plomberie neutre (ton/personnalité = agent)
 * 2-passes LLM + exécution d'outils, relance bornée, normalisation & persistance.
 */
export class GroqOrchestrator {
  private limits: GroqLimits = {
    maxToolCalls: 10,
    maxRelances: 2,
    maxContextMessages: 25,
    maxHistoryMessages: 50
  };

  private groqProvider: GroqProvider;
  private toolExecutor: GroqToolExecutor;

  /** Historique courant (pour dédup intelligente des actions) */
  private currentHistoryRef: ChatMessage[] = [];

  /** Budgets globaux anti-boucle **/
  private readonly MAX_TOTAL_TOOL_CALLS = 12;
  private readonly MAX_WALLCLOCK_MS = 15_000;

  constructor(limits?: GroqLimits) {
    this.limits = limits ?? this.limits;
    this.groqProvider = new GroqProvider();
    this.toolExecutor = new GroqToolExecutor(this.limits);
  }

  /**
   * Round : LLM → tools → LLM (+ relance bornée) → réponse (succès/erreur)
   */
  async executeRound(params: GroqRoundParams): Promise<GroqRoundResult> {
    const { message, sessionHistory, agentConfig, userToken, sessionId } = params;
    const startTime = Date.now();
    const traceId = `trace-${sessionId}-${startTime}`;

    // Historique courant pour la déduplication d'actions
    this.currentHistoryRef = Array.isArray(sessionHistory) ? sessionHistory : [];

    // Exposés au catch pour relance propre via le LLM
    let toolCalls: ToolCall[] = [];
    let toolResults: NormalizedToolResult[] = [];

    try {
      logger.info(`[GroqOrchestrator] 🚀 round start s=${sessionId} trace=${traceId}`);

      const persistenceService = new ToolCallPersistenceService(sessionId, userToken);

      // 1) Premier appel — propose des tool_calls
      const { response: firstResponse } = await this.callLLM(
        message,
        sessionHistory,
        agentConfig,
        userToken,
        sessionId,
        traceId
      );

      toolCalls = Array.isArray((firstResponse as any)?.tool_calls) ? (firstResponse as any).tool_calls : [];

      // Dédup + cap
      toolCalls = this.deduplicateToolCalls(toolCalls);
      if (toolCalls.length > this.limits.maxToolCalls) {
        logger.warn(`[GroqOrchestrator] ⚠️ Tool calls > max (${toolCalls.length} > ${this.limits.maxToolCalls}) — trim`);
        toolCalls = toolCalls.slice(0, this.limits.maxToolCalls);
      }

      if (toolCalls.length === 0) {
        // Pas d’outils → la réponse du LLM fait foi (aucune altération)
        const duration = Date.now() - startTime;
        logger.info(
          `[GroqOrchestrator] ✅ round ok (no tools) s=${sessionId} dur=${duration}ms chars=${(firstResponse?.content ?? '').length}`
        );
        return this.createSuccessResponse(firstResponse, [], sessionId, {
          isRelance: false,
          hasNewToolCalls: false
        });
      }

      // Persister les tool calls ; ne pas muter l'objet wrapper
      await persistenceService.persistToolCalls(toolCalls);

      // 2) Exécution des tools (normalisation + persistance)
      const execMode: 'sequential' | 'parallel' = agentConfig?.toolExecutionMode ?? 'sequential';
      const batchSize: number = agentConfig?.toolBatchSize ?? 1;

      let allToolCalls: ToolCall[] = [];
      let allResults: NormalizedToolResult[] = [];

      let finalResponse: LLMResponse | null = null;
      let isRelance = false;
      let hasNewToolCalls = false;

      if (execMode === 'parallel') {
        logger.info(`[GroqOrchestrator] 🔧 Exec ${toolCalls.length} tools (parallel)`);
        allResults = await this.executeToolsWithPersistence(
          toolCalls,
          userToken,
          sessionId,
          persistenceService,
          traceId
        );
        allToolCalls = toolCalls;

        // 3) Deuxième appel — tools actifs, possible relance si le modèle corrige
        const r = await this.callLLMWithResults(
          message,
          sessionHistory,
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
        logger.info(`[GroqOrchestrator] 🔧 Exec tools (sequential, batchSize=${batchSize})`);
        const startWall = Date.now();
        const seenSets = new Set<string>();

        let waveToolCalls: ToolCall[] = [...toolCalls];
        let relanceCount = 0;
        let stopRequested = false;

        while (waveToolCalls.length > 0 && !stopRequested) {
          // Budgets globaux
          if (allToolCalls.length >= this.MAX_TOTAL_TOOL_CALLS) {
            logger.warn(`[GroqOrchestrator] ⛔ max total tool calls atteint (${this.MAX_TOTAL_TOOL_CALLS})`);
            break;
          }
          if (Date.now() - startWall > this.MAX_WALLCLOCK_MS) {
            logger.warn(`[GroqOrchestrator] ⛔ budget temps dépassé (${this.MAX_WALLCLOCK_MS}ms)`);
            break;
          }

          const batch = waveToolCalls.slice(0, Math.max(1, batchSize));
          const results = await this.executeToolsWithPersistence(
            batch,
            userToken,
            sessionId,
            persistenceService,
            traceId
          );
          allToolCalls.push(...batch);
          allResults.push(...results);

          const r = await this.callLLMWithResults(
            message,
            sessionHistory,
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

          // ✅ ChatGPT-like: Pas de décision explicite bloquante
          // Le LLM continue naturellement s'il a de nouveaux tool calls

          // ✅ ChatGPT-like: Le LLM choisit librement de continuer ou d'arrêter
          let nextCalls: ToolCall[] = Array.isArray((finalResponse as any)?.tool_calls)
            ? (finalResponse as any).tool_calls
            : [];
          nextCalls = this.deduplicateToolCalls(nextCalls);
          
          if (nextCalls.length > 0) {
            // Le LLM a choisi de continuer avec de nouveaux tool calls
            logger.info(`[GroqOrchestrator] 🔄 LLM choisit de continuer avec ${nextCalls.length} nouveaux tool calls`);
            
            if (nextCalls.length > this.limits.maxToolCalls) {
              logger.warn(`[GroqOrchestrator] ⚠️ relance tool calls > max — trim`);
              nextCalls = nextCalls.slice(0, this.limits.maxToolCalls);
            }

            // Loop guard: même set de tools répété
            const setSig = this.signatureOfSet(nextCalls);
            if (setSig && seenSets.has(setSig)) {
              logger.warn(`[GroqOrchestrator] ⛔ même set de tools détecté — arrêt pour éviter la boucle`);
              break;
            }
            if (setSig) seenSets.add(setSig);

            // Budgets si on ajoute la vague suivante
            if (allToolCalls.length + nextCalls.length > this.MAX_TOTAL_TOOL_CALLS) {
              logger.warn(`[GroqOrchestrator] ⛔ exécutions supplémentaires dépasseraient le cap global`);
              break;
            }
            if (Date.now() - startWall > this.MAX_WALLCLOCK_MS) {
              logger.warn(`[GroqOrchestrator] ⛔ budget temps dépassé avant nouvelle vague`);
              break;
            }

            // Préparer la prochaine vague
            waveToolCalls = nextCalls;
          } else {
            // Le LLM a choisi d'arrêter et de donner sa réponse finale
            logger.info(`[GroqOrchestrator] ✅ LLM choisit d'arrêter - réponse finale fournie`);
            break;
          }
          relanceCount += 1;
          if (relanceCount > this.limits.maxRelances) {
            logger.warn(`[GroqOrchestrator] ⚠️ limite de relances atteinte`);
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
        `[GroqOrchestrator] ✅ round ok (with tools) s=${sessionId} dur=${duration}ms tools=${allToolCalls.length} results=${toolResults.length}`
      );
      
      return this.createSuccessResponse(finalResponse, toolResults, sessionId, {
        isRelance,
        hasNewToolCalls
      });
    } catch (error: any) {
      logger.error(`[GroqOrchestrator] ❌ error in round trace=${traceId}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        sessionId,
        traceId,
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0
      });

      // 🔧 Gestion spéciale des erreurs Groq 500 - on fournit une réponse de fallback directe
      if (error instanceof Error && error.message.includes('Groq API error: 500')) {
        logger.warn(`[GroqOrchestrator] ⚠️ Erreur Groq 500 détectée, fourniture d'une réponse de fallback directe`);
        
        return this.createSuccessResponse(
          {
            content: "Je rencontre un problème technique côté modèle. Réessaie dans un instant ou reformule ta demande. Aucun outil n’a été exécuté.",
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
        const { response, isRelance, hasNewToolCalls } = await this.callLLMWithResults(
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
        return this.createSuccessResponse(finalResponse, toolResults, sessionId, { isRelance, hasNewToolCalls });
      } catch (secondary: any) {
        logger.error(`[GroqOrchestrator] ❌ secondary failure after error-handling trace=${traceId}`, {
          originalError: error,
          secondaryError: secondary
        });

        // 🔧 Gestion spéciale des erreurs Groq 500 - on fournit une réponse de fallback
        if (error instanceof Error && error.message.includes('Groq API error: 500')) {
          logger.warn(`[GroqOrchestrator] ⚠️ Erreur Groq 500 détectée, fourniture d'une réponse de fallback`);
          
          return this.createSuccessResponse(
            {
              content: "Je rencontre un problème technique côté modèle. Réessaie dans un instant ou reformule ta demande. Aucun outil n’a été exécuté.",
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

  /** Premier appel LLM (avec gating des tools, prompts = ceux de l'agent) */
  private async callLLM(
    message: string,
    sessionHistory: any[],
    agentConfig: any,
    userToken: string,
    sessionId: string,
    traceId: string
  ) {
    const appContext = { type: 'chat_session' as const, name: `session-${sessionId}`, id: sessionId, content: '' };
    const sessionIdentity = { userToken, sessionId };

    // Obtenir la configuration une seule fois
    const systemContent = this.getSystemContent(agentConfig, appContext);
    const tools = await this.getToolsWithGating(agentConfig, appContext, sessionIdentity);
    const configuredProvider = this.getConfiguredProvider(agentConfig);

    // Construire l'historique avec le message developer
    const historyBuilder = new GroqHistoryBuilder(this.limits);
    const developerMessage = this.buildDeveloperMessage(tools);

    // On souhaite idéalement que le developer soit juste après le system. Si le builder ne le garantit pas,
    // on l'injecte dans l'historique de base avant construction.
    const baseHistory = developerMessage ? [developerMessage, ...sessionHistory] : sessionHistory;

    const messages = historyBuilder.buildInitialHistory(systemContent, message, baseHistory);

    // Log pour debug
    logger.dev?.(`[GroqOrchestrator] 🔧 Developer msg:`, {
      hasDeveloperMessage: !!developerMessage,
      toolsCount: tools.length,
      developerContent: developerMessage?.content?.substring(0, 100) + '...'
    });

    this.currentHistoryRef = messages; // Mettre à jour la référence

    logger.dev?.(`[GroqOrchestrator] 📢 1er appel LLM...`, {
      messageLength: message.length,
      historyLength: messages.length,
      toolsCount: tools.length,
      traceId
    });

    // Appel au provider (on passe aussi tools)
    const response = await (configuredProvider as any).call(message, appContext, messages, { tools });

    logger.dev?.(`[GroqOrchestrator] 📥 Provider response:`, {
      hasContent: !!(response as any)?.content,
      contentLength: (response as any)?.content?.length || 0,
      hasToolCalls: !!(response as any)?.tool_calls,
      toolCallsCount: (response as any)?.tool_calls?.length || 0,
      traceId
    });

    return {
      response,
      history: messages
    };
  }

  /**
   * Deuxième appel avec résultats tools — tools actifs pour autoriser une relance (maxRelances)
   * Retourne la réponse + flags (isRelance, hasNewToolCalls)
   */
  private async callLLMWithResults(
    message: string,
    sessionHistory: any[],
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
    const cleanedHistory = this.cleanHistory(sessionHistory);
    const systemContent = this.getSystemContent(agentConfig, appContext);
    const conversationContext = this.buildConversationContext(cleanedHistory, toolCalls, toolResults);
    const resultsPolicy = this.buildResultsInterpretationBanner(toolResults);
    const mergedSystem = this.mergeSystemMessages(systemContent, null, conversationContext, resultsPolicy, this.buildDecisionBanner());

    // Recréer le developer message (définitions d'outils) pour le 2e appel
    const developerMessage = this.buildDeveloperMessage(tools);

    const messages = this.buildMessagesWithResultsIntelligent(
      mergedSystem,
      message,
      cleanedHistory,
      toolCalls,
      toolResults,
      developerMessage
    );

    const configuredProvider = this.getConfiguredProvider(agentConfig);

    // Appel provider + tools
    let response = await (configuredProvider as any).call(message, appContext, messages, { tools });

    // Re-try léger si réponse trop courte (souvent hallucination/latence tool)
    if ((response as any)?.content && (response as any).content.trim().length < 15) {
      logger.warn(`[GroqOrchestrator] ⚠️ content court (${(response as any).content.length} chars) → retry trace=${traceId}`);
      response = await (configuredProvider as any).call(message, appContext, messages, { tools });
    }

    // Nouveaux tool calls ?
    let newToolCalls: ToolCall[] = Array.isArray((response as any).tool_calls) ? (response as any).tool_calls : [];
    newToolCalls = this.deduplicateToolCalls(newToolCalls);

    if (newToolCalls.length > this.limits.maxToolCalls) {
      logger.warn(`[GroqOrchestrator] ⚠️ relance tool calls > max — trim`);
      newToolCalls = newToolCalls.slice(0, this.limits.maxToolCalls);
    }

    if (newToolCalls.length > 0 && relanceCount < this.limits.maxRelances) {
      if (!autoExecuteNewTools) {
        // L'appelant décidera d'exécuter ou non ces tools
        return { response, isRelance: relanceCount > 0, hasNewToolCalls: true };
      }

      logger.info(
        `[GroqOrchestrator] 🔁 relance ${relanceCount + 1}/${this.limits.maxRelances} — ${newToolCalls.length} nouveaux tools trace=${traceId}`
      );

      const newToolResults = await this.executeTools(newToolCalls, userToken, sessionId, traceId);

      // Accumulation et relance récursive
      return await this.callLLMWithResults(
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
        `[GroqOrchestrator] ⚠️ limite de relances atteinte — tool calls supplémentaires ignorés trace=${traceId}`
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

  /** Gating strict + feature flag - Utilise maintenant les tools OpenAPI V2 */
  private async getToolsWithGating(agentConfig: any, appContext: any, sessionIdentity: any): Promise<any[]> {
    const hasCapabilities =
      (Array.isArray(agentConfig?.api_v2_capabilities) && agentConfig.api_v2_capabilities.length > 0) ||
      (Array.isArray((agentConfig as any)?.capabilities) && (agentConfig as any).capabilities.length > 0);

    const forceToolsOn = process.env.FORCE_TOOLS_ON === 'true';
    if (!hasCapabilities && !forceToolsOn) {
      logger.info(`[GroqOrchestrator] 🔒 no tools (no capabilities)`);
      return [];
    }
    if (forceToolsOn) {
      logger.warn(`[GroqOrchestrator] ⚠️ FORCE_TOOLS_ON=true — bypass gating`);
    }

    // ✅ CORRECTION: Utiliser les tools OpenAPI V2 au lieu des anciens tools
    try {
      const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
      const tools = getOpenAPIV2Tools();
      
      logger.info(`[GroqOrchestrator] 🔧 ${tools.length} tools OpenAPI V2 chargés`);
      return tools;
    } catch (error) {
      logger.error(`[GroqOrchestrator] ❌ Erreur lors du chargement des tools OpenAPI V2:`, error);
      
      // Fallback vers les anciens tools en cas d'erreur
      let toolCapabilities: string[] = [];
      if (Array.isArray(agentConfig?.api_v2_capabilities)) toolCapabilities = agentConfig.api_v2_capabilities;
      else if (Array.isArray((agentConfig as any)?.capabilities)) toolCapabilities = (agentConfig as any).capabilities;

      await agentApiV2Tools.waitForInitialization();
      return agentApiV2Tools.getToolsForFunctionCalling(toolCapabilities);
    }
  }

  /** Outils actifs pour la relance (mêmes capacités) - Utilise les tools OpenAPI V2 */
  private async getToolsForRelance(agentConfig: any): Promise<any[]> {
    // ✅ CORRECTION: Utiliser les mêmes tools OpenAPI V2 que pour le premier appel
    try {
      const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
      const tools = getOpenAPIV2Tools();
      
      logger.info(`[GroqOrchestrator] 🔧 ${tools.length} tools OpenAPI V2 chargés pour relance`);
      return tools;
    } catch (error) {
      logger.error(`[GroqOrchestrator] ❌ Erreur lors du chargement des tools OpenAPI V2 pour relance:`, error);
      
      // Fallback vers les anciens tools en cas d'erreur
      let toolCapabilities: string[] = [];
      if (Array.isArray(agentConfig?.api_v2_capabilities)) toolCapabilities = agentConfig.api_v2_capabilities;
      else if (Array.isArray((agentConfig as any)?.capabilities)) toolCapabilities = (agentConfig as any).capabilities;

      await agentApiV2Tools.waitForInitialization();
      return agentApiV2Tools.getToolsForFunctionCalling(toolCapabilities);
    }
  }

  /** Configure le provider avec les paramètres de l'agent */
  private getConfiguredProvider(agentConfig?: any): GroqProvider {
    if (!agentConfig) return this.groqProvider;

    const customConfig = {
      model: agentConfig.model || this.groqProvider.config.model,
      temperature: agentConfig.temperature ?? this.groqProvider.config.temperature,
      maxTokens:
        agentConfig.max_tokens || agentConfig.max_completion_tokens || this.groqProvider.config.maxTokens,
      topP: agentConfig.top_p ?? this.groqProvider.config.topP,
      reasoningEffort: agentConfig.reasoning_effort ?? this.groqProvider.config.reasoningEffort,
      serviceTier: agentConfig.service_tier ?? this.groqProvider.config.serviceTier,
      parallelToolCalls:
        agentConfig.parallel_tool_calls !== undefined
          ? agentConfig.parallel_tool_calls
          : this.groqProvider.config.parallelToolCalls
    };

    logger.dev?.(`[GroqOrchestrator] 🎯 Configuration agent:`, {
      model: customConfig.model,
      temperature: customConfig.temperature,
      maxTokens: customConfig.maxTokens,
      reasoningEffort: customConfig.reasoningEffort
    });

    return new GroqProvider(customConfig);
  }

  /** Construction des messages (premier appel) — un seul system mergé */
  private buildMessages(systemContent: string, message: string, history: any[]) {
    const prunedHistory = this.pruneHistoryByBudget(history);
    const msgs: any[] = [];
    if (systemContent) msgs.push({ role: 'system' as const, content: systemContent });
    msgs.push(...prunedHistory.slice(-this.limits.maxContextMessages));
    msgs.push({ role: 'user' as const, content: message });
    return msgs;
  }

  /** Construction des messages (2e appel) — with tool msgs & un seul system mergé */
  private buildMessagesWithResultsIntelligent(
    mergedSystem: string,
    message: string,
    history: any[],
    toolCalls: ToolCall[],
    toolResults: NormalizedToolResult[],
    developerMessage?: ChatMessage | null
  ) {
    const prunedHistory = this.pruneHistoryByBudget(history);

    const userMessage = { role: 'user' as const, content: message };
    const assistantMessage = { role: 'assistant' as const, tool_calls: toolCalls, content: '' };

    const toolMessages = toolResults.map(result => ({
      role: 'tool' as const,
      content: this.truncateToolResult(result),
      tool_call_id: result.tool_call_id,
      name: (result as any)?.tool_name || 'unknown'
    }));

    const msgs: any[] = [];
    if (mergedSystem) msgs.push({ role: 'system' as const, content: mergedSystem });
    if (developerMessage) msgs.push(developerMessage);
    msgs.push(...prunedHistory.slice(-this.limits.maxContextMessages), userMessage, assistantMessage, ...toolMessages);
    return msgs;
  }

  /** Historique nettoyé avec préservation intelligente des tool calls et bornage par taille */
  private cleanHistory(history: any[]): any[] {
    const useful = Array.isArray(history) ? history.slice(-this.limits.maxHistoryMessages) : [];

    const preservedMessages: any[] = [];
    const preservedToolCalls = new Set<string>();

    for (const msg of useful) {
      if (!msg) continue;

      // Assistant avec tool_calls → toujours garder
      if (msg?.role === 'assistant' && msg?.tool_calls) {
        preservedMessages.push(msg);
        for (const tc of msg.tool_calls) {
          const name = tc?.function?.name;
          if (name) preservedToolCalls.add(name);
        }
        continue;
      }

      // Messages tool → garder mais filtrer taille
      if (msg?.role === 'tool') {
        if (typeof msg?.content === 'string' && msg.content.length > 12000) continue;
        preservedMessages.push(msg);
        continue;
      }

      // Autres rôles → filtrer grosses payloads texte
      if (typeof msg?.content === 'string' && msg.content.length > 20000) continue;
      preservedMessages.push(msg);
    }

    logger.dev?.(
      `[GroqOrchestrator] 📚 Historique nettoyé: in=${useful.length} out=${preservedMessages.length} tool_calls_preserved=${Array.from(
        preservedToolCalls
      )}`
    );

    return preservedMessages;
  }

  /** Construit un contexte conversationnel minimal pour éviter les doublons d’actions */
  private buildConversationContext(
    history: any[],
    _currentToolCalls: ToolCall[],
    _currentToolResults: NormalizedToolResult[]
  ): string | null {
    const previousActions = new Map<string, { count: number; lastTimestamp?: string }>();

    for (const msg of history) {
      if (msg?.role === 'assistant' && msg?.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          const toolName = toolCall?.function?.name;
          if (!toolName) continue;
          const existing = previousActions.get(toolName) || { count: 0, lastTimestamp: msg?.timestamp };
          existing.count++;
          existing.lastTimestamp = msg?.timestamp || existing.lastTimestamp;
          previousActions.set(toolName, existing);
        }
      }
    }

    if (previousActions.size === 0) return null;

    const parts: string[] = [];
    parts.push('📋 CONTEXTE CONVERSATIONNEL (anti-duplication) :');
    parts.push('');

    for (const [toolName, info] of Array.from(previousActions.entries())) {
      const timeAgo = info.lastTimestamp ? this.getTimeAgo(info.lastTimestamp) : 'récemment';
      parts.push(`• ${toolName} : exécuté ${info.count} fois (dernière fois ${timeAgo})`);
    }

    parts.push('');
    parts.push('💡 INSTRUCTIONS :');
    parts.push('- Vérifiez si l’action demandée a déjà été effectuée récemment ; éviter les doublons.');
    parts.push('- Si action déjà faite, informer et proposer une alternative ; sinon, procéder normalement.');

    return parts.join('\n');
  }

  /** Merge propre de plusieurs "system" en un seul message */
  private mergeSystemMessages(...systems: (string | null)[]): string {
    return systems.filter(Boolean).join('\n\n');
  }

  /** ✅ ChatGPT-like: Choix libre du LLM à chaque relance */
  private buildDecisionBanner(): string {
    return [
      '🧭 COMPORTEMENT NATUREL (comme ChatGPT) :',
      "- À chaque relance, tu as le CHOIX LIBRE :",
      "  • Si tu as besoin d'autres outils → utilise-les (tool_calls)",
      "  • Si tu as assez d'informations → donne ta réponse finale (sans tool_calls)",
      "- Pas de format de décision spécial requis.",
      "- Continue naturellement jusqu'à ce que tu aies tout ce qu'il faut pour répondre.",
    ].join('\n');
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

  /** Directives claires pour interpréter les tool_results sans halluciner l'état */
  private buildResultsInterpretationBanner(toolResults: NormalizedToolResult[]): string {
    try {
      const hasDeleteSuccess = (toolResults || []).some(r => (r as any)?.tool_name === 'delete_resource' && r.success);
      const hasNotFound = (toolResults || []).some(r => String((r as any)?.code || '').toUpperCase().includes('NOT_FOUND'));

      const lines: string[] = [];
      lines.push('🔎 INTERPRÉTATION DES RÉSULTATS OUTILS (obligatoire) :');
      lines.push('- Décris factuellement ce que les outils VIENNENT DE faire, en te basant UNIQUEMENT sur tool_results.');
      lines.push("- Si delete_resource renvoie success=true, indique que la ressource vient d'être supprimée maintenant.");
      lines.push("- N'indique JAMAIS qu'une action était déjà faite à l'avance sauf si le tool_result renvoie explicitement NOT_FOUND/409 sans exécuter l'action.");
      lines.push('- Ne déduis pas des états secondaires (ex: 404 après suppression) à la place du résultat principal.');

      if (hasDeleteSuccess && !hasNotFound) {
        lines.push("- Pour ce tour: suppression réussie détectée → formule au présent (effectuée maintenant), pas 'déjà supprimée'.");
      }

      return lines.join('\n');
    } catch {
      return '🔎 INTERPRÉTATION OUTILS: Décris exactement le résultat des tools du tour actuel sans inférer des états passés.';
    }
  }

  /** Bannière system pour désactiver explicitement l’usage d’outils quand aucun n’est autorisé */
  private noToolsSystemBanner(): string {
    return '🔒 OUTILS DÉSACTIVÉS POUR CETTE RÉPONSE — produis une réponse textuelle sans appeler de fonctions.';
  }

  /** Calcul du temps écoulé depuis un timestamp */
  private getTimeAgo(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) return 'il y a quelques secondes';
      if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;

      const diffDays = Math.floor(diffHours / 24);
      return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } catch {
      return 'récemment';
    }
  }

  /** Troncature UTF-8 safe (limite ≈ 8KB) */
  private truncateToolResult(result: NormalizedToolResult): string {
    try {
      const content = (result as any)?.details ?? result;
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const bytes = encoder.encode(contentStr);
      if (bytes.length <= 8192) return contentStr;
      const truncated = bytes.slice(0, 8192);
      return decoder.decode(truncated) + '...';
    } catch (e) {
      logger.warn(`[GroqOrchestrator] ⚠️ truncate error`, e);
      return JSON.stringify(result).slice(0, 8192) + '...';
    }
  }

  /** Exécution des tools + persistance (RENVOIE LES RÉSULTATS NORMALISÉS) */
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

      // Masquage éventuel (PII/secrets) — à implémenter si nécessaire dans Normalizer
      await persistenceService.persistToolResult(toolCall.id, toolName, normalized);
      normalizedResults.push(normalized);
    }

    return normalizedResults;
  }

  /** Compat: exécution simple (utilisée pour relance) — renvoie des résultats NORMALISÉS */
  private async executeTools(
    toolCalls: ToolCall[],
    userToken: string,
    sessionId: string,
    traceId: string
  ): Promise<NormalizedToolResult[]> {
    // Réutilise la persistance pour cohérence (logs/outbox)
    const persistenceService = new ToolCallPersistenceService(sessionId, userToken);
    return await this.executeToolsWithPersistence(toolCalls, userToken, sessionId, persistenceService, traceId);
  }

  /** Déduplication des tool calls (signature stable + anti-redite depuis l'historique) */
  private deduplicateToolCalls(toolCalls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    const unique: ToolCall[] = [];

    for (const tc of toolCalls || []) {
      const sig = ToolResultNormalizer.createToolCallSignature(tc as any);
      if (sig && seen.has(sig)) {
        logger.warn(`[GroqOrchestrator] ⚠️ duplicate tool call ignored: ${sig}`);
        continue;
      }

      if (this.isDuplicateAction(tc)) {
        logger.warn(`[GroqOrchestrator] ⚠️ duplicate action detected: ${tc.function?.name} — ignoring`);
        continue;
      }

      if (sig) seen.add(sig);
      unique.push(tc);
    }

    if (unique.length !== (toolCalls || []).length) {
      logger.info(`[GroqOrchestrator] 🔧 dedup: ${unique.length}/${(toolCalls || []).length}`);
    }

    return unique;
  }

  /** Détection d’actions dupliquées via l’historique courant */
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

      // Étendre pour d’autres outils si besoin
      return false;
    } catch (error) {
      logger.warn(`[GroqOrchestrator] ⚠️ Error checking duplicate action:`, error);
      return false;
    }
  }

  /** Recherche d’une note similaire dans l’historique récent */
  private hasSimilarNoteInHistory(title: string, history: any[]): boolean {
    if (!title || !Array.isArray(history) || history.length === 0) return false;

    const normalizedTitle = String(title).toLowerCase().trim();

    for (const msg of history.slice(-30)) {
      if (msg?.role === 'tool' && msg?.name === 'create_note') {
        try {
          const content = typeof msg.content === 'string' ? safeParseJSON(msg.content) : msg.content;
          const existingTitle = content?.note?.title || content?.title;
          if (!existingTitle) continue;

          const normalizedExisting = String(existingTitle).toLowerCase().trim();
          if (
            normalizedTitle === normalizedExisting ||
            normalizedTitle.includes(normalizedExisting) ||
            normalizedExisting.includes(normalizedTitle)
          ) {
            logger.dev?.(`[GroqOrchestrator] 🔍 Note similaire trouvée: "${existingTitle}" ≈ "${title}"`);
            return true;
          }
        } catch {
          // ignore
        }
      }
    }

    return false;
  }

  /** System = uniquement le prompt de l'agent (sinon rien) */
  private getSystemContent(agentConfig: any, appContext?: any): string {
    try {
      if (agentConfig) {
        const templateService = AgentTemplateService.getInstance();
        const context = appContext ?? { type: 'chat_session', name: 'Session de chat', id: 'session', content: '' };
        const rendered = templateService.renderAgentTemplate(agentConfig, context);
        if (rendered?.content && rendered.content.trim().length > 0) {
          logger.dev?.(
            `[GroqOrchestrator] 🎯 instructions agent utilisées: ${agentConfig.name ?? '(sans nom)'}`
          );
          return rendered.content;
        }
      }
    } catch (error) {
      logger.warn(`[GroqOrchestrator] ⚠️ template agent render error`, error);
    }
    logger.dev?.(`[GroqOrchestrator] ⚙️ aucun system par défaut`);
    return '';
  }

  /** Bornage simple par budget de chars ~ proxy tokens (évite explosions mémoire) */
  private pruneHistoryByBudget(history: any[]): any[] {
    if (!Array.isArray(history) || history.length === 0) return [];
    // Budget approximatif : 40k chars (~8k tokens) pour history hors system/user courant
    const CHAR_BUDGET = 40000;

    const pruned: any[] = [];
    let acc = 0;

    // Part de la fin (messages récents)
    for (let i = Math.max(0, history.length - this.limits.maxHistoryMessages); i < history.length; i++) {
      const msg = history[i];
      const size = typeof msg?.content === 'string' ? msg.content.length : 500; // approx si non string
      if (acc + size > CHAR_BUDGET) break;
      pruned.push(msg);
      acc += size;
    }
    return pruned;
  }

  /** Success payload enrichi (flags relance & new tool calls) */
  private createSuccessResponse(
    response: any,
    toolResults: NormalizedToolResult[],
    sessionId: string,
    opts?: { isRelance?: boolean; hasNewToolCalls?: boolean; toolCalls?: ToolCall[]; isFallback?: boolean }
  ): GroqRoundResult {
    // Extraire le content correctement selon la structure de la réponse
    let content = '';

    if (response && typeof response === 'object') {
      // 1) string direct
      if (typeof (response as any).content === 'string') {
        content = (response as any).content;
      }
      // 2) tableaux/segments (certains providers renvoient des chunks)
      else if (Array.isArray((response as any).content)) {
        content = (response as any).content.map((c: any) => c?.text ?? c?.content ?? '').join('');
      }
      // 3) fallback commun (choices/message)
      else if ((response as any)?.choices?.[0]?.message?.content) {
        content = (response as any).choices[0].message.content;
      } else {
        logger.warn('[GroqOrchestrator] ⚠️ Structure de contenu non reconnue:', (response as any)?.content);
      }
    }
    // Si pas de contenu et des toolResults, produire un résumé lisible (comportement ChatGPT-like)
    if (!content.trim() && (toolResults?.length || 0) > 0) {
      content = this.summarizeToolResults(toolResults);
    }

    logger.dev?.('[GroqOrchestrator] 📤 Réponse finale:', {
      success: true,
      content: content.substring(0, 100) + '...',
      contentLength: content.length,
      hasReasoning: !!(response as any)?.reasoning,
      toolCallsCount: (response as any)?.tool_calls?.length || 0,
      toolResultsCount: toolResults.length,
      sessionId,
      isRelance: !!opts?.isRelance,
      hasNewToolCalls: !!opts?.hasNewToolCalls
    });

    // 🔧 Transformer les tool_results pour qu'ils aient les bons champs
    // Pour les relances, inclure une version allégée pour l'affichage immédiat
    const transformedToolResults = toolResults.map(result => ({
      tool_call_id: result.tool_call_id,
      name: result.tool_name, // Utiliser tool_name comme name
      content: JSON.stringify(result.details || result), // Utiliser details comme content
      success: result.success,
      // Conserver les champs originaux pour la compatibilité
      tool_name: result.tool_name,
      details: result.details,
      tool_args: result.tool_args,
      timestamp: result.timestamp
    }));

    return {
      success: true,
      content: content,
      reasoning: (response as any)?.reasoning || '',
      // 🔧 Toujours inclure les tool_calls originaux pour l'affichage, même en relance
      tool_calls: (response as any)?.tool_calls || (opts?.toolCalls ?? []),
      tool_results: transformedToolResults,
      sessionId,
      is_relance: !!opts?.isRelance,
      has_new_tool_calls: !!opts?.hasNewToolCalls,
      isFallback: !!opts?.isFallback
    };
  }

  /** Résumé concis et actionnable des résultats outils (fallback user-friendly) */
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
      lines.push('Souhaitez-vous que je continue ou que j’apporte des modifications supplémentaires ?');
      return lines.join('\n');
    } catch {
      return 'Les outils ont été exécutés. Souhaitez-vous continuer ?';
    }
  }

  /** Erreur fatale (ex: provider KO) */
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
   * Construit le message de rôle 'developer' contenant les définitions des outils.
   */
  private buildDeveloperMessage(tools: any[]): ChatMessage | null {
    if (!tools || tools.length === 0) {
      return null;
    }

    // Formatter les schemas des outils dans la syntaxe attendue
    const toolSchemas = tools
      .map(tool => {
        const name = tool?.function?.name ?? 'unknown_tool';
        const description = tool?.function?.description ?? '';
        const parameters = tool?.function?.parameters ?? {};
        return `
# ${name}
# Description: ${description}
# Parameters:
${JSON.stringify(parameters, null, 2)}
        `.trim();
      })
      .join('\n\n');

    const content = `<|tool_code|>\n${toolSchemas}\n<|/tool_code|>`;

    return {
      id: `msg-dev-${Date.now()}`,
      role: 'developer',
      content,
      timestamp: new Date().toISOString()
      // pas de channel pour developer
    };
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