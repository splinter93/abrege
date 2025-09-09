import { NextRequest, NextResponse } from 'next/server';
import { handleGroqGptOss120b } from '@/services/llm/groqGptOss120b';
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

    logger.info(`[LLM Route] 🚀 Démarrage pour session ${sessionId} avec provider ${provider}`);

    // 🎯 Récupérer l'agentConfig depuis la base de données
    let agentConfig: { id: string; name: string; config: Record<string, unknown> } | null = null;

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

      // 3) Fallback final : premier agent actif disponible
      if (!agentConfig) {
        logger.dev(`[LLM Route] 🔍 Récupération du premier agent actif disponible`);
        const { data: defaultAgent, error: defaultAgentError } = await supabase
          .from('agents')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (defaultAgentError) {
          logger.warn(`[LLM Route] ⚠️ Erreur récupération agent par défaut: ${defaultAgentError.message}`);
        } else if (defaultAgent) {
          agentConfig = defaultAgent;
          const hasInstructions = !!(defaultAgent.system_instructions || (defaultAgent as any).instructions);
          logger.dev(`[LLM Route] ✅ Agent par défaut récupéré: ${defaultAgent.name} (ID: ${defaultAgent.id})`);
          logger.dev(`[LLM Route] 🎯 Configuration agent par défaut:`, {
            model: defaultAgent.model,
            temperature: defaultAgent.temperature,
            max_tokens: defaultAgent.max_tokens,
            instructions: hasInstructions ? '✅ Présentes' : '❌ Manquantes',
            context_template: defaultAgent.context_template ? '✅ Présent' : '❌ Manquant',
            api_config: defaultAgent.api_config ? '✅ Présent' : '❌ Manquant',
            capabilities: defaultAgent.capabilities?.length || 0,
            api_v2_capabilities: defaultAgent.api_v2_capabilities?.length || 0
          });
        } else {
          logger.warn(`[LLM Route] ⚠️ Aucun agent actif trouvé dans la base de données`);
        }
      }

      // 🔧 CORRECTION : Ajouter les scopes par défaut si l'agent n'en a pas
      if (agentConfig) {
        // Vérifier si l'agent a des scopes configurés
        const hasScopes = agentConfig.api_v2_capabilities && agentConfig.api_v2_capabilities.length > 0;
        
        if (!hasScopes) {
          logger.warn(`[LLM Route] ⚠️ Agent ${agentConfig.name} n'a pas de scopes configurés, ajout des scopes par défaut`);
          
          // Mettre à jour l'agent avec les scopes par défaut
          const { error: updateError } = await supabase
            .from('agents')
            .update({ 
              api_v2_capabilities: DEFAULT_AGENT_SCOPES 
            })
            .eq('id', agentConfig.id);

          if (updateError) {
            logger.error(`[LLM Route] ❌ Erreur mise à jour scopes agent: ${updateError.message}`);
          } else {
            logger.info(`[LLM Route] ✅ Scopes par défaut ajoutés à l'agent ${agentConfig.name}`);
            // Mettre à jour la config locale
            agentConfig.api_v2_capabilities = DEFAULT_AGENT_SCOPES;
          }
        } else {
          logger.info(`[LLM Route] ✅ Agent ${agentConfig.name} a déjà des scopes configurés: ${agentConfig.api_v2_capabilities?.length || 0}`);
        }
      }

    } catch (error) {
      logger.error(`[LLM Route] ❌ Erreur lors de la récupération de l'agent: ${error}`);
    }

    // Configuration par défaut si aucun agent n'est trouvé
    const finalAgentConfig = agentConfig || {
      id: 'default-agent',
      name: 'Agent par défaut',
      model: 'openai/gpt-oss-20b',
      provider: 'groq',
      temperature: 0.7,
      max_tokens: 4000,
      system_instructions: 'Tu es un assistant IA utile et compétent.',
      api_v2_capabilities: DEFAULT_AGENT_SCOPES
    };

    // Appel à la logique Groq OSS 120B avec l'agentConfig récupéré
    const result = await handleGroqGptOss120b({
      message,
      appContext: context,
      sessionHistory: history,
      agentConfig: finalAgentConfig, // ✅ Récupéré depuis la base, par ID si fourni
      userToken,
      sessionId
    });

    logger.info(`[LLM Route] ✅ Session ${sessionId} terminée avec succès`);
    return result;

  } catch (error) {
    logger.error(`[LLM Route] ❌ Erreur fatale:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: sessionId || 'unknown',
      message: message?.substring(0, 100) + '...',
      hasContext: !!context,
      hasHistory: !!history
    });

    // 🔧 Gestion spéciale des erreurs Groq 500 - on fournit une réponse de fallback
    if (error instanceof Error && error.message.includes('Groq API error: 500')) {
      logger.warn(`[LLM Route] ⚠️ Erreur Groq 500 détectée, fourniture d'une réponse de fallback`);
      
      return NextResponse.json({
        success: true, // ✅ On considère comme succès pour permettre la persistance
        content: "Je comprends votre demande. Malheureusement, je rencontre actuellement des difficultés techniques temporaires qui m'empêchent de traiter votre requête de manière optimale. Votre message a bien été enregistré et je pourrai y répondre plus en détail une fois ces problèmes résolus. En attendant, n'hésitez pas à reformuler votre question ou à essayer une approche différente.",
        reasoning: "Service Groq temporairement indisponible - réponse de fallback intelligente fournie pour maintenir l'expérience utilisateur",
        tool_calls: [],
        tool_results: [],
        sessionId: sessionId || 'unknown',
        status: 200,
        isFallback: true // Marqueur pour identifier les réponses de fallback
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        sessionId: sessionId || 'unknown',
        timestamp: new Date().toISOString(),
        // En développement, inclure plus de détails
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
          errorType: error instanceof Error ? error.constructor.name : typeof error
        })
      },
      { status: 500 }
    );
  }
}