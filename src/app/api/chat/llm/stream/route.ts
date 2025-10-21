import { NextRequest } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { XAIProvider } from '@/services/llm/providers/implementations/xai';
import type { ChatMessage } from '@/types/chat';
import type { Tool } from '@/services/llm/types/strictTypes';

// Force Node.js runtime for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ✅ Route API Streaming pour xAI Grok
 * Retourne un ReadableStream avec SSE
 */
export async function POST(request: NextRequest) {
  let sessionId: string | undefined;
  let userToken: string | undefined;
  
  try {
    const body = await request.json();
    const { message, context, history, agentConfig } = body;

    // Validation des paramètres requis
    if (!message || !context || !history) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants', required: ['message', 'context', 'history'] }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extraire le token d'authentification
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token d\'authentification manquant ou invalide' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    userToken = authHeader.replace('Bearer ', '');
    sessionId = context.sessionId;
    
    logger.info(`[Stream Route] 🌊 Démarrage streaming pour session ${sessionId}`);

    // ✅ Valider le JWT et extraire userId
    let userId: string;
    
    try {
      if (userToken.includes('.')) {
        // C'est un JWT
        const { data: { user }, error } = await supabase.auth.getUser(userToken);
        
        if (error || !user) {
          logger.error('[Stream Route] ❌ JWT invalide:', error);
          return new Response(
            JSON.stringify({ error: 'JWT invalide ou expiré' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        userId = user.id;
      } else {
        // C'est déjà un userId
        userId = userToken;
      }
    } catch (verifyError) {
      logger.error('[Stream Route] ❌ Erreur validation token:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Récupérer l'agent comme la route classique (table 'agents')
    const agentId = context.agentId;
    const providerName = context.provider || 'xai';
    let finalAgentConfig = agentConfig;
    
    try {
      // 1) Priorité à l'agent explicitement sélectionné
      if (agentId) {
        logger.dev(`[Stream Route] 🔍 Récupération de l'agent par ID: ${agentId}`);
        const { data: agentById, error: agentByIdError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .eq('is_active', true)
          .single();

        if (!agentByIdError && agentById) {
          finalAgentConfig = agentById;
          logger.dev(`[Stream Route] ✅ Agent trouvé: ${agentById.name}`);
        }
      }

      // 2) Sinon fallback par provider
      if (!finalAgentConfig && providerName) {
        logger.dev(`[Stream Route] 🔍 Récupération de l'agent pour le provider: ${providerName}`);
        const { data: agent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('provider', providerName)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (!error && agent) {
          finalAgentConfig = agent;
          logger.dev(`[Stream Route] ✅ Agent trouvé par provider: ${agent.name}`);
        }
      }

      // 3) Fallback final : premier agent actif
      if (!finalAgentConfig) {
        logger.dev(`[Stream Route] 🔍 Récupération du premier agent actif`);
        const { data: defaultAgent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (!error && defaultAgent) {
          finalAgentConfig = defaultAgent;
          logger.dev(`[Stream Route] ✅ Agent par défaut: ${defaultAgent.name}`);
        }
      }
    } catch (error) {
      logger.error(`[Stream Route] ❌ Erreur récupération agent:`, error);
    }

    // Créer le provider xAI
    const provider = new XAIProvider({
      model: finalAgentConfig?.model || 'grok-4-fast',
      temperature: finalAgentConfig?.temperature || 0.7,
      maxTokens: finalAgentConfig?.max_tokens || 8000
    });

    // ✅ Construire le contexte UI (comme dans la route classique)
    const uiContext = context.uiContext || {};
    
    logger.dev('[Stream Route] 🕵️‍♂️ Contexte UI reçu:', {
      hasUIContext: !!context.uiContext,
      uiContextKeys: context.uiContext ? Object.keys(context.uiContext) : [],
      contextType: context.type,
      contextId: context.id
    });

    // ✅ Construire le system message avec contexte (comme la route classique)
    const { SystemMessageBuilder } = await import('@/services/llm/SystemMessageBuilder');
    const systemMessageBuilder = SystemMessageBuilder.getInstance();
    
    const systemMessageResult = systemMessageBuilder.buildSystemMessage(
      finalAgentConfig || {},
      {
        type: context.type || 'chat_session',
        name: context.name || 'Chat',
        id: context.id || sessionId,
        ...uiContext
      }
    );
    
    const systemMessage = systemMessageResult.content;
    
    logger.dev('[Stream Route] 📝 System message construit:', {
      length: systemMessage.length,
      hasContext: systemMessage.includes('Contexte actuel'),
      agentName: finalAgentConfig?.name || 'default'
    });
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage,
        timestamp: new Date().toISOString()
      },
      ...history,
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
    ];

    // ✅ Charger les tools (OpenAPI + MCP) ET les endpoints
    let tools: Tool[] = [];
    let openApiEndpoints = new Map<string, any>();
    
    if (context.agentId) {
      try {
        // 1. Charger les schémas OpenAPI de l'agent
        const { data: agentSchemas } = await supabase
          .from('agent_openapi_schemas')
          .select('openapi_schema_id')
          .eq('agent_id', context.agentId);

        if (agentSchemas && agentSchemas.length > 0) {
          const { openApiSchemaService } = await import('@/services/llm/openApiSchemaService');
          
          const schemaIds = agentSchemas.map(s => s.openapi_schema_id);
          const { tools: openApiTools, endpoints } = await openApiSchemaService.getToolsAndEndpointsFromSchemas(schemaIds);
          
          // ✅ Garder les endpoints pour OpenApiToolExecutor
          openApiEndpoints = endpoints;
          
          // 2. Charger les tools MCP de l'agent
          const { mcpConfigService } = await import('@/services/llm/mcpConfigService');
          const hybridTools = await mcpConfigService.buildHybridTools(
            context.agentId,
            userToken,
            openApiTools
          ) as Tool[];
          
          // Limiter à 15 tools pour xAI
          tools = hybridTools.slice(0, 15);
          
          const mcpCount = tools.filter(t => (t as any).server_label).length;
          const openApiCount = tools.length - mcpCount;
          
          logger.dev(`[Stream Route] ✅ ${tools.length} tools chargés (${mcpCount} MCP + ${openApiCount} OpenAPI), ${openApiEndpoints.size} endpoints`);
        }
      } catch (toolsError) {
        logger.warn('[Stream Route] ⚠️ Erreur chargement tools:', toolsError);
        // Continue sans tools
      }
    }

    // ✅ Créer le ReadableStream pour SSE avec gestion tool calls
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const TIMEOUT_MS = 60000; // 60s timeout
        
        // ✅ Vérifier timeout
        const checkTimeout = () => {
          if (Date.now() - startTime > TIMEOUT_MS) {
            throw new Error('Stream timeout (60s)');
          }
        };
        
        try {
          logger.dev('[Stream Route] 📡 Démarrage du stream SSE');
          
          // Helper pour envoyer un chunk SSE
          const sendSSE = (data: unknown) => {
            checkTimeout(); // Vérifier avant chaque envoi
            const chunk = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          };

          // Envoyer un chunk de début
          sendSSE({
            type: 'start',
            sessionId,
            timestamp: Date.now()
          });

          // ✅ Boucle agentic en streaming (max 5 tours)
          let currentMessages = [...messages];
          let roundCount = 0;
          const maxRounds = 5;

          while (roundCount < maxRounds) {
            roundCount++;
            logger.dev(`[Stream Route] 🔄 Round ${roundCount}/${maxRounds}`);

            // Accumuler tool calls et content du stream
            let accumulatedContent = '';
            const toolCallsMap = new Map<string, any>(); // Accumuler par ID pour gérer les chunks
            let finishReason: string | null = null;

            // ✅ Stream depuis xAI
            for await (const chunk of provider.callWithMessagesStream(currentMessages, tools)) {
              // Envoyer le chunk au client
              sendSSE(chunk);

              // Accumuler content
              if (chunk.content) {
                accumulatedContent += chunk.content;
              }
              
              // ✅ Accumuler tool calls (peuvent venir en plusieurs chunks)
              if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                for (const tc of chunk.tool_calls) {
                  if (!toolCallsMap.has(tc.id)) {
                    toolCallsMap.set(tc.id, {
                      id: tc.id,
                      type: tc.type,
                      function: {
                        name: tc.function.name || '',
                        arguments: tc.function.arguments || ''
                      }
                    });
                  } else {
                    // Accumuler les arguments progressifs
                    const existing = toolCallsMap.get(tc.id);
                    if (tc.function.name) existing.function.name = tc.function.name;
                    if (tc.function.arguments) existing.function.arguments += tc.function.arguments;
                  }
                }
              }

              // ✅ Capturer finish_reason
              if (chunk.finishReason) {
                finishReason = chunk.finishReason;
                logger.dev(`[Stream Route] 🏁 Finish reason détecté: ${finishReason}`);
              }
            }

            // ✅ Décision basée sur finish_reason
            if (finishReason === 'tool_calls' && toolCallsMap.size > 0) {
              logger.dev(`[Stream Route] 🔧 Tool calls détectés (${toolCallsMap.size}), exécution...`);
            } else if (finishReason === 'stop') {
              logger.dev('[Stream Route] ✅ Réponse finale (stop), fin du stream');
              break;
            } else if (finishReason === 'length') {
              logger.warn('[Stream Route] ⚠️ Token limit atteint');
              break;
            } else {
              logger.dev('[Stream Route] ✅ Pas de tool calls, fin du stream');
              break;
            }

            const accumulatedToolCalls = Array.from(toolCallsMap.values());

            // ✅ Exécuter les tool calls
            logger.dev(`[Stream Route] 🔧 Exécution de ${accumulatedToolCalls.length} tool calls`);
            
            // Envoyer un événement d'exécution de tools
            sendSSE({
              type: 'tool_execution',
              toolCount: accumulatedToolCalls.length,
              timestamp: Date.now()
            });

            // Ajouter le message assistant avec tool calls
            currentMessages.push({
              role: 'assistant',
              content: accumulatedContent || null,
              tool_calls: accumulatedToolCalls,
              timestamp: new Date().toISOString()
            });

            // ✅ Créer les executors UNE FOIS (en dehors de la boucle)
            const { ApiV2ToolExecutor } = await import('@/services/llm/executors/ApiV2ToolExecutor');
            const { OpenApiToolExecutor } = await import('@/services/llm/executors/OpenApiToolExecutor');
            
            const mcpExecutor = new ApiV2ToolExecutor();
            const openApiExecutor = new OpenApiToolExecutor('', openApiEndpoints);
            
            // ✅ Exécuter chaque tool call
            for (const toolCall of accumulatedToolCalls) {
              checkTimeout(); // Vérifier timeout avant chaque tool
              try {
                logger.dev(`[Stream Route] 🔧 Exécution tool: ${toolCall.function.name}`);
                
                // ✅ Détecter le type de tool (MCP ou OpenAPI)
                const isMcpTool = (toolCall as any).server_label !== undefined;
                
                // ✅ Utiliser le bon executor
                const result = isMcpTool 
                  ? await mcpExecutor.executeToolCall(toolCall, userToken)
                  : await openApiExecutor.executeToolCall(toolCall, userToken);

                // Ajouter le résultat aux messages
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name,
                  content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
                  timestamp: new Date().toISOString()
                });

                // Envoyer le résultat au client
                sendSSE({
                  type: 'tool_result',
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  success: result.success,
                  result: result.content,
                  timestamp: Date.now()
                });

                logger.dev(`[Stream Route] ✅ Tool ${toolCall.function.name} exécuté (success: ${result.success})`);

              } catch (toolError) {
                logger.error(`[Stream Route] ❌ Erreur tool ${toolCall.function.name}:`, toolError);
                
                // Ajouter un résultat d'erreur
                const errorContent = `Erreur: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
                
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name,
                  content: errorContent,
                  timestamp: new Date().toISOString()
                });
                
                // Envoyer l'erreur au client
                sendSSE({
                  type: 'tool_result',
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  success: false,
                  result: errorContent,
                  timestamp: Date.now()
                });
              }
            }

            // Continuer la boucle pour relancer le LLM avec les résultats
            logger.dev(`[Stream Route] 🔄 Relance du LLM avec ${currentMessages.length} messages`);
          }

          // Envoyer un chunk de fin
          sendSSE({
            type: 'done',
            rounds: roundCount,
            timestamp: Date.now()
          });

          logger.info('[Stream Route] ✅ Stream terminé avec succès');
          controller.close();

        } catch (error) {
          logger.error('[Stream Route] ❌ Erreur stream:', error);
          
          // Envoyer l'erreur au client
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorChunk = `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
          
          controller.close();
        }
      }
    });

    // Retourner la réponse avec headers SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    logger.error('[Stream Route] ❌ Erreur globale:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

