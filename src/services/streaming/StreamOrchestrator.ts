/**
 * StreamOrchestrator - Orchestre le flow complet du streaming SSE
 * 
 * Responsabilité unique : Coordonner StreamParser, ToolCallTracker, TimelineCapture
 * 
 * @module services/streaming/StreamOrchestrator
 */

import { simpleLogger as logger } from '@/utils/logger';
import { StreamParser } from './StreamParser';
import { ToolCallTracker } from './ToolCallTracker';
import { TimelineCapture } from './TimelineCapture';
import { XmlToolCallParser } from './XmlToolCallParser';
import type { ToolCall, ToolResult } from '@/hooks/useChatHandlers';
import type { StreamTimeline } from '@/types/streamTimeline';

/**
 * Erreur de streaming enrichie
 */
export interface StreamErrorDetails {
  error: string;
  provider?: string;
  model?: string;
  statusCode?: number;
  roundCount?: number;
  recoverable?: boolean;
  timestamp?: number;
  errorCode?: string;
}

/**
 * Callbacks pour les événements streaming
 */
export interface StreamCallbacks {
  onStreamStart?: () => void;
  onStreamChunk?: (content: string) => void;
  onStreamEnd?: () => void;
  onToolCalls?: (toolCalls: ToolCall[], toolName: string) => void;
  onToolExecution?: (toolCount: number, toolCalls: ToolCall[]) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onComplete?: (
    fullContent: string,
    fullReasoning: string,
    toolCalls?: ToolCall[],
    toolResults?: ToolResult[],
    streamTimeline?: StreamTimeline
  ) => void;
  onError?: (error: string | StreamErrorDetails) => void;
  // ✅ NOUVEAU : Callback pour info modèle (debug)
  onModelInfo?: (modelInfo: {
    original: string;
    current: string;
    wasOverridden: boolean;
    reasons: string[];
  }) => void;
}

/**
 * Résultat du streaming
 */
export interface StreamResult {
  success: boolean;
  content: string;
  reasoning: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  timeline: StreamTimeline;
  error?: string;
}

/**
 * Service pour orchestrer le flow complet du streaming
 */
export class StreamOrchestrator {
  private readonly parser: StreamParser;
  private readonly toolTracker: ToolCallTracker;
  private readonly timeline: TimelineCapture;

  // Accumulateurs de contenu
  private allContent: string = '';
  private currentRoundReasoning: string = '';
  private currentRoundContent: string = ''; // ✅ Accumulateur pour détecter XML complet
  
  // Collecte des tool results
  private readonly allToolResults: ToolResult[] = [];

  constructor() {
    this.parser = new StreamParser();
    this.toolTracker = new ToolCallTracker();
    this.timeline = new TimelineCapture();
  }

  /**
   * Traite le streaming d'une réponse SSE
   * @param response - Response fetch avec body ReadableStream
   * @param callbacks - Callbacks pour les événements
   * @returns Promise<StreamResult>
   */
  async processStream(
    response: Response,
    callbacks: StreamCallbacks
  ): Promise<StreamResult> {
    try {
      if (!response.body) {
        throw new Error('Response body is null');
      }

      callbacks.onStreamStart?.();

      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          logger.dev('[StreamOrchestrator] ✅ Stream terminé');
          break;
        }

        // Parser le chunk
        const chunks = this.parser.parseChunk(value);

        // Traiter chaque chunk parsé
        for (const chunk of chunks) {
          await this.processChunk(chunk, callbacks);
        }
      }

      callbacks.onStreamEnd?.();

      // Construire le résultat final
      const result = this.buildFinalResult();

      // Appeler onComplete
      callbacks.onComplete?.(
        result.content,
        result.reasoning,
        result.toolCalls,
        result.toolResults,
        result.timeline
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('[StreamOrchestrator] ❌ Erreur streaming:', error);
      
      // ✅ Si l'erreur vient du stream (déjà appelé dans processChunk), ne pas rappeler onError
      // Sinon, c'est une erreur réseau/autre → créer un objet d'erreur basique
      const isStreamError = error instanceof Error && error.message.includes('Erreur stream');
      
      if (!isStreamError) {
        callbacks.onError?.({
          error: errorMessage,
          timestamp: Date.now()
        });
      }

      return {
        success: false,
        content: '',
        reasoning: '',
        toolCalls: [],
        toolResults: [],
        timeline: this.timeline.getTimeline(),
        error: errorMessage
      };
    }
  }

  /**
   * Traite un chunk individuel
   * @param chunk - Chunk parsé
   * @param callbacks - Callbacks
   */
  private async processChunk(
    chunk: ReturnType<StreamParser['parseChunk']>[number],
    callbacks: StreamCallbacks
  ): Promise<void> {
    switch (chunk.type) {
      case 'start':
        logger.dev('[StreamOrchestrator] 🚀 Stream démarré');
        // ✅ NOUVEAU : Capturer modelInfo si présent
        if (chunk.modelInfo) {
          callbacks.onModelInfo?.(chunk.modelInfo);
        }
        break;

      case 'delta':
        this.processDeltaChunk(chunk, callbacks);
        break;

      case 'tool_execution':
        this.processToolExecutionChunk(chunk, callbacks);
        break;

      case 'tool_result':
        this.processToolResultChunk(chunk, callbacks);
        break;

      case 'assistant_round_complete':
        this.processAssistantRoundComplete(chunk, callbacks);
        break;

      case 'done':
        logger.dev('[StreamOrchestrator] 🏁 Stream [DONE]', {
          contentLength: this.allContent.length,
          toolCallsCount: this.toolTracker.getAllToolCalls().length,
          toolResultsCount: this.allToolResults.length,
          timelineEvents: this.timeline.getState().itemCount
        });
        break;

      case 'error':
        // ✅ Construire objet d'erreur enrichi depuis le chunk SSE
        const errorDetails: StreamErrorDetails = {
          error: chunk.error || 'Erreur stream inconnue',
          provider: (chunk as { provider?: string }).provider,
          model: (chunk as { model?: string }).model,
          statusCode: (chunk as { statusCode?: number }).statusCode,
          roundCount: (chunk as { roundCount?: number }).roundCount,
          recoverable: (chunk as { recoverable?: boolean }).recoverable,
          timestamp: (chunk as { timestamp?: number }).timestamp,
          errorCode: (chunk as { errorCode?: string }).errorCode
        };
        
        logger.error('[StreamOrchestrator] ❌ Erreur streaming enrichie:', errorDetails);
        
        // ✅ Passer l'objet complet au callback
        callbacks.onError?.(errorDetails);
        
        // Throw pour interrompre le stream
        throw new Error(chunk.error || 'Erreur stream');
    }
  }

  /**
   * Traite un chunk delta (contenu texte/reasoning/tool_calls)
   */
  private processDeltaChunk(
    chunk: { content?: string; reasoning?: string; tool_calls?: Array<{ id: string; type?: string; function?: { name?: string; arguments?: string } }> },
    callbacks: StreamCallbacks
  ): void {
    // ✅ GROK FIX: Accumuler le content pour détecter le XML complet
    // Le XML arrive par morceaux dans le stream, on doit tester sur l'accumulation
    if (chunk.content) {
      this.currentRoundContent += chunk.content;
    }
    
    // ✅ Détecter et convertir les tool calls XML si présents dans l'accumulation
    let processedContent = chunk.content || '';
    let extractedToolCalls: ToolCall[] = [];
    
    // Tester sur l'accumulation complète, pas sur le chunk individuel
    if (this.currentRoundContent && XmlToolCallParser.hasXmlToolCalls(this.currentRoundContent)) {
      logger.warn('[StreamOrchestrator] ⚠️ XML tool calls détectés dans content accumulé (format Grok incorrect)');
      
      const { cleanContent, toolCalls } = XmlToolCallParser.parseXmlToolCalls(this.currentRoundContent);
      
      // Remplacer tout le content accumulé par la version nettoyée
      const oldLength = this.currentRoundContent.length;
      this.currentRoundContent = cleanContent;
      extractedToolCalls = toolCalls;
      
      // Calculer ce qui reste à ajouter
      const alreadyEmitted = this.allContent.length;
      processedContent = this.currentRoundContent.substring(alreadyEmitted);
      
      logger.info(`[StreamOrchestrator] 🧹 Content nettoyé: ${oldLength} → ${cleanContent.length} chars`);
      
      // ✅ Ajouter les tool calls extraits au tracker
      if (extractedToolCalls.length > 0) {
        for (const tc of extractedToolCalls) {
          this.toolTracker.addToolCall({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          });
        }
        logger.info(`[StreamOrchestrator] ✅ ${extractedToolCalls.length} tool calls extraits du XML et ajoutés au tracker`);
      }
    }

    // Content progressif (nettoyé si XML était présent)
    if (processedContent) {
      this.allContent += processedContent;
      callbacks.onStreamChunk?.(processedContent);

      // Ajouter à la timeline
      this.timeline.addTextEvent(processedContent);
    }

    // Reasoning progressif
    if (chunk.reasoning) {
      this.currentRoundReasoning += chunk.reasoning;
    }

    // Tool calls progressifs (format natif)
    if (chunk.tool_calls && Array.isArray(chunk.tool_calls)) {
      for (const tc of chunk.tool_calls) {
        this.toolTracker.addToolCall(tc);
      }
    }
    
    // ✅ GROK FIX: Les tool calls extraits du XML ont déjà été ajoutés au tracker ci-dessus
    // Pas besoin de les traiter à nouveau ici
  }

  /**
   * Traite un chunk tool_execution
   */
  private processToolExecutionChunk(
    chunk: { toolCount?: number },
    callbacks: StreamCallbacks
  ): void {
    logger.dev(`[StreamOrchestrator] 🔧 Exécution de ${chunk.toolCount || 0} tools...`);

    // Notifier les nouveaux tool calls (onToolCalls)
    const toolCallsToNotify = this.toolTracker.getNewToolCallsForNotification();
    if (toolCallsToNotify.length > 0) {
      callbacks.onToolCalls?.(toolCallsToNotify, 'stream');
      this.toolTracker.markNotified(toolCallsToNotify);
    }

    // Notifier pour exécution (onToolExecution)
    const newToolCallsForExecution = this.toolTracker.getNewToolCallsForExecution();
    if (newToolCallsForExecution.length > 0) {
      callbacks.onToolExecution?.(chunk.toolCount || 0, newToolCallsForExecution);
      this.toolTracker.markExecutionNotified(newToolCallsForExecution);

      // Ajouter à la timeline
      this.timeline.addToolExecutionEvent(newToolCallsForExecution, chunk.toolCount || 0);
    }

    // Passer au prochain round
    this.timeline.incrementRound();
    this.toolTracker.clearCurrentRound();
    this.currentRoundContent = ''; // ✅ Reset pour le prochain round
  }

  /**
   * Traite un chunk tool_result
   */
  private processToolResultChunk(
    chunk: { toolName?: string; toolCallId?: string; result?: unknown; success?: boolean },
    callbacks: StreamCallbacks
  ): void {
    logger.dev(`[StreamOrchestrator] ✅ Tool result: ${chunk.toolName}`);

    const toolResult: ToolResult = {
      tool_call_id: chunk.toolCallId || `call_${Date.now()}`,
      name: chunk.toolName || 'unknown_tool',
      content: typeof chunk.result === 'string' ? chunk.result : JSON.stringify(chunk.result || {}),
      success: chunk.success || false
    };

    this.allToolResults.push(toolResult);

    // Ajouter à la timeline
    this.timeline.addToolResultEvent(
      toolResult.tool_call_id,
      toolResult.name,
      chunk.result,
      toolResult.success
    );

    // Notifier
    callbacks.onToolResult?.(
      chunk.toolName || '',
      chunk.result,
      chunk.success || false,
      chunk.toolCallId
    );
  }

  /**
   * Traite un événement assistant_round_complete
   * Cet événement contient les tool_calls qui doivent être affichés dans la timeline
   * ⚠️ IMPORTANT : Pour les MCP tools x.ai, ils sont déjà exécutés côté serveur
   * On doit SEULEMENT les afficher dans la timeline, PAS les exécuter
   */
  private processAssistantRoundComplete(
    chunk: { 
      finishReason?: string; 
      content?: string;
      tool_calls?: Array<{ 
        id: string; 
        type?: string; 
        function?: { name?: string; arguments?: string } 
      }> 
    },
    callbacks: StreamCallbacks
  ): void {
    logger.dev(`[StreamOrchestrator] 🔵 Round terminé:`, { 
      finishReason: chunk.finishReason,
      toolCallsCount: chunk.tool_calls?.length || 0
    });

    // ✅ Si le round contient des tool_calls, les ajouter à la timeline ET notifier le hook
    // ⚠️ IMPORTANT : Pour les MCP tools x.ai, ils sont déjà exécutés côté serveur
    // On doit les afficher dans la timeline MAIS aussi notifier le hook pour qu'il les ajoute
    if (chunk.tool_calls && chunk.tool_calls.length > 0) {
      logger.dev(`[StreamOrchestrator] 🔧 ${chunk.tool_calls.length} tool call(s) dans round complete (MCP déjà exécutés)`);
      
      // Ajouter les tool calls au tracker (pour historique complet)
      for (const tc of chunk.tool_calls) {
        this.toolTracker.addToolCall(tc);
      }

      // ✅ CRITICAL FIX: Vérifier si les tool calls ont déjà été notifiés pour exécution
      // Si oui, ne pas les notifier à nouveau pour éviter la duplication
      const toolCallsForTimeline = this.toolTracker.getNewToolCallsForExecution();
      if (toolCallsForTimeline.length > 0) {
        // ✅ FIX: Seulement notifier si pas déjà notifiés
        // Les tool calls déjà notifiés dans processToolExecutionChunk ne doivent pas être notifiés à nouveau
        callbacks.onToolExecution?.(toolCallsForTimeline.length, toolCallsForTimeline);
        this.toolTracker.markExecutionNotified(toolCallsForTimeline);
        
        // Ajouter à la timeline
        this.timeline.addToolExecutionEvent(toolCallsForTimeline, toolCallsForTimeline.length);
        
        logger.dev(`[StreamOrchestrator] ✅ ${toolCallsForTimeline.length} tool call(s) ajouté(s) à la timeline ET notifié au hook`);
      } else {
        // ✅ FIX: Si tous les tool calls ont déjà été notifiés, ne pas les notifier à nouveau
        logger.dev(`[StreamOrchestrator] ⏭️ Tool calls déjà notifiés, skip duplication`);
      }

      // Passer au prochain round
      this.timeline.incrementRound();
      this.toolTracker.clearCurrentRound();
      this.currentRoundContent = '';
    }
  }

  /**
   * Construit le résultat final
   */
  private buildFinalResult(): StreamResult {
    return {
      success: true,
      content: this.allContent,
      reasoning: this.currentRoundReasoning,
      toolCalls: this.toolTracker.getAllToolCalls(),
      toolResults: this.allToolResults,
      timeline: this.timeline.getTimeline()
    };
  }

  /**
   * Réinitialise l'orchestrateur pour un nouveau stream
   */
  reset(): void {
    this.parser.reset();
    this.toolTracker.reset();
    this.timeline.reset();
    this.allContent = '';
    this.currentRoundReasoning = '';
    this.currentRoundContent = ''; // ✅ Reset accumulateur XML
    this.allToolResults.length = 0;
  }
}

