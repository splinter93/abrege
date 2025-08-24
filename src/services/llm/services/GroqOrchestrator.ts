import type { GroqRoundParams, GroqRoundResult, GroqLimits } from '../types/groqTypes';
import { GroqProvider } from '../providers';
import { GroqToolExecutor } from './GroqToolExecutor';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { ToolCallPersistenceService } from './ToolCallPersistenceService';
import { ToolResultNormalizer } from './ToolResultNormalizer';
import { simpleLogger as logger } from '@/utils/logger';
import { AgentTemplateService } from '../agentTemplateService';

/**
 * Types internes stricts pour fiabiliser le pipeline
 */
type ToolCall = {
  id: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

type NormalizedToolResult = {
  tool_call_id: string;
  name: string;
  success: boolean;
  result: unknown;
  timestamp: string;
  code?: string;
  message?: string;
};

/**
 * Orchestrateur Groq — plomberie neutre (ton/personnalité = agent)
 * 2-passes LLM + exécution d'outils, relance bornée, normalisation & persistance.
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

  /** Historique courant (pour dédup intelligente des actions) */
  private currentHistoryRef: any[] = [];

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
      const firstResponse = await this.callLLM(message, sessionHistory, agentConfig, sessionId, traceId);
      toolCalls = Array.isArray((firstResponse as any).tool_calls) ? (firstResponse as any).tool_calls : [];

      // Dédup + cap
      toolCalls = this.deduplicateToolCalls(toolCalls);
      if (toolCalls.length > this.limits.maxToolCalls) {
        logger.warn(`[GroqOrchestrator] ⚠️ Tool calls > max (${toolCalls.length} > ${this.limits.maxToolCalls}) — trim`);
        toolCalls = toolCalls.slice(0, this.limits.maxToolCalls);
      }

      if (toolCalls.length === 0) {
        // Pas d’outils → la réponse du LLM fait foi (aucune altération)
        const duration = Date.now() - startTime;
        logger.info(`[GroqOrchestrator] ✅ round ok (no tools) s=${sessionId} dur=${duration}ms chars=${(firstResponse?.content || '').length}`);
        return this.createSuccessResponse(firstResponse, [], sessionId, { isRelance: false, hasNewToolCalls: false });
      }

      // Persister les tool calls et masquer le content partiel avant de repasser au LLM
      await persistenceService.persistToolCalls(toolCalls);
      (firstResponse as any).content = '';

      // 2) Exécution des tools (normalisation + persistance)
      logger.info(`[GroqOrchestrator] 🔧 Exec ${toolCalls.length} tools`);
      toolResults = await this.executeToolsWithPersistence(toolCalls, userToken, sessionId, persistenceService, traceId);

      // 3) Deuxième appel — tools actifs, possible relance si le modèle corrige
      const { response: finalResponse, isRelance, hasNewToolCalls } = await this.callLLMWithResults(
        message,
        sessionHistory,
        toolCalls,
        toolResults,
        agentConfig,
        sessionId,
        userToken,
        0,
        traceId
      );

      const duration = Date.now() - startTime;
      const successCount = toolResults.filter(r => r?.success).length;
      const failureCount = toolResults.filter(r => !r?.success).length;

      logger.info(
        `[GroqOrchestrator] 📊 round ok s=${sessionId} trace=${traceId} tools_in=${toolCalls.length} ok=${successCount} ko=${failureCount} chars=${(finalResponse?.content || '').length} dur=${duration}ms`
      );

      return this.createSuccessResponse(finalResponse, toolResults, sessionId, {
        isRelance,
        hasNewToolCalls
      });

    } catch (error: any) {
      logger.error(`[GroqOrchestrator] ❌ error in round trace=${traceId}`, error);

      // 👉 Pas de fallback texte : on crée un "résultat outil" synthétique avec l’erreur
      const errResult: NormalizedToolResult = {
        tool_call_id: 'orchestrator_error',
        name: 'orchestrator_error',
        result: {
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
        return this.createSuccessResponse(response, toolResults, sessionId, { isRelance, hasNewToolCalls });
      } catch (secondary) {
        logger.error(`[GroqOrchestrator] ❌ secondary failure after error-handling trace=${traceId}`, secondary);
        return this.createErrorResponse(secondary, sessionId);
      }
    }
  }

  /** Premier appel LLM (avec gating des tools, prompts = ceux de l'agent) */
  private async callLLM(
    message: string,
    sessionHistory: any[],
    agentConfig: any,
    sessionId: string,
    traceId: string
  ) {
    const systemContent = this.getSystemContent(agentConfig);
    const tools = await this.getToolsWithGating(agentConfig);

    // Historique nettoyé & borné en budget simple
    const cleanedHistory = this.cleanHistory(sessionHistory);
    const conversationContext = this.buildConversationContext(cleanedHistory, [], []);
    const mergedSystem = this.mergeSystemMessages(systemContent, tools.length === 0 ? this.noToolsSystemBanner() : null, conversationContext);

    const messages = this.buildMessages(mergedSystem, message, cleanedHistory);

    const configuredProvider = this.getConfiguredProvider(agentConfig);

    logger.dev?.(`[GroqOrchestrator] 🔧 Tools (callLLM):`, {
      toolsCount: tools.length,
      toolNames: tools.slice(0, 5).map(t => t.function?.name || 'unknown')
    });

    // Appel provider (tool_choice explicite non garanti par le provider — on signale via system banner quand tools=[])
    const response = await configuredProvider.call(
      message,
      { type: 'chat_session', name: `session-${sessionId}`, id: sessionId, content: '' },
      messages,
      tools
    );

    logger.dev?.(`[GroqOrchestrator] 📥 Provider response:`, {
      hasContent: !!response?.content,
      contentLength: response?.content?.length || 0,
      hasToolCalls: !!(response as any)?.tool_calls,
      toolCallsCount: (response as any)?.tool_calls?.length || 0,
      traceId
    });

    return {
      content: response?.content || '',
      tool_calls: (response as any)?.tool_calls || [],
      model: (configuredProvider as any)?.config?.model,
      usage: (response as any)?.usage || null
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
    traceId: string
  ): Promise<{ response: any; isRelance: boolean; hasNewToolCalls: boolean }> {
    const tools = await this.getToolsForRelance(agentConfig);

    // Historique nettoyé & borné
    const cleanedHistory = this.cleanHistory(sessionHistory);
    const systemContent = this.getSystemContent(agentConfig);
    const conversationContext = this.buildConversationContext(cleanedHistory, toolCalls, toolResults);
    const mergedSystem = this.mergeSystemMessages(systemContent, null, conversationContext);

    const messages = this.buildMessagesWithResultsIntelligent(
      mergedSystem,
      message,
      cleanedHistory,
      toolCalls,
      toolResults
    );

    const configuredProvider = this.getConfiguredProvider(agentConfig);

    let response = await configuredProvider.call(
      message,
      { type: 'chat_session', name: `session-${sessionId}`, id: sessionId, content: '' },
      messages,
      tools
    );

    // Re-try léger si réponse trop courte (souvent hallucination/latence tool)
    if (response?.content && response.content.trim().length < 15) {
      logger.warn(`[GroqOrchestrator] ⚠️ content court (${response.content.length} chars) → retry trace=${traceId}`);
      response = await configuredProvider.call(
        message,
        { type: 'chat_session', name: `session-${sessionId}`, id: sessionId, content: '' },
        messages,
        tools
      );
    }

    // Nouveaux tool calls ?
    let newToolCalls: ToolCall[] = Array.isArray((response as any).tool_calls) ? (response as any).tool_calls : [];
    newToolCalls = this.deduplicateToolCalls(newToolCalls);

    if (newToolCalls.length > this.limits.maxToolCalls) {
      logger.warn(`[GroqOrchestrator] ⚠️ relance tool calls > max — trim`);
      newToolCalls = newToolCalls.slice(0, this.limits.maxToolCalls);
    }

    if (newToolCalls.length > 0 && relanceCount < this.limits.maxRelances) {
      logger.info(`[GroqOrchestrator] 🔁 relance ${relanceCount + 1}/${this.limits.maxRelances} — ${newToolCalls.length} nouveaux tools trace=${traceId}`);

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
        traceId
      );
    } else if (newToolCalls.length > 0) {
      logger.warn(`[GroqOrchestrator] ⚠️ limite de relances atteinte — tool calls supplémentaires ignorés trace=${traceId}`);
      return { response, isRelance: relanceCount > 0, hasNewToolCalls: true };
    }

    return { response, isRelance: relanceCount > 0, hasNewToolCalls: false };
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

  /** Outils actifs pour la relance (mêmes capacités) */
  private async getToolsForRelance(agentConfig: any): Promise<any[]> {
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
      temperature: agentConfig.temperature ?? this.groqProvider.config.temperature,
      maxTokens: agentConfig.max_tokens || agentConfig.max_completion_tokens || this.groqProvider.config.maxTokens,
      topP: agentConfig.top_p ?? this.groqProvider.config.topP,
      reasoningEffort: agentConfig.reasoning_effort ?? this.groqProvider.config.reasoningEffort,
      serviceTier: agentConfig.service_tier ?? this.groqProvider.config.serviceTier,
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
    toolResults: NormalizedToolResult[]
  ) {
    const prunedHistory = this.pruneHistoryByBudget(history);

    const userMessage = { role: 'user' as const, content: message };
    const assistantMessage = { role: 'assistant' as const, tool_calls: toolCalls, content: '' };

    const toolMessages = toolResults.map(result => ({
      role: 'tool' as const,
      content: this.truncateToolResult(result),
      tool_call_id: result.tool_call_id,
      name: result.name
    }));

    const msgs: any[] = [];
    if (mergedSystem) msgs.push({ role: 'system' as const, content: mergedSystem });
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
      `[GroqOrchestrator] 📚 Historique nettoyé: in=${useful.length} out=${preservedMessages.length} tool_calls_preserved=${Array.from(preservedToolCalls)}`
    );

    return preservedMessages;
  }

  /** Construit un contexte conversationnel minimal pour éviter les doublons d’actions */
  private buildConversationContext(history: any[], currentToolCalls: ToolCall[], currentToolResults: NormalizedToolResult[]): string | null {
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

    for (const [toolName, info] of previousActions) {
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
  private truncateToolResult(result: any): string {
    try {
      const content = result?.result ?? result;
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
          result: {
            success: false,
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Arguments invalides'
          },
          name: toolName,
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
  private async executeTools(toolCalls: ToolCall[], userToken: string, sessionId: string, traceId: string): Promise<NormalizedToolResult[]> {
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
    opts?: { isRelance?: boolean; hasNewToolCalls?: boolean }
  ): GroqRoundResult {
    // Extraire le content correctement selon la structure de la réponse
    let content = '';
    if (response && typeof response === 'object') {
      if (typeof response.content === 'string') {
        content = response.content;
      } else if (response.content && typeof response.content === 'object' && typeof response.content.content === 'string') {
        content = response.content.content;
      }
    }

    return {
      success: true,
      content: content,
      reasoning: response?.reasoning || '',
      tool_calls: (response as any)?.tool_calls || [],
      tool_results: toolResults,
      sessionId,
      is_relance: !!opts?.isRelance,
      has_new_tool_calls: !!opts?.hasNewToolCalls
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