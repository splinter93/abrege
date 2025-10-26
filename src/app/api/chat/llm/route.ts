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
    
    // Valider le JWT et EXTRAIRE le userId pour éviter l'expiration
    let userId: string;
    
    try {
      // Vérifier si c'est un userId (UUID) ou un JWT
      const isUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToken);
      
      if (isUserId) {
        // UUID direct : impersonation d'agent (backend uniquement)
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
        
        // Extraire le userId du JWT
        userId = user.id;
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
        }
      }

      // 2) Sinon fallback par provider
      if (!agentConfig && provider) {
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
        } else {
          logger.warn(`[LLM Route] ⚠️ Aucun agent trouvé pour le provider: ${provider}`);
        }
      }

      // 3) Fallback final : premier agent actif disponible
      if (!agentConfig) {
        const { data: defaultAgent, error: defaultAgentError} = await supabase
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
            // Mettre à jour la config locale
            agentConfig.api_v2_capabilities = DEFAULT_AGENT_SCOPES;
          }
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
    
    // 🔍 DEBUG: Log de l'agent config envoyé à l'orchestrateur
    logger.info(`[LLM Route] 📤 Envoi à l'orchestrateur:`, {
      agentId: finalAgentConfig.id,
      agentName: finalAgentConfig.name,
      provider: finalAgentConfig.provider,
      model: finalAgentConfig.model,
      temperature: finalAgentConfig.temperature,
      max_tokens: finalAgentConfig.max_tokens,
      isDefault: !agentConfig
    });
    
    const result = await handleGroqGptOss120b({
      message,
      appContext: {
        ...context,
        uiContext // ✅ Inclure le contexte UI
      },
      sessionHistory: history,
      agentConfig: finalAgentConfig,
      userToken: userToken!,
      sessionId
    });
    
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