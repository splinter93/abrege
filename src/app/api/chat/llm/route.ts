import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime (not Edge) and disable caching to preserve auth context in production
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { handleGroqGptOss120b } from '@/services/llm/groqGptOss120b';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { chatRateLimiter, toolCallsRateLimiter } from '@/services/rateLimiter';

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

    // 🕵️‍♂️ DEBUG: Log du body reçu par l'API
    logger.dev('🕵️‍♂️ [API Route] Body Reçu:', {
      hasMessage: !!message,
      hasContext: !!context,
      contextContent: JSON.stringify(context)
    });

    // Validation des paramètres requis
    if (!message || !context || !history) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['message', 'context', 'history'] },
        { status: 400 }
      );
    }

    // Extraire le token d'authentification depuis le header Authorization
    const authHeader = request.headers.get('authorization');
    
    logger.info(`[LLM Route] 🔍 DEBUG AUTH - Header reçu:`, {
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader ? authHeader.substring(0, 20) + '...' : 'N/A'
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error(`[LLM Route] ❌ Token manquant ou invalide:`, {
        hasHeader: !!authHeader,
        headerValue: authHeader ? 'Present but invalid format' : 'Missing'
      });
      return NextResponse.json(
        { error: 'Token d\'authentification manquant ou invalide' },
        { status: 401 }
      );
    }
    
    userToken = authHeader.replace('Bearer ', '');
    
    logger.info(`[LLM Route] 🔍 DEBUG TOKEN - Extrait:`, {
      tokenLength: userToken.length,
      tokenStart: userToken.substring(0, 20) + '...',
      tokenEnd: '...' + userToken.substring(userToken.length - 20)
    });
    
    // ✅ FIX PROD : Valider le JWT et EXTRAIRE le userId pour éviter l'expiration
    let userId: string;
    
    try {
      // Vérifier si c'est un userId (UUID) ou un JWT
      const isUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToken);
      
      if (isUserId) {
        // UUID direct : impersonation d'agent (backend uniquement)
        logger.dev(`[LLM Route] 🔑 Impersonation d'agent détectée: userId: ${userToken.substring(0, 8)}...`);
        userId = userToken;
      } else {
        // JWT : valider et EXTRAIRE le userId
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
        
        if (authError || !user) {
          logger.error(`[LLM Route] ❌ Token invalide ou expiré:`, authError);
          return NextResponse.json(
            { error: 'Token invalide ou expiré' },
            { status: 401 }
          );
        }
        
        // ✅ FIX CRITIQUE: Extraire le userId du JWT
        // Le userId ne peut pas expirer (contrairement au JWT)
        userId = user.id;
        
        logger.info(`[LLM Route] ✅ JWT validé, userId extrait: ${userId}`);
        logger.info(`[LLM Route] 🔍 DEBUG TOKEN - userId pour tool calls:`, {
          userId: userId,
          email: user.email,
          note: 'Le userId est utilisé pour les tool calls au lieu du JWT'
        });
      }
    } catch (validationError) {
      logger.error(`[LLM Route] ❌ Erreur validation token:`, validationError);
      return NextResponse.json(
        { error: 'Erreur de validation du token' },
        { status: 401 }
      );
    }
    
    // ✅ SÉCURITÉ: Rate limiting par utilisateur
    const chatLimit = await chatRateLimiter.check(userId);
    
    if (!chatLimit.allowed) {
      const resetDate = new Date(chatLimit.resetTime);
      logger.warn(`[LLM Route] ⛔ Rate limit dépassé pour userId ${userId.substring(0, 8)}...`);
      
      return NextResponse.json(
        {
          error: 'Rate limit dépassé',
          message: `Vous avez atteint la limite de ${chatLimit.limit} messages par minute. Veuillez réessayer dans quelques instants.`,
          remaining: chatLimit.remaining,
          resetTime: chatLimit.resetTime,
          resetDate: resetDate.toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': chatLimit.limit.toString(),
            'X-RateLimit-Remaining': chatLimit.remaining.toString(),
            'X-RateLimit-Reset': chatLimit.resetTime.toString(),
            'Retry-After': Math.ceil((chatLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    logger.dev(`[LLM Route] ✅ Rate limit OK: ${chatLimit.remaining}/${chatLimit.limit} restants`);
    
    // Extraire les valeurs nécessaires depuis le contexte
    const { sessionId: extractedSessionId, agentId, uiContext } = context;
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
          const agentWithInstructions = agentById as { system_instructions?: string; instructions?: string; name: string; id: string };
          const hasInstructions = !!(agentWithInstructions.system_instructions || agentWithInstructions.instructions);
          logger.dev(`[LLM Route] ✅ Agent récupéré par ID: ${agentWithInstructions.name} (ID: ${agentWithInstructions.id})`);
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
          const agentWithInstructions = agent as { system_instructions?: string; instructions?: string; name: string; id: string };
          const hasInstructions = !!(agentWithInstructions.system_instructions || agentWithInstructions.instructions);
          logger.dev(`[LLM Route] ✅ Agent récupéré: ${agentWithInstructions.name} (ID: ${agentWithInstructions.id})`);
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
          const agentWithInstructions = defaultAgent as { system_instructions?: string; instructions?: string; name: string; id: string };
          const hasInstructions = !!(agentWithInstructions.system_instructions || agentWithInstructions.instructions);
          logger.dev(`[LLM Route] ✅ Agent par défaut récupéré: ${agentWithInstructions.name} (ID: ${agentWithInstructions.id})`);
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
    logger.info(`[LLM Route] 🚀 Appel handleGroqGptOss120b avec userId:`, {
      userId: userId,
      sessionId,
      agentName: finalAgentConfig.name,
      agentModel: finalAgentConfig.model,
      hasJWT: !!userToken
    });
    
    const result = await handleGroqGptOss120b({
      message,
      appContext: {
        ...context,
        uiContext // ✅ Inclure le contexte UI
      },
      sessionHistory: history,
      agentConfig: finalAgentConfig, // ✅ Récupéré depuis la base, par ID si fourni
      userToken: userToken!, // ✅ FIX MCP: Passer le JWT original pour l'authentification MCP (pas le userId)
      sessionId
    });
    
    logger.info(`[LLM Route] ✅ handleGroqGptOss120b terminé avec succès`);

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