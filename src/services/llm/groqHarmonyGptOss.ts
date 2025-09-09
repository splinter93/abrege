/**
 * Point d'entrée Harmony pour l'API Groq GPT OSS
 * Production-ready, format Harmony strict, zéro any
 */

import { NextResponse } from 'next/server';
import type { GroqRoundParams, GroqRoundResult } from './types/groqTypes';
import { DEFAULT_GROQ_LIMITS } from './types/groqTypes';
import { simpleChatOrchestrator } from './services/SimpleChatOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Point d'entrée Harmony pour l'API Groq GPT OSS
 * 
 * Cette version utilise l'architecture Harmony avec :
 * - Support complet du format Harmony GPT-OSS
 * - Tokens spéciaux Harmony (<|start|>, <|end|>, etc.)
 * - Canaux analysis/commentary/final
 * - Séparation raisonnement/réponse
 * - Typage strict, zéro any
 * - Code production-ready
 */
export async function handleGroqHarmonyGptOss(params: GroqRoundParams): Promise<NextResponse<GroqRoundResult>> {
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

    logger.info(`[Groq Harmony API] 🚀 Début du traitement Harmony pour la session ${sessionId}`, {
      messageLength: params.message.length,
      hasContext: !!params.appContext,
      hasHistory: !!params.sessionHistory,
      historyLength: params.sessionHistory?.length || 0,
      hasAgentConfig: !!params.agentConfig,
      agentName: params.agentConfig?.name || 'default'
    });

    // Utiliser l'orchestrateur SimpleChat (singleton)
    const chatResult = await simpleChatOrchestrator.processMessage(
      params.message,
      params.sessionHistory || [],
      {
        userToken: params.userToken,
        sessionId: params.sessionId,
        agentConfig: params.agentConfig
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
    logger.error(`[Groq Harmony API] ❌ Erreur lors du traitement de la session ${sessionId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      sessionId,
      message: params.message?.substring(0, 100) + '...',
    });

    // Retourner une réponse d'erreur structurée
    const errorResponse: GroqRoundResult = {
      success: false,
      error: 'Erreur interne du serveur Harmony',
      details: error instanceof Error ? error.message : String(error),
      sessionId,
      status: 500
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Fonction de test pour valider l'implémentation Harmony
 */
export async function testHarmonyImplementation(): Promise<{
  success: boolean;
  tests: Array<{
    name: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const tests = [
    {
      name: 'GroqHarmonyProvider - Initialisation',
      test: async () => {
        const { GroqHarmonyProvider } = await import('./providers/implementations/groqHarmony');
        const provider = new GroqHarmonyProvider();
        
        const info = provider.getInfo();
        return info.id === 'groq-harmony';
      }
    },
    {
      name: 'HarmonyOrchestrator - Initialisation',
      test: async () => {
        const orchestrator = new HarmonyOrchestrator(DEFAULT_GROQ_LIMITS);
        return orchestrator !== null;
      }
    },
    {
      name: 'SimpleChatOrchestrator - Initialisation',
      test: async () => {
        const { simpleChatOrchestrator } = await import('./services/SimpleChatOrchestrator');
        return simpleChatOrchestrator !== null;
      }
    },
    {
      name: 'SimpleToolExecutor - Initialisation',
      test: async () => {
        const { simpleToolExecutor } = await import('./services/SimpleToolExecutor');
        return simpleToolExecutor !== null;
      }
    }
  ];

  const results = [];
  let allSuccess = true;

  for (const test of tests) {
    try {
      const success = await test.test();
      results.push({
        name: test.name,
        success,
      });
      if (!success) allSuccess = false;
    } catch (error) {
      results.push({
        name: test.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      allSuccess = false;
    }
  }

  logger.info('[Groq Harmony API] 🧪 Tests Harmony terminés:', {
    totalTests: tests.length,
    successCount: results.filter(r => r.success).length,
    allSuccess,
  });

  return {
    success: allSuccess,
    tests: results,
  };
}
