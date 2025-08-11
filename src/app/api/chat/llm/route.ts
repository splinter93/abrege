import { NextRequest, NextResponse } from 'next/server';
import { handleGroqGptOss120b } from '@/services/llm/groqGptOss120b';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

// Client Supabase admin pour accéder aux agents
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, history, provider, channelId } = body;

    // Validation des paramètres requis
    if (!message || !context || !history || !channelId) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['message', 'context', 'history', 'channelId'] },
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
    
    const userToken = authHeader.replace('Bearer ', '');
    
    // Extraire les valeurs nécessaires depuis le contexte
    const { sessionId, agentId } = context;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId manquant dans le contexte' },
        { status: 400 }
      );
    }

    logger.info(`[LLM Route] 🚀 Démarrage pour session ${sessionId} avec provider ${provider}`);

    // 🎯 Récupérer l'agentConfig depuis la base de données
    let agentConfig: any = null;

    try {
      // 1) Priorité à l'agent explicitement sélectionné
      if (agentId) {
        logger.dev(`[LLM Route] 🔍 Récupération de l'agent par ID: ${agentId}`);
        const { data: agentById, error: agentByIdError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .eq('is_active', true)
          .single();

        if (agentByIdError) {
          logger.warn(`[LLM Route] ⚠️ Erreur récupération agent par ID: ${agentByIdError.message}`);
        } else if (agentById) {
          agentConfig = agentById;
          const hasInstructions = !!(agentById.system_instructions || (agentById as any).instructions);
          logger.dev(`[LLM Route] ✅ Agent récupéré par ID: ${agentById.name} (ID: ${agentById.id})`);
          logger.dev(`[LLM Route] 🎯 Configuration agent (ID):`, {
            model: agentById.model,
            temperature: agentById.temperature,
            max_tokens: agentById.max_tokens,
            instructions: hasInstructions ? '✅ Présentes' : '❌ Manquantes',
            context_template: agentById.context_template ? '✅ Présent' : '❌ Manquant',
            api_config: agentById.api_config ? '✅ Présent' : '❌ Manquant',
            capabilities: agentById.capabilities?.length || 0,
            api_v2_capabilities: agentById.api_v2_capabilities?.length || 0
          });
        }
      }

      // 2) Sinon fallback par provider
      if (!agentConfig && provider) {
        logger.dev(`[LLM Route] 🔍 Récupération de l'agent pour le provider: ${provider}`);
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('provider', provider)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (agentError) {
          logger.warn(`[LLM Route] ⚠️ Erreur récupération agent ${provider}: ${agentError.message}`);
        } else if (agent) {
          agentConfig = agent;
          const hasInstructions = !!(agent.system_instructions || (agent as any).instructions);
          logger.dev(`[LLM Route] ✅ Agent récupéré: ${agent.name} (ID: ${agent.id})`);
          logger.dev(`[LLM Route] 🎯 Configuration agent (provider):`, {
            model: agent.model,
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
            instructions: hasInstructions ? '✅ Présentes' : '❌ Manquantes',
            context_template: agent.context_template ? '✅ Présent' : '❌ Manquant',
            api_config: agent.api_config ? '✅ Présent' : '❌ Manquant',
            capabilities: agent.capabilities?.length || 0,
            api_v2_capabilities: agent.api_v2_capabilities?.length || 0
          });
        } else {
          logger.warn(`[LLM Route] ⚠️ Aucun agent trouvé pour le provider: ${provider}`);
        }
      }
    } catch (error) {
      logger.error(`[LLM Route] ❌ Erreur lors de la récupération de l'agent: ${error}`);
    }

    // Appel à la logique Groq OSS 120B avec l'agentConfig récupéré
    const result = await handleGroqGptOss120b({
      message,
      appContext: context,
      sessionHistory: history,
      agentConfig: agentConfig, // ✅ Récupéré depuis la base, par ID si fourni
      incomingChannelId: channelId,
      userToken,
      sessionId
    });

    logger.info(`[LLM Route] ✅ Session ${sessionId} terminée avec succès`);
    return result;

  } catch (error) {
    logger.error(`[LLM Route] ❌ Erreur fatale: ${error}`);

    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}