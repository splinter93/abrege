/**
 * Point d'entrée Harmony pour l'API Groq GPT OSS
 * Production-ready, format Harmony strict, zéro any
 */

import { NextResponse } from 'next/server';
import type { GroqRoundParams, GroqRoundResult } from './types/groqTypes';
import { DEFAULT_GROQ_LIMITS } from './types/groqTypes';
import { HarmonyOrchestrator } from './services/HarmonyOrchestrator';
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

    // Créer l'orchestrateur Harmony avec les limites par défaut
    const orchestrator = new HarmonyOrchestrator(DEFAULT_GROQ_LIMITS);

    // Exécuter le round Harmony complet
    const result = await orchestrator.executeRound(params);

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
      name: 'HarmonyFormatter - Formatage de message',
      test: async () => {
        const { HarmonyFormatter } = await import('./services/HarmonyFormatter');
        const formatter = new HarmonyFormatter();
        
        const message = {
          role: 'system' as const,
          content: 'Test message',
          timestamp: new Date().toISOString(),
        };
        
        const result = formatter.formatMessage(message);
        return result.success;
      }
    },
    {
      name: 'HarmonyBuilder - Construction de message',
      test: async () => {
        const { HarmonyBuilder } = await import('./services/HarmonyBuilder');
        const builder = new HarmonyBuilder();
        
        const message = builder.buildSystemMessage('Test system message');
        return message.role === 'system' && message.content === 'Test system message';
      }
    },
    {
      name: 'HarmonyHistoryBuilder - Construction d\'historique',
      test: async () => {
        const { HarmonyHistoryBuilder } = await import('./services/HarmonyHistoryBuilder');
        const builder = new HarmonyHistoryBuilder(DEFAULT_GROQ_LIMITS);
        
        const result = builder.buildInitialHistory(
          'System content',
          'User message',
          [],
          [],
          { sessionId: 'test-session' }
        );
        
        return result.isValid;
      }
    },
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
