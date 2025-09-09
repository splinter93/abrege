/**
 * Route API Harmony pour le chat - Support complet du format Harmony GPT-OSS
 * Production-ready, format strict, zéro any
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleGroqHarmonyGptOss } from '@/services/llm/groqHarmonyGptOss';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

// Client Supabase admin pour accéder aux agents
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔧 SCOPES PAR DÉFAUT POUR LES AGENTS SPÉCIALISÉS
const DEFAULT_AGENT_SCOPES = [
  'notes:read', 'notes:write', 'notes:create', 'notes:update', 'notes:delete',
  'classeurs:read', 'classeurs:write', 'classeurs:create', 'classeurs:update', 'classeurs:delete',
  'dossiers:read', 'dossiers:write', 'dossiers:create', 'dossiers:update', 'dossiers:delete',
  'files:read', 'files:write', 'files:upload', 'files:delete',
  'agents:execute', 'agents:read',
  'search:content', 'profile:read'
];

export async function POST(request: NextRequest) {
  // Extraire les variables en dehors du try pour qu'elles soient accessibles dans le catch
  let sessionId: string | undefined;
  let userToken: string | undefined;
  
  try {
    const body = await request.json();
    const { message, context, history, provider } = body;

    // Validation des paramètres requis
    if (!message || !context || !history) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['message', 'context', 'history'] },
        { status: 400 }
      );
    }

    // Extraire le token d'authentification depuis le header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant ou invalide' },
        { status: 401 }
      );
    }
    
    userToken = authHeader.replace('Bearer ', '');
    
    // Extraire les valeurs nécessaires depuis le contexte
    const { sessionId: extractedSessionId, agentId } = context;
    sessionId = extractedSessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId manquant dans le contexte' },
        { status: 400 }
      );
    }

    logger.info(`[LLM Harmony Route] 🚀 Démarrage Harmony pour session ${sessionId}`, {
      messageLength: message.length,
      hasAgentId: !!agentId,
      historyLength: history.length,
      provider: provider || 'default'
    });

    // 🔧 Récupération de la configuration de l'agent
    let agentConfig = null;
    
    if (agentId) {
      logger.info(`[LLM Harmony Route] 🔍 Recherche de l'agent ${agentId}`);
      
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('is_active', true)
        .single();

      if (agentError) {
        logger.warn(`[LLM Harmony Route] ⚠️ Erreur lors de la récupération de l'agent ${agentId}:`, agentError);
      } else if (agent) {
        agentConfig = agent;
        logger.info(`[LLM Harmony Route] ✅ Agent trouvé: ${agent.name}`, {
          model: agent.model,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
          capabilities: agent.capabilities?.length || 0,
          api_v2_capabilities: agent.api_v2_capabilities?.length || 0
        });
      } else {
        logger.warn(`[LLM Harmony Route] ⚠️ Agent ${agentId} non trouvé ou inactif`);
      }
    } else {
      // 🔧 Si aucun agent spécifique, utiliser l'agent par défaut
      logger.info(`[LLM Harmony Route] 🔍 Recherche de l'agent par défaut`);
      
      const { data: defaultAgent, error: defaultAgentError } = await supabase
        .from('agents')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (defaultAgentError) {
        logger.warn(`[LLM Harmony Route] ⚠️ Erreur lors de la récupération de l'agent par défaut:`, defaultAgentError);
      } else if (defaultAgent) {
        agentConfig = defaultAgent;
        logger.info(`[LLM Harmony Route] ✅ Agent par défaut trouvé: ${defaultAgent.name}`, {
          model: defaultAgent.model,
          temperature: defaultAgent.temperature,
          max_tokens: defaultAgent.max_tokens,
          instructions: defaultAgent.instructions ? '✅ Présentes' : '❌ Manquantes',
          context_template: defaultAgent.context_template ? '✅ Présent' : '❌ Manquant',
          api_config: defaultAgent.api_config ? '✅ Présent' : '❌ Manquant',
          capabilities: defaultAgent.capabilities?.length || 0,
          api_v2_capabilities: defaultAgent.api_v2_capabilities?.length || 0
        });
      } else {
        logger.warn(`[LLM Harmony Route] ⚠️ Aucun agent actif trouvé dans la base de données`);
      }
    }

    // 🔧 CORRECTION : Ajouter les scopes par défaut si l'agent n'en a pas
    if (agentConfig) {
      // Vérifier si l'agent a des scopes configurés
      const hasScopes = agentConfig.api_v2_capabilities && agentConfig.api_v2_capabilities.length > 0;
      
      if (!hasScopes) {
        logger.warn(`[LLM Harmony Route] ⚠️ Agent ${agentConfig.name} n'a pas de scopes configurés, ajout des scopes par défaut`);
        
        // Mettre à jour l'agent avec les scopes par défaut
        const { error: updateError } = await supabase
          .from('agents')
          .update({ 
            api_v2_capabilities: DEFAULT_AGENT_SCOPES 
          })
          .eq('id', agentConfig.id);

        if (updateError) {
          logger.error(`[LLM Harmony Route] ❌ Erreur lors de la mise à jour des scopes:`, updateError);
        } else {
          logger.info(`[LLM Harmony Route] ✅ Scopes par défaut ajoutés à l'agent ${agentConfig.name}`);
          // Mettre à jour la config locale
          agentConfig.api_v2_capabilities = DEFAULT_AGENT_SCOPES;
        }
      }
    }

    // 🔧 Appel à la logique Harmony Groq OSS
    logger.info(`[LLM Harmony Route] 🎼 Appel Harmony Groq OSS pour session ${sessionId}`);
    
    const result = await handleGroqHarmonyGptOss({
      message,
      appContext: context,
      sessionHistory: history,
      agentConfig: agentConfig,
      userToken,
      sessionId
    });

    logger.info(`[LLM Harmony Route] ✅ Session Harmony ${sessionId} terminée avec succès`, {
      success: result.success,
      hasContent: !!(result.content),
      contentLength: result.content?.length || 0,
      hasToolCalls: !!(result.tool_calls?.length),
      toolCallsCount: result.tool_calls?.length || 0,
      hasToolResults: !!(result.tool_results?.length),
      toolResultsCount: result.tool_results?.length || 0,
      isRelance: result.is_relance,
      hasNewToolCalls: result.has_new_tool_calls
    });

    return result;

  } catch (error) {
    logger.error(`[LLM Harmony Route] ❌ Erreur lors du traitement de la session ${sessionId || 'unknown'}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      sessionId,
      userToken: userToken ? 'present' : 'missing'
    });

    // Retourner une réponse d'erreur structurée
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur Harmony',
      details: error instanceof Error ? error.message : String(error),
      sessionId: sessionId || 'unknown',
      status: 500
    }, { status: 500 });
  }
}

/**
 * Endpoint de test pour valider l'implémentation Harmony
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('[LLM Harmony Route] 🧪 Test de l\'implémentation Harmony');
    
    // Importer et exécuter les tests
    const { testHarmonyImplementation } = await import('@/services/llm/groqHarmonyGptOss');
    const testResults = await testHarmonyImplementation();
    
    return NextResponse.json({
      success: true,
      message: 'Tests Harmony exécutés',
      testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[LLM Harmony Route] ❌ Erreur lors des tests Harmony:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors des tests Harmony',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
