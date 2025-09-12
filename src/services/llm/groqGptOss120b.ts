import { NextResponse } from 'next/server';
import type { GroqRoundParams, GroqRoundResult } from './types/groqTypes';
import { DEFAULT_GROQ_LIMITS } from './types/groqTypes';
import { simpleChatOrchestrator } from './services/SimpleChatOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Point d'entrée refactorisé pour l'API Groq GPT OSS 120B
 * 
 * Cette version utilise une architecture modulaire avec :
 * - Séparation des responsabilités
 * - Typage strict
 * - Gestion d'erreurs centralisée
 * - Code plus maintenable et testable
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

    // Utiliser l'orchestrateur SimpleChat (singleton)
    const chatResult = await simpleChatOrchestrator.processMessage(
      params.message,
      params.sessionHistory || [],
      {
        userToken: params.userToken,
        sessionId: params.sessionId,
        agentConfig: params.agentConfig,
        uiContext: params.appContext?.uiContext // ✅ CORRECTION : Contexte UI transmis
      }
    );

    // Convertir le résultat SimpleChat vers le format GroqRoundResult
    const result: GroqRoundResult = {
      success: chatResult.success,
      content: chatResult.content,
      tool_results: chatResult.toolResults?.map(tr => ({
        tool_call_id: tr.tool_call_id,
        name: tr.name,
        content: tr.content,
        success: tr.success
      })) || [],
      reasoning: chatResult.reasoning,
      status: chatResult.success ? 200 : 500
    };

    // Retourner la réponse appropriée
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: result.status || 500 });
    }

  } catch (error) {
    logger.error(`[Groq API] ❌ Erreur fatale:`, {
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