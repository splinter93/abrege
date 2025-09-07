import { NextResponse } from 'next/server';
import type { GroqRoundParams, GroqRoundResult } from './types/groqTypes';
import { DEFAULT_GROQ_LIMITS } from './types/groqTypes';
import { GroqOrchestrator } from './services/GroqOrchestrator';
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

    // Créer l'orchestrateur avec les limites par défaut
    const orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);

    // Exécuter le round complet
    const result = await orchestrator.executeRound(params);

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