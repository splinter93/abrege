import type { GroqRoundParams, GroqRoundResult, GroqLimits } from '../types/groqTypes';
import { GroqProvider } from '../providers';
import { GroqToolExecutor } from './GroqToolExecutor';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { ToolCallPersistenceService } from './ToolCallPersistenceService';
import { ToolResultNormalizer } from './ToolResultNormalizer';
import { simpleLogger as logger } from '@/utils/logger';
import { AgentTemplateService } from '../agentTemplateService';

/**
 * Orchestrateur Groq — plomberie neutre (ton/personnalité = agent)
 */
export class GroqOrchestrator {
  private limits: GroqLimits = {
    maxToolCalls: 10,
    maxRelances: 1,
    maxContextMessages: 25,
    maxHistoryMessages: 50
  };
  private groqProvider: GroqProvider;
  private toolExecutor: GroqToolExecutor;

  constructor(limits: GroqLimits) {
    this.limits = limits ?? this.limits;
    this.groqProvider = new GroqProvider();
    this.toolExecutor = new GroqToolExecutor(this.limits);
  }

  /**
   * Round : LLM → tools → LLM (+ relance bornée) → réponse (succès/erreur)
   */
  async executeRound(params: GroqRoundParams): Promise<GroqRoundResult> {
    const { message, appContext, sessionHistory, agentConfig, userToken, sessionId } = params;
    const startTime = Date.now();

    // Exposés au catch pour pouvoir relancer proprement via le LLM
    let toolCalls: any[] = [];
    let toolResults: any[] = [];

    try {
      logger.info(`[GroqOrchestrator] 🚀 round start s=${sessionId}`);

      const persistenceService = new ToolCallPersistenceService(sessionId, userToken);

      // 1) Premier appel — propose des tool_calls
      const firstResponse = await this.callLLM(message, sessionHistory, agentConfig, sessionId);
      toolCalls = Array.isArray((firstResponse as any).tool_calls) ? (firstResponse as any).tool_calls : [];

      // Dédup + cap
      toolCalls = this.deduplicateToolCalls(toolCalls);
      if (toolCalls.length > this.limits.maxToolCalls) {
        logger.warn(`[GroqOrchestrator] ⚠️ Tool calls > max (${toolCalls.length} > ${this.limits.maxToolCalls}) — trim`);
        toolCalls = toolCalls.slice(0, this.limits.maxToolCalls);
      }

      if (toolCalls.length === 0) {
        // Pas d’outils → la réponse du LLM fait foi (aucune altération)
        return this.createSuccessResponse(firstResponse, [], sessionId);
      }

      // Persister les tool calls et masquer le content partiel
      await persistenceService.persistToolCalls(toolCalls);
      firstResponse.content = '';

      // 2) Exécution des tools (normalisation + persistance)
      logger.info(`[GroqOrchestrator] 🔧 Exec ${toolCalls.length} tools`);
      toolResults = await this.executeToolsWithPersistence(toolCalls, userToken, sessionId, persistenceService);

      // 3) Deuxième appel — tools actifs, possible relance si le modèle corrige
      const finalResponse = await this.callLLMWithResults(
        message, sessionHistory, toolCalls, toolResults, agentConfig, sessionId, userToken, 0
      );

      const duration = Date.now() - startTime;
      const successCount = toolResults.filter(r => r?.success).length;
      const failureCount = toolResults.filter(r => !r?.success).length;

      logger.info(`[GroqOrchestrator] 📊 round ok s=${sessionId} tools_in=${toolCalls.length} ok=${successCount} ko=${failureCount} chars=${(finalResponse?.content||'').length} dur=${duration}ms`);

      return this.createSuccessResponse(finalResponse, toolResults, sessionId);

    } catch (error) {
      logger.error(`[GroqOrchestrator] ❌ error in round`, error);

      // 👉 Pas de fallback texte : on crée un "résultat outil" synthétique avec l’erreur
      const errResult = {
        tool_call_id: 'orchestrator_error',
        name: 'orchestrator_error',
        result: {
          success: false,
          code: (error as any)?.code || 'ORCHESTRATOR_ERROR',
          message: ((error as any)?.message || String(error || 'Erreur inconnue')).toString().slice(0, 500)
        },
        success: false,
        timestamp: new Date().toISOString()
      };
      toolResults = [...(toolResults || []), errResult];

      // On redonne la main au LLM avec les résultats (il explique / corrige / relance si possible)
      try {
        const response = await this.callLLMWithResults(
          message,
          sessionHistory,
          toolCalls || [],
          toolResults,
          agentConfig,
          sessionId,
          userToken,
          0
        );
        return this.createSuccessResponse(response, toolResults, sessionId);
      } catch (secondary) {
        logger.error(`[GroqOrchestrator] ❌ secondary failure after error-handling`, secondary);
        return this.createErrorResponse(secondary, sessionId); // ultime cas (provider KO, etc.)
      }
    }
  }

  /** Premier appel LLM (avec gating des tools, prompts = ceux de l'agent) */
  private async callLLM(message: string, sessionHistory: any[], agentConfig: any, sessionId: string) {
    const systemContent = this.getSystemContent(agentConfig);
    const messages = this.buildMessages(systemContent, message, sessionHistory);
    const tools = await this.getToolsWithGating(agentConfig);

    const configuredProvider = this.getConfiguredProvider(agentConfig);

    return await configuredProvider.call(
      message,
      { type: 'chat_session', name: `session-${sessionId}`, id: sessionId, content: '' },
      messages,
      tools
    );
  }

  /** Gating strict + feature flag */
  private async getToolsWithGating(agentConfig: any): Promise<any[]> {
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

    let toolCapabilities: string[] = [];
    if (Array.isArray(agentConfig?.api_v2_capabilities)) toolCapabilities = agentConfig.api_v2_capabilities;
    else if (Array.isArray((agentConfig as any)?.capabilities)) toolCapabilities = (agentConfig as any).capabilities;

    await agentApiV2Tools.waitForInitialization();
    return agentApiV2Tools.getToolsForFunctionCalling(toolCapabilities);
  }

  /** Configure le provider avec les paramètres de l'agent */
  private getConfiguredProvider(agentConfig?: any): GroqProvider {
    if (!agentConfig) return this.groqProvider;

    const customConfig = {
      model: agentConfig.model || this.groqProvider.config.model,
      temperature: agentConfig.temperature || this.groqProvider.config.temperature,
      maxTokens: agentConfig.max_tokens || agentConfig.max_completion_tokens || this.groqProvider.config.maxTokens,
      topP: agentConfig.top_p || this.groqProvider.config.topP,
      reasoningEffort: agentConfig.reasoning_effort || this.groqProvider.config.reasoningEffort,
      serviceTier: agentConfig.service_tier || this.groqProvider.config.serviceTier,
      parallelToolCalls: agentConfig.parallel_tool_calls !== undefined ? agentConfig.parallel_tool_calls : this.groqProvider.config.parallelToolCalls
    };

    logger.dev?.(`[GroqOrchestrator] 🎯 Configuration agent:`, {
      model: customConfig.model,
      temperature: customConfig.temperature,
      maxTokens: customConfig.maxTokens,
      reasoningEffort: customConfig.reasoningEffort
    });

    return new GroqProvider(customConfig);
  }

  /**
   * Deuxième appel avec résultats tools — tools actifs pour autoriser une relance (maxRelances)
   */
  private async callLLMWithResults(
    message: string,
    sessionHistory: any[],
    toolCalls: any[],
    toolResults: any[],
    agentConfig: any,
    sessionId: string,
    userToken: string,
    relanceCount: number = 0
  ) {
    const messages = this.buildMessagesWithResultsIntelligent(message, sessionHistory, toolCalls, toolResults, agentConfig);

    // Outils actifs pour permettre au modèle de corriger/relancer
    const tools = await this.getToolsForRelance(agentConfig);
    const configuredProvider = this.getConfiguredProvider(agentConfig);

    let response = await configuredProvider.call(
      message,
      { type: 'chat_session', name: `session-${sessionId}`, id: sessionId, content: '' },
      messages,
      tools
    );

    // Petit retry si réponse trop courte
    if (response?.content && response.content.trim().length < 15) {
      logger.warn(`[GroqOrchestrator] ⚠️ content court (${response.content.length} chars) → retry`);
      response = await configuredProvider.call(
        message,
        { type: 'chat_session', name: `session-${sessionId}`, id: sessionId, content: '' },
        messages,
        tools
      );
    }

    // Nouveaux tool calls ?
    let newToolCalls: any[] = Array.isArray((response as any).tool_calls) ? (response as any).tool_calls : [];
    newToolCalls = this.deduplicateToolCalls(newToolCalls);
    if (newToolCalls.length > this.limits.maxToolCalls) {
      logger.warn(`[GroqOrchestrator] ⚠️ relance tool calls > max — trim`);
      newToolCalls = newToolCalls.slice(0, this.limits.maxToolCalls);
    }

    if (newToolCalls.length > 0 && relanceCount < this.limits.maxRelances) {
      logger.info(`[GroqOrchestrator] 🔁 relance ${relanceCount + 1}/${this.limits.maxRelances} — ${newToolCalls.length} nouveaux tools`);
      const newToolResults = await this.executeTools(newToolCalls, userToken, sessionId);

      return await this.callLLMWithResults(
        message,
        sessionHistory,
        [...toolCalls, ...newToolCalls],
        [...toolResults, ...newToolResults],
        agentConfig,
        sessionId,
        userToken,
        relanceCount + 1
      );
    } else if (newToolCalls.length > 0) {
      logger.warn(`[GroqOrchestrator] ⚠️ limite de relances atteinte — tool calls supplémentaires ignorés`);
    }

    return response;
  }

  /** Construction des messages (avec outillage) — prompts = agent seulement */
  private buildMessagesWithResultsIntelligent(
    message: string,
    history: any[],
    toolCalls: any[],
    toolResults: any[],
    agentConfig?: any
  ) {
    const systemContent = this.getSystemContent(agentConfig);
    const cleanedHistory = this.cleanHistory(history);

    const userMessage = { role: 'user' as const, content: message };
    const assistantMessage = { role: 'assistant' as const, tool_calls: toolCalls, content: '' };

    const toolMessages = toolResults.map(result => ({
      role: 'tool' as const,
      content: this.truncateToolResult(result),
      tool_call_id: result.tool_call_id,
      name: result.name
    }));

    const msgs: any[] = [];
    if (systemContent) msgs.push({ role: 'system' as const, content: systemContent });
    msgs.push(...cleanedHistory, userMessage, assistantMessage, ...toolMessages);
    return msgs;
  }

  private async getToolsForRelance(agentConfig: any): Promise<any[]> {
    let toolCapabilities: string[] = [];
    if (Array.isArray(agentConfig?.api_v2_capabilities)) toolCapabilities = agentConfig.api_v2_capabilities;
    else if (Array.isArray((agentConfig as any)?.capabilities)) toolCapabilities = (agentConfig as any).capabilities;

    await agentApiV2Tools.waitForInitialization();
    return agentApiV2Tools.getToolsForFunctionCalling(toolCapabilities);
  }

  /** Historique nettoyé */
  private cleanHistory(history: any[]): any[] {
    const useful = history.slice(-this.limits.maxContextMessages);
    return useful.filter(msg => {
      if (msg?.role === 'tool' && typeof msg?.content === 'string' && msg.content.length > 12000) return false;
      if (typeof msg?.content === 'string' && msg.content.length > 20000) return false;
      return true;
    });
  }

  /** Troncature UTF-8 safe */
  private truncateToolResult(result: any): string {
    try {
      const content = result?.result ?? result; // fallback
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

  /** Exécution des tools + persistance */
  private async executeToolsWithPersistence(
    toolCalls: any[],
    userToken: string,
    sessionId: string,
    persistenceService: ToolCallPersistenceService
  ) {
    const uniqueToolCalls = this.deduplicateToolCalls(toolCalls);
    const context = { userToken, batchId: `batch-${Date.now()}`, maxRetries: 3 };

    const rawResults = await this.toolExecutor.executeTools(uniqueToolCalls, context);

    for (let i = 0; i < uniqueToolCalls.length; i++) {
      const toolCall = uniqueToolCalls[i];
      const rawResult = rawResults[i];

      const validation = ToolResultNormalizer.validateToolArguments(toolCall);
      if (!validation.isValid) {
        const errorResult = {
          success: false,
          code: 'VALIDATION_ERROR',
          message: validation.error || 'Arguments invalides',
          details: null,
          tool_name: toolCall.function?.name || 'unknown',
          tool_args: toolCall.function?.arguments || {},
          tool_call_id: toolCall.id,
          timestamp: new Date().toISOString()
        };
        await persistenceService.persistToolResult(toolCall.id, toolCall.function?.name || 'unknown', errorResult);
        continue;
      }

      const toolArgs = safeParseJSON(toolCall.function?.arguments || '{}');
      const normalizedResult = ToolResultNormalizer.normalizeToolResult(
        toolCall.function?.name || 'unknown',
        toolCall.id,
        toolArgs,
        rawResult
      );

      await persistenceService.persistToolResult(toolCall.id, toolCall.function?.name || 'unknown', normalizedResult);
    }

    return rawResults;
  }

  /** Déduplication des tool calls (signature stable) */
  private deduplicateToolCalls(toolCalls: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const tc of toolCalls) {
      const sig = ToolResultNormalizer.createToolCallSignature(tc);
      if (seen.has(sig)) {
        logger.warn(`[GroqOrchestrator] ⚠️ duplicate tool call ignored: ${sig}`);
        continue;
      }
      seen.add(sig);
      unique.push(tc);
    }
    if (unique.length !== toolCalls.length) {
      logger.info(`[GroqOrchestrator] 🔧 dedup: ${unique.length}/${toolCalls.length}`);
    }
    return unique;
  }

  /** Compat: exécution simple (utilisée pour relance) */
  private async executeTools(toolCalls: any[], userToken: string, sessionId: string) {
    const context = { userToken, batchId: `batch-${Date.now()}`, maxRetries: 3 };
    return await this.toolExecutor.executeTools(toolCalls, context);
  }

  /** Messages du 1er appel */
  private buildMessages(systemContent: string, message: string, history: any[]) {
    const msgs: any[] = [];
    if (systemContent) msgs.push({ role: 'system' as const, content: systemContent });
    msgs.push(...history.slice(-this.limits.maxContextMessages));
    msgs.push({ role: 'user' as const, content: message });
    return msgs;
  }

  /** System = uniquement le prompt de l’agent (sinon rien) */
  private getSystemContent(agentConfig?: any): string {
    if (agentConfig) {
      try {
        const templateService = AgentTemplateService.getInstance();
        const context = { type: 'chat_session', name: 'Session de chat', id: 'session', content: '' };
        const rendered = templateService.renderAgentTemplate(agentConfig, context);
        if (rendered?.content && rendered.content.trim().length > 0) {
          logger.dev?.(`[GroqOrchestrator] 🎯 instructions agent utilisées: ${agentConfig.name ?? '(sans nom)'}`);
          return rendered.content;
        }
      } catch (error) {
        logger.warn(`[GroqOrchestrator] ⚠️ template agent render error`, error);
      }
    }
    // Aucun prompt par défaut pour ne pas écraser la personnalité de l’agent
    logger.dev?.(`[GroqOrchestrator] ⚙️ aucun system par défaut`);
    return '';
  }

  /** Success payload */
  private createSuccessResponse(response: any, toolResults: any[], sessionId: string): GroqRoundResult {
    return {
      success: true,
      content: response?.content || '',
      reasoning: response?.reasoning || '',
      tool_calls: (response as any)?.tool_calls || [],
      tool_results: toolResults,
      sessionId,
      is_relance: false,
      has_new_tool_calls: false
    };
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
}

/** Utils */
function safeParseJSON(input: any): any {
  try { return JSON.parse(input ?? '{}'); } catch { return {}; }
}