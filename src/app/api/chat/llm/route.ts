import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime (not Edge) and disable caching to preserve auth context in production
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { handleGroqGptOss120b } from '@/services/llm/groqGptOss120b';
import { logger, LogCategory } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { dynamicChatRateLimiter } from '@/services/dynamicRateLimiter';
import { llmCacheService } from '@/services/cache/LLMCacheService';
import type { ChatMessage } from '@/types/chat';
import type { AgentConfig } from '@/services/llm/types/agentTypes';
import { llmRequestSchema } from './validation';
import type { LLMRequest } from './validation';
import { SERVER_ENV } from '@/config/env.server';

// Client Supabase admin pour accéder aux agents
const supabase = createClient(
  SERVER_ENV.supabase.url,
  SERVER_ENV.supabase.serviceRoleKey
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
  let message: string | null = null;
  let context: LLMRequest['context'] | null = null;
  let history: ChatMessage[] = [];
  const agentConfig: AgentConfig | null = null;
  let provider: string | undefined;
  
  try {
    const body = await request.json();
    
    // ✅ Validation Zod stricte
    const validation = llmRequestSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn(LogCategory.API, '[LLM Route] ❌ Validation failed', {
        errors: validation.error.format()
      });
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const {
      message: requestMessage,
      context: requestContext,
      history: requestHistory,
      provider: requestProvider
    } = validation.data;

    message = requestMessage;
    context = requestContext;
    history = requestHistory as unknown as ChatMessage[];
    provider = requestProvider;

    // Extraire le token d'authentification depuis le header Authorization
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error(LogCategory.API, `[LLM Route] ❌ Token manquant ou invalide`, {
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
      // ✅ JWT OBLIGATOIRE : rejet des UUID nus (impersonation)
      if (!userToken.includes('.')) {
        logger.error(LogCategory.API, '[LLM Route] ❌ Token non signé reçu (UUID nu rejeté)');
        return NextResponse.json(
          { error: 'Token JWT requis' },
          { status: 401 }
        );
      }

      // JWT : valider et EXTRAIRE le userId
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error(LogCategory.API, `[LLM Route] ❌ Token invalide ou expiré`, {
          error: authError?.message || 'Unknown error'
        }, authError || undefined);
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      
      // Extraire le userId du JWT
      userId = user.id;
    } catch (validationError) {
      logger.error(LogCategory.API, `[LLM Route] ❌ Erreur validation token`, {
        error: validationError instanceof Error ? validationError.message : 'Unknown error'
      }, validationError instanceof Error ? validationError : undefined);
      return NextResponse.json(
        { error: 'Erreur de validation du token' },
        { status: 401 }
      );
    }
    
    // ✅ SÉCURITÉ: Rate limiting par utilisateur (différencié free/premium)
    const chatLimit = await dynamicChatRateLimiter.check(userId);
    
    if (!chatLimit.allowed) {
      const resetDate = new Date(chatLimit.resetTime);
      logger.warn(LogCategory.API, `[LLM Route] ⛔ Rate limit dépassé pour userId`, {
        userId: userId.substring(0, 8) + '...',
        limit: chatLimit.limit,
        resetTime: chatLimit.resetTime
      });
      
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

    logger.info(LogCategory.API, `[LLM Route] 🚀 Démarrage pour session`, {
      sessionId,
      provider: provider || 'default'
    });

    // 🎯 Récupérer l'agentConfig depuis la base de données
    let resolvedAgentConfig: Partial<AgentConfig> | null = agentConfig;

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
          logger.warn(LogCategory.API, `[LLM Route] ⚠️ Erreur récupération agent par ID`, {
          error: agentByIdError.message
        });
        } else if (agentById) {
          resolvedAgentConfig = agentById;
        }
      }

      // 2) Sinon fallback par provider
      if (!resolvedAgentConfig && provider) {
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('provider', provider)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (agentError) {
          logger.warn(LogCategory.API, `[LLM Route] ⚠️ Erreur récupération agent`, {
          provider,
          error: agentError.message
        });
        } else if (agent) {
          resolvedAgentConfig = agent;
        } else {
          logger.warn(LogCategory.API, `[LLM Route] ⚠️ Aucun agent trouvé pour le provider`, {
          provider
        });
        }
      }

      // 3) Fallback final : premier agent actif disponible
      if (!resolvedAgentConfig) {
        const { data: defaultAgent, error: defaultAgentError} = await supabase
          .from('agents')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (defaultAgentError) {
          logger.warn(LogCategory.API, `[LLM Route] ⚠️ Erreur récupération agent par défaut`, {
          error: defaultAgentError.message
        });
        } else if (defaultAgent) {
          resolvedAgentConfig = defaultAgent;
        } else {
          logger.warn(LogCategory.API, `[LLM Route] ⚠️ Aucun agent actif trouvé dans la base de données`);
        }
      }

      // 🔧 CORRECTION : Ajouter les scopes par défaut si l'agent n'en a pas
      if (resolvedAgentConfig) {
        // Vérifier si l'agent a des scopes configurés
        const hasScopes = resolvedAgentConfig.api_v2_capabilities && resolvedAgentConfig.api_v2_capabilities.length > 0;
        
        if (!hasScopes) {
          logger.warn(LogCategory.API, `[LLM Route] ⚠️ Agent n'a pas de scopes configurés, ajout des scopes par défaut`, {
          agentName: resolvedAgentConfig.name
        });
          
          // Mettre à jour l'agent avec les scopes par défaut
          const { error: updateError } = await supabase
            .from('agents')
            .update({ 
              api_v2_capabilities: DEFAULT_AGENT_SCOPES 
            })
            .eq('id', resolvedAgentConfig.id);

          if (updateError) {
            logger.error(LogCategory.API, `[LLM Route] ❌ Erreur mise à jour scopes agent`, {
            error: updateError.message
          });
          } else {
            // Mettre à jour la config locale
            resolvedAgentConfig.api_v2_capabilities = DEFAULT_AGENT_SCOPES;
          }
        }
      }

    } catch (error) {
      logger.error(LogCategory.API, `[LLM Route] ❌ Erreur lors de la récupération de l'agent`, {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
    }

    // Configuration par défaut si aucun agent n'est trouvé
    const finalAgentConfig: AgentConfig = resolvedAgentConfig ? {
      ...resolvedAgentConfig,
      id: resolvedAgentConfig.id!,
      name: resolvedAgentConfig.name!,
      model: resolvedAgentConfig.model || 'openai/gpt-oss-20b',
      temperature: resolvedAgentConfig.temperature ?? 0.7,
      max_tokens: resolvedAgentConfig.max_tokens ?? 4000,
      system_instructions: resolvedAgentConfig.system_instructions || 'Tu es un assistant IA utile et compétent.',
      api_v2_capabilities: resolvedAgentConfig.api_v2_capabilities || DEFAULT_AGENT_SCOPES,
      is_active: resolvedAgentConfig.is_active ?? true,
      priority: resolvedAgentConfig.priority ?? 0,
      created_at: resolvedAgentConfig.created_at || new Date().toISOString(),
      updated_at: resolvedAgentConfig.updated_at || new Date().toISOString(),
    } : {
      id: 'default-agent',
      name: 'Agent par défaut',
      model: 'openai/gpt-oss-20b',
      temperature: 0.7,
      max_tokens: 4000,
      system_instructions: 'Tu es un assistant IA utile et compétent.',
      api_v2_capabilities: DEFAULT_AGENT_SCOPES,
      is_active: true,
      priority: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // 🔍 DEBUG: Log de l'agent config envoyé à l'orchestrateur
    logger.info(LogCategory.API, `[LLM Route] 📤 Envoi à l'orchestrateur`, {
      agentId: finalAgentConfig.id,
      agentName: finalAgentConfig.name,
      model: finalAgentConfig.model,
      temperature: finalAgentConfig.temperature,
      max_tokens: finalAgentConfig.max_tokens,
      isDefault: !resolvedAgentConfig
    });
    
    const sanitizedHistory: ChatMessage[] = history.map((msg, index) => ({
      ...msg,
      id: msg.id ?? `history-${index}`,
      content: msg.content ?? '',
      timestamp: msg.timestamp ?? new Date().toISOString()
    }));

    const normalizedMessage = message ?? '';

    // ✅ Cache LLM : Vérifier si la requête est en cache
    // Note: On ne cache que les requêtes simples sans tool calls pour éviter la complexité
    const shouldCache = sanitizedHistory.length < 10; // Cache seulement pour conversations courtes
    
    let cachedResponse = null;
    if (shouldCache) {
      const llmRequest = {
        messages: [
          ...sanitizedHistory.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          })),
          {
            role: 'user',
            content: normalizedMessage
          }
        ],
        model: finalAgentConfig.model,
        temperature: finalAgentConfig.temperature,
        maxTokens: finalAgentConfig.max_tokens
      };

      cachedResponse = await llmCacheService.get(llmRequest);
      if (cachedResponse) {
        logger.info(LogCategory.API, '[LLM Route] ✅ Cache hit', {
          model: finalAgentConfig.model,
          sessionId
        });
        
        // Retourner la réponse en cache dans le format attendu
        return NextResponse.json({
          success: true,
          content: cachedResponse.content,
          model: cachedResponse.model,
          finishReason: cachedResponse.finishReason,
          usage: cachedResponse.usage,
          tool_calls: [],
          tool_results: [],
          thinking: [],
          progress: [],
          is_relance: true,
          sessionId,
          status: 200
        });
      }
    }

    // Cache miss : Appeler le LLM
    const result = await handleGroqGptOss120b({
      message: normalizedMessage,
      appContext: {
        type: 'chat_session' as const,
        name: `Chat Session ${sessionId}`,
        id: sessionId,
        content: JSON.stringify({ uiContext }) // Inclure le contexte UI
      },
      sessionHistory: sanitizedHistory,
      agentConfig: finalAgentConfig,
      userToken: userToken!,
      sessionId
    });

    // ✅ Cache LLM : Mettre en cache la réponse après réception (si pas de tool calls)
    if (shouldCache) {
      try {
        const responseClone = result.clone();
        const responseData = await responseClone.json();
        if (responseData.success && responseData.content && (!responseData.tool_calls || responseData.tool_calls.length === 0)) {
          const llmRequest = {
            messages: [
              ...sanitizedHistory.map(msg => ({
                role: msg.role,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              })),
              {
                role: 'user',
                content: normalizedMessage
              }
            ],
            model: finalAgentConfig.model,
            temperature: finalAgentConfig.temperature,
            maxTokens: finalAgentConfig.max_tokens
          };
          
          await llmCacheService.set(llmRequest, {
            content: responseData.content,
            model: responseData.model || finalAgentConfig.model,
            finishReason: responseData.finishReason,
            usage: responseData.usage
          });
        }
      } catch (cacheError) {
        // Ne pas bloquer si le cache échoue
        logger.warn(LogCategory.API, '[LLM Route] ⚠️ Erreur mise en cache', {
          error: cacheError instanceof Error ? cacheError.message : 'Unknown error'
        });
      }
    }
    
    return result;

  } catch (error) {
    logger.error(LogCategory.API, `[LLM Route] ❌ Erreur fatale`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: sessionId || 'unknown',
      message: message?.substring(0, 100) + '...',
      hasContext: !!context,
      hasHistory: !!history
    });

    // 🔧 Gestion spéciale des erreurs Groq 500 - on fournit une réponse de fallback
    if (error instanceof Error && error.message.includes('Groq API error: 500')) {
      logger.warn(LogCategory.API, `[LLM Route] ⚠️ Erreur Groq 500 détectée, fourniture d'une réponse de fallback`);
      
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