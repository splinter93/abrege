import { NextResponse } from 'next/server';
import type { GroqRoundParams, GroqRoundResult } from './types/groqTypes';
import { DEFAULT_GROQ_LIMITS } from './types/groqTypes';
import { agentOrchestrator } from './services/AgentOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Point d'entrée pour l'API Groq GPT OSS 120B avec MCP
 */
export async function handleGroqGptOss120b(params: GroqRoundParams): Promise<NextResponse<GroqRoundResult>> {
  const { sessionId } = params;

  try {
    // 🔧 Validation des paramètres d'entrée
    if (!params.message) {
      throw new Error('Message manquant dans les paramètres');
    }
    if (!params.sessionId) {
      throw new Error('SessionId manquant dans les paramètres');
    }
    if (!params.userToken) {
      throw new Error('UserToken manquant dans les paramètres');
    }

    logger.info(`[Groq API] 🚀 Début du traitement pour la session ${sessionId}`, {
      messageLength: params.message.length,
      hasContext: !!params.appContext,
      hasHistory: !!params.sessionHistory,
      historyLength: params.sessionHistory?.length || 0,
      hasAgentConfig: !!params.agentConfig,
      agentName: params.agentConfig?.name || 'default'
    });

    // 🕵️‍♂️ DEBUG: Log du contexte applicatif reçu
    logger.dev('🕵️‍♂️ [Groq Service] Contexte Applicatif Reçu:', {
      appContext: params.appContext
    });

    // ✨ Normaliser agentConfig pour compatibilité TypeScript
    const normalizedAgentConfig = params.agentConfig ? {
      ...params.agentConfig,
      reasoning_effort: typeof params.agentConfig.reasoning_effort === 'number' 
        ? 'high' as const
        : (params.agentConfig.reasoning_effort || 'high' as const)
    } : undefined;

    // Utiliser l'orchestrateur simple
    logger.info(`[Groq API] 🎯 Lancement AgentOrchestrator pour session ${sessionId}`);
    const orchestratorStart = Date.now();
    
    // ✅ Merger attachedNotes dans uiContext pour qu'elles soient injectées dans le prompt
    const uiContextWithNotes = params.appContext?.uiContext ? {
      ...params.appContext.uiContext,
      ...(params.appContext.attachedNotes && params.appContext.attachedNotes.length > 0 && {
        attachedNotes: params.appContext.attachedNotes
      })
    } : undefined;
    
    // 📎 LOG: Notes attachées détectées
    if (params.appContext?.attachedNotes && params.appContext.attachedNotes.length > 0) {
      logger.info('[Groq API] 📎 Notes attachées détectées:', {
        count: params.appContext.attachedNotes.length,
        titles: params.appContext.attachedNotes.map(n => n.title)
      });
    }
    
    const chatResult = await agentOrchestrator.processMessage(
      params.message,
      {
        userToken: params.userToken,
        sessionId: params.sessionId,
        agentConfig: normalizedAgentConfig,
        uiContext: uiContextWithNotes,
        maxToolCalls: 20
      },
      params.sessionHistory || []
    );
    
    const orchestratorDuration = Date.now() - orchestratorStart;
    logger.info(`[Groq API] ✅ Session terminée (${orchestratorDuration}ms):`, {
      toolCallsCount: chatResult.toolCalls?.length || 0,
      toolResultsCount: chatResult.toolResults?.length || 0,
      finishReason: chatResult.finishReason
    });

    // Convertir le résultat vers le format GroqRoundResult
    const result: GroqRoundResult = {
      success: true,
      content: chatResult.content || '',
      tool_calls: chatResult.toolCalls || [],
      tool_results: chatResult.toolResults?.map(tr => ({
        tool_call_id: tr.tool_call_id,
        name: tr.name,
        content: tr.content,
        success: tr.success,
        timestamp: new Date().toISOString()
      })) || [],
      thinking: [],
      progress: [],
      // is_relance = true si on a du contenu final (fin de conversation)
      // Même sans tool calls, si on a du contenu, c'est une réponse finale
      is_relance: true,
      sessionId: params.sessionId,
      status: 200
    };

    return NextResponse.json(result);

  } catch (error) {
    logger.dev(`[Groq API] ❌ Erreur fatale:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      sessionId,
      hasMessage: !!params.message,
      hasContext: !!params.appContext,
      hasHistory: !!params.sessionHistory,
      hasAgentConfig: !!params.agentConfig
    });
    
    const errorResult: GroqRoundResult = {
      success: false,
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error),
      sessionId,
      status: 500
    };

    return NextResponse.json(errorResult, { status: 500 });
  }
} 