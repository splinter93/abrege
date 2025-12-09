import { NextRequest } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';
import { createClient } from '@supabase/supabase-js';
import { XAIProvider } from '@/services/llm/providers/implementations/xai';
import { GroqProvider } from '@/services/llm/providers/implementations/groq';
import type { ChatMessage } from '@/types/chat';
import { hasToolCalls } from '@/types/chat';
import type { OpenApiEndpoint } from '@/services/llm/executors/OpenApiToolExecutor';
import type { Tool, McpTool } from '@/services/llm/types/strictTypes';
import type { ToolCall } from '@/services/llm/types/strictTypes';
import { isMcpTool, isFunctionTool } from '@/services/llm/types/strictTypes';

// Force Node.js runtime for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ✅ Route API Streaming pour LLM (Groq ou xAI)
 * Retourne un ReadableStream avec SSE
 * Provider sélectionné automatiquement selon la config agent
 */
export async function POST(request: NextRequest) {
  let sessionId: string | undefined;
  let userToken: string | undefined;
  
  try {
    const body = await request.json();
    const { message, context, history, agentConfig, skipAddingUserMessage = false } = body;

    // Validation des paramètres requis
    if (!context || !history) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants', required: ['context', 'history'] }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Si skipAddingUserMessage est false, message est requis
    if (!skipAddingUserMessage && !message) {
      return new Response(
        JSON.stringify({ error: 'Paramètre message requis quand skipAddingUserMessage est false' }),
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

    // ✅ Sélectionner le provider selon la config agent (Groq ou xAI)
    const providerType = finalAgentConfig?.provider?.toLowerCase() || 'groq';
    let model = finalAgentConfig?.model || (providerType === 'xai' ? 'grok-4-1-fast-reasoning' : 'openai/gpt-oss-20b');
    
    // 🔍 VALIDATION : Détecter incohérence provider/modèle
    const isXaiModel = model.includes('grok');
    const isGroqModel = model.includes('openai/') || model.includes('llama') || model.includes('deepseek');
    
    if (providerType === 'xai' && isGroqModel) {
      logger.warn(`[Stream Route] ⚠️ INCOHÉRENCE: Provider xAI avec modèle Groq (${model}), correction automatique`);
      model = 'grok-4-1-fast-reasoning'; // Fallback vers un modèle xAI
    } else if (providerType === 'groq' && isXaiModel) {
      logger.warn(`[Stream Route] ⚠️ INCOHÉRENCE: Provider Groq avec modèle xAI (${model}), correction automatique`);
      model = 'openai/gpt-oss-20b'; // Fallback vers un modèle Groq
    }
    
    // Validation et normalisation des paramètres LLM
    const temperature = typeof finalAgentConfig?.temperature === 'number'
      ? Math.max(0, Math.min(2, finalAgentConfig.temperature))
      : 0.7;
    
    const topP = typeof finalAgentConfig?.top_p === 'number'
      ? Math.max(0, Math.min(1, finalAgentConfig.top_p))
      : 0.9;
    
    const maxTokens = typeof finalAgentConfig?.max_tokens === 'number'
      ? Math.max(1, Math.min(100000, finalAgentConfig.max_tokens))
      : 8000;

    // 🔍 DEBUG: Log détaillé de la sélection
    logger.info(`[Stream Route] 🔄 Configuration LLM:`, {
      agentId: finalAgentConfig?.id,
      agentName: finalAgentConfig?.name,
      provider: providerType,
      model: model,
      temperature,
      topP,
      maxTokens,
      originalModel: finalAgentConfig?.model,
      corrected: finalAgentConfig?.model !== model
    });

    // Créer le provider approprié
    const provider = providerType === 'xai'
      ? new XAIProvider({ model, temperature, topP, maxTokens })
      : new GroqProvider({ model, temperature, topP, maxTokens });
    
    logger.info(`[Stream Route] ✅ Provider ${providerType.toUpperCase()} créé avec modèle: ${model}`);

    // ✅ Construire le contexte UI (SANS attachedNotes - gérées séparément)
    const uiContext = {
      ...(context.uiContext || {})
      // Notes ne sont PLUS passées ici (évite duplication tokens)
    };
    
    logger.dev('[Stream Route] 🕵️‍♂️ Contexte UI reçu:', {
      hasUIContext: !!context.uiContext,
      uiContextKeys: context.uiContext ? Object.keys(context.uiContext) : [],
      contextType: context.type,
      contextId: context.id,
      hasAttachedNotes: !!(context.attachedNotes && context.attachedNotes.length > 0),
      attachedNotesCount: context.attachedNotes?.length || 0
    });

    // ✅ Construire le system message SANS notes (instructions agent uniquement)
    const { SystemMessageBuilder } = await import('@/services/llm/SystemMessageBuilder');
    const systemMessageBuilder = SystemMessageBuilder.getInstance();
    
    const systemMessageResult = systemMessageBuilder.buildSystemMessage(
      finalAgentConfig || {},
      {
        type: context.type || 'chat_session',
        name: context.name || 'Chat',
        id: context.id || sessionId,
        sessionId: sessionId, // ✅ CRITIQUE : Injecter sessionId explicitement pour tous les LLM
        provider: providerType,
        ...uiContext  // Sans attachedNotes
      }
    );
    
    const systemMessage = systemMessageResult.content;
    
    logger.dev('[Stream Route] 📝 System message construit:', {
      length: systemMessage.length,
      hasContext: systemMessage.includes('Contexte actuel'),
      agentName: finalAgentConfig?.name || 'default'
    });

    // ✅ NOUVEAU: Construire message contexte séparé style Cursor si notes présentes
    const { attachedNotesFormatter } = await import('@/services/llm/AttachedNotesFormatter');
    const { mentionedNotesFormatter } = await import('@/services/llm/MentionedNotesFormatter');
    let contextMessage: ChatMessage | null = null;
    let mentionsMessage: ChatMessage | null = null;
    
    // 📎 NOTES ÉPINGLÉES (chargement complet)
    if (context.attachedNotes && context.attachedNotes.length > 0) {
      try {
        const contextContent = attachedNotesFormatter.buildContextMessage(context.attachedNotes);
        
        if (contextContent) {
          contextMessage = {
            // Role 'user' choisi pour compatibilité maximale tous providers
            // Alternatives évaluées :
            // - 'system' : Plus sémantique mais peut être mal géré par certains providers
            // - 'developer' : Utilisé par Cursor mais pas supporté par Groq/XAI
            // - 'user' : ✅ Supporté partout, traité comme contexte par LLM
            role: 'user',
            content: contextContent,
            timestamp: new Date().toISOString()
          };
          
          logger.info('[Stream Route] 📎 Contexte notes épinglées construit (full content):', {
            count: context.attachedNotes.length,
            contentLength: contextContent.length,
            totalLines: context.attachedNotes.reduce((sum: number, n: { markdown_content?: string }) => 
              sum + (n.markdown_content?.split('\n').length || 0), 0
            ),
            titles: context.attachedNotes.map((n: { title: string }) => n.title)
          });
        }
      } catch (error) {
        logger.error('[Stream Route] ❌ Erreur construction contexte notes:', error);
        // Continue sans notes (fallback gracieux)
      }
    }
    
    // @ MENTIONS LÉGÈRES (métadonnées uniquement)
    if (context.mentionedNotes && context.mentionedNotes.length > 0) {
      try {
        const mentionsContent = mentionedNotesFormatter.buildContextMessage(context.mentionedNotes);
        
        if (mentionsContent) {
          mentionsMessage = {
            role: 'user',
            content: mentionsContent,
            timestamp: new Date().toISOString()
          };
          
          logger.info('[Stream Route] @ Contexte mentions légères construit (metadata only):', {
            count: context.mentionedNotes.length,
            contentLength: mentionsContent.length,
            tokensEstimate: Math.ceil(mentionsContent.length / 4),
            slugs: context.mentionedNotes.map((m: { slug: string }) => m.slug)
          });
        }
      } catch (error) {
        logger.error('[Stream Route] ❌ Erreur construction contexte mentions:', error);
        // Continue sans mentions (fallback gracieux)
      }
    }
    
    // ✅ NOUVEAU : Remplacer prompts /slug par templates avant LLM
    let processedMessage = message;
    if (!skipAddingUserMessage && message && typeof message === 'string') {
      // Récupérer prompts depuis le dernier message user de l'historique
      const lastUserMessage = [...history].reverse().find(m => m.role === 'user') as import('@/types/chat').UserMessage | undefined;
      const contextPrompts = context.prompts || [];
      const historyPrompts = lastUserMessage?.prompts || [];
      const prompts = contextPrompts.length > 0 ? contextPrompts : historyPrompts;
      
    if (prompts.length > 0) {
      try {
        const promptIds = prompts.map((promptMeta: { id: string }) => promptMeta.id);
        const { data: promptsFromDB } = await supabase
          .from('editor_prompts')
          .select('id, slug, prompt_template')
          .in('id', promptIds);

        if (promptsFromDB && promptsFromDB.length > 0) {
          const templateMap = new Map<string, string>();
          promptsFromDB.forEach((promptRow) => {
            templateMap.set(promptRow.slug, promptRow.prompt_template);
          });

          let finalContent = processedMessage;

          for (const promptMeta of prompts) {
            const pattern = `/${promptMeta.slug}`;
            if (!finalContent.includes(pattern)) {
              continue;
            }

            const template = templateMap.get(promptMeta.slug);
            if (!template || !template.trim()) {
              logger.warn('[Stream Route] ⚠️ Prompt template manquant', {
                promptId: promptMeta.id,
                slug: promptMeta.slug
              });
              continue;
            }

            const placeholderValues = promptMeta.placeholderValues || {};
            let resolvedTemplate = template;

            for (const [key, value] of Object.entries(placeholderValues)) {
              const safeValue = typeof value === 'string' ? value.trim() : '';
              resolvedTemplate = resolvedTemplate.split(`{${key}}`).join(safeValue);
            }

            const remainingPlaceholders = parsePromptPlaceholders(resolvedTemplate);
            if (remainingPlaceholders.length > 0) {
              logger.warn('[Stream Route] ⚠️ Placeholders non remplis détectés', {
                slug: promptMeta.slug,
                missing: remainingPlaceholders.map((placeholder) => placeholder.name)
              });
            }

            finalContent = finalContent.replace(pattern, `${resolvedTemplate}\n\n`);
            logger.dev('[Stream Route] ✅ Prompt remplacé', {
              slug: promptMeta.slug,
              name: promptMeta.name,
              hasValues: Object.keys(placeholderValues).length > 0
            });
          }

          processedMessage = finalContent;

          logger.info('[Stream Route] 📝 Prompts remplacés', {
            count: prompts.length,
            originalLength: message.length,
            finalLength: processedMessage.length
          });
        }
      } catch (promptError) {
        logger.error('[Stream Route] ❌ Erreur remplacement prompts:', promptError);
      }
    }
    }
    
    // ✅ Construire le tableau de messages avec contextes injectés AVANT user message
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage,
        timestamp: new Date().toISOString()
      },
      ...history,
      // Injecter contexte notes épinglées (full content)
      ...(contextMessage ? [contextMessage] : []),
      // Injecter contexte mentions légères (metadata only)
      ...(mentionsMessage ? [mentionsMessage] : []),
      // N'ajouter le message user que si pas en mode skip (avec prompts remplacés)
      ...(skipAddingUserMessage ? [] : [{
        role: 'user' as const,
        content: processedMessage,
        timestamp: new Date().toISOString()
      }])
    ];

    // ✅ Charger les tools (OpenAPI + MCP) ET les endpoints
    let tools: Tool[] = [];
    let openApiEndpoints = new Map<string, OpenApiEndpoint>();
    
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
          // ⚠️ EXCEPTION TypeScript: buildHybridTools retourne un format mixte (MCP + OpenAPI)
          // TODO: Unifier les types Tool pour éviter ce cast
          tools = await mcpConfigService.buildHybridTools(
            context.agentId,
            userToken,
            openApiTools as any // eslint-disable-line @typescript-eslint/no-explicit-any
          ) as Tool[];
          
          const mcpCount = tools.filter(isMcpTool).length;
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
          const maxRounds = 20;
          
          // ✅ AUDIT : Tracker les tool calls déjà exécutés pour détecter les doublons
          const executedToolCallsSignatures = new Set<string>();
          
          // ✅ Séparer les tools MCP (exécutés par Groq nativement) des OpenAPI (exécutés par nous)
          const mcpTools = tools.filter(isMcpTool);
          const openApiTools = tools.filter(isFunctionTool);
          
          // ✅ Créer une Map des tool names OpenAPI → pour routing d'exécution
          const openApiToolNames = new Set(openApiTools.map(t => t.function.name));
          
          logger.dev(`[Stream Route] 🗺️ Tools séparés:`, {
            totalTools: tools.length,
            mcpCount: mcpTools.length,
            openApiCount: openApiTools.length,
            mcpServers: mcpTools.map(t => (t as McpTool).server_label),
            openApiNames: Array.from(openApiToolNames)
          });

          // ✅ Helper: Extraire le texte d'un MessageContent (string ou array multi-modal)
          const extractTextFromContent = (content: string | null | Array<{ type: string; text?: string }>): string => {
            if (!content) return '';
            if (typeof content === 'string') return content;
            // Si array, trouver la partie texte
            const textPart = content.find((part): part is { type: 'text'; text: string } => 
              typeof part === 'object' && part.type === 'text'
            );
            return textPart?.text || '[Multi-modal content]';
          };

          while (roundCount < maxRounds) {
            roundCount++;
            logger.dev(`[Stream Route] 🔄 Round ${roundCount}/${maxRounds}`);

            // ✅ AUDIT DÉTAILLÉ : Logger les messages envoyés au LLM pour ce round
            const lastMessage = currentMessages[currentMessages.length - 1];
            const lastContent = lastMessage?.content ? extractTextFromContent(lastMessage.content) : '';
            
            logger.dev(`[Stream Route] 📋 MESSAGES ENVOYÉS AU LLM - ROUND ${roundCount}:`, {
              messageCount: currentMessages.length,
              roles: currentMessages.map(m => m.role),
              hasToolCalls: currentMessages.some(m => hasToolCalls(m)),
              hasToolResults: currentMessages.some(m => m.role === 'assistant' && 'tool_results' in m && Array.isArray(m.tool_results) && m.tool_results.length > 0),
              lastMessageContent: lastContent.substring(0, 100) + (lastContent.length > 100 ? '...' : ''),
              isMultiModal: Array.isArray(lastMessage?.content)
            });
            
            // ✅ AUDIT DÉTAILLÉ : Logger les 5 derniers messages pour voir l'ordre
            if (roundCount > 1) {
              const last5 = currentMessages.slice(-5);
              logger.info(`[Stream Route] 🔍 DERNIERS 5 MESSAGES (Round ${roundCount}):`);
              last5.forEach((m, i) => {
                const toolCallId = m.role === 'tool' ? (m as { tool_call_id?: string }).tool_call_id : undefined;
                const toolCallsCount = m.role === 'assistant' && 'tool_calls' in m && Array.isArray(m.tool_calls) ? m.tool_calls.length : 0;
                logger.info(`  ${i+1}. ${m.role} - toolCalls:${toolCallsCount} - toolCallId:${toolCallId||'none'}`);
              });
            }

            // Accumuler tool calls et content du stream
            let accumulatedContent = '';
            let accumulatedReasoning = '';  // ✅ NOUVEAU: Accumuler le reasoning
            const toolCallsMap = new Map<string, ToolCall>(); // Accumuler par ID pour gérer les chunks
            let finishReason: string | null = null;

            // ✅ Stream depuis le provider
            for await (const chunk of provider.callWithMessagesStream(currentMessages, tools)) {
              // ✅ Le chunk contient déjà type: 'delta' (ajouté par le provider)
              sendSSE(chunk);

              // Accumuler content
              if (chunk.content) {
                accumulatedContent += chunk.content;
              }
              
              // ✅ NOUVEAU: Accumuler reasoning
              if (chunk.reasoning) {
                accumulatedReasoning += chunk.reasoning;
              }
              
              // ✅ Accumuler tool calls (peuvent venir en plusieurs chunks)
              if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                for (const tc of chunk.tool_calls) {
                  if (!toolCallsMap.has(tc.id)) {
                    toolCallsMap.set(tc.id, {
                      id: tc.id,
                      type: 'function' as const,
                      function: {
                        name: tc.function.name || '',
                        arguments: tc.function.arguments || ''
                      }
                    });
                  } else {
                    // Accumuler les arguments progressifs
                    const existing = toolCallsMap.get(tc.id);
                    if (!existing) {
                      logger.error(`[Stream Route] ⚠️ Tool call ${tc.id} not found in map`, { toolCallId: tc.id });
                      continue;
                    }
                    if (tc.function.name) existing.function.name = tc.function.name;
                    if (tc.function.arguments) existing.function.arguments += tc.function.arguments;
                  }
                }
              }

              // ✅ Capturer finish_reason
              if (chunk.finishReason) {
                finishReason = chunk.finishReason;
              }
            }

            // ✅ AUDIT DÉTAILLÉ : Logger la décision de fin de round
            logger.dev(`[Stream Route] 🎯 DÉCISION ROUND ${roundCount}:`, {
              finishReason,
              toolCallsCount: toolCallsMap.size,
              accumulatedContentLength: accumulatedContent.length,
              willContinue: finishReason === 'tool_calls' && toolCallsMap.size > 0
            });

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

            // ✅ NOUVEAU : Persister le message de ce round
            if (accumulatedContent || accumulatedToolCalls.length > 0) {
              sendSSE({
                type: 'assistant_round_complete',
                content: accumulatedContent,
                tool_calls: accumulatedToolCalls,
                finishReason: finishReason,
                timestamp: Date.now()
              });
            }

            // ✅ Exécuter les tool calls
            logger.dev(`[Stream Route] 🔧 Exécution de ${accumulatedToolCalls.length} tool calls`);
            
            // ✅ AUDIT DÉTAILLÉ : Logger les tool calls à exécuter ET détecter les doublons
            logger.info(`[Stream Route] 🔧 Exécution de ${accumulatedToolCalls.length} tool calls au Round ${roundCount}`);
            
            accumulatedToolCalls.forEach((tc, index) => {
              const signature = `${tc.function.name}:${tc.function.arguments}`;
              const isDoublon = executedToolCallsSignatures.has(signature);
              
              logger.info(`[Stream Route] 🔧 TOOL CALL ${index + 1}:`, {
                id: tc.id,
                functionName: tc.function.name,
                args: tc.function.arguments.substring(0, 100),
                isDuplicate: isDoublon
              });
              
              if (isDoublon) {
                logger.warn(`[Stream Route] ⚠️⚠️⚠️ DOUBLON DÉTECTÉ ! ${tc.function.name}`);
              }
              
              // Ajouter la signature pour tracking
              executedToolCallsSignatures.add(signature);
            });
            
            // Envoyer un événement d'exécution de tools
            sendSSE({
              type: 'tool_execution',
              toolCount: accumulatedToolCalls.length,
              timestamp: Date.now()
            });

            // Ajouter le message assistant avec tool calls
            currentMessages.push({
              role: 'assistant',
              content: accumulatedContent || '',
              tool_calls: accumulatedToolCalls,
              timestamp: new Date().toISOString()
            });

            if (!userToken) {
              throw new Error('[Stream Route] Missing user token for OpenAPI tool execution');
            }

            // ✅ Créer l'executor OpenAPI (les tools MCP sont gérés nativement par Groq)
            const { OpenApiToolExecutor } = await import('@/services/llm/executors/OpenApiToolExecutor');
            const openApiExecutor = new OpenApiToolExecutor('', openApiEndpoints);
            
            // ✅ Exécuter chaque tool call
            for (const toolCall of accumulatedToolCalls) {
              checkTimeout(); // Vérifier timeout avant chaque tool
              try {
                logger.dev(`[Stream Route] 🔧 Exécution tool: ${toolCall.function.name}`);
                
                // ✅ Vérifier si c'est un tool OpenAPI (exécuté par nous)
                // Les tools MCP sont exécutés nativement par Groq, on ne les touche pas
                const isOpenApiTool = openApiToolNames.has(toolCall.function.name);
                
                if (!isOpenApiTool) {
                  // Tool MCP : déjà exécuté par Groq, on skip
                  logger.dev(`[Stream Route] ⏭️ Tool MCP skip (géré par Groq): ${toolCall.function.name}`);
                  continue;
                }
                
                // ✅ Exécuter le tool OpenAPI
                const result = await openApiExecutor.executeToolCall(toolCall, userToken);

                // ✅ AUDIT DÉTAILLÉ : Logger après exécution
                logger.dev(`[Stream Route] ✅ APRÈS EXÉCUTION TOOL:`, {
                  toolName: toolCall.function.name,
                  success: result.success,
                  resultLength: typeof result.content === 'string' ? result.content.length : 'object',
                  resultPreview: typeof result.content === 'string' ? result.content.substring(0, 100) + '...' : 'object'
                });

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

            const hasReachedRoundLimit = roundCount >= maxRounds;

            if (hasReachedRoundLimit) {
              logger.warn(`[Stream Route] ⚠️ Limite de ${maxRounds} rounds atteinte, relance finale forcée sans nouveaux tool calls`);
              
              try {
                const finalResponse = await provider.callWithMessages(currentMessages, []);

                if (finalResponse.tool_calls && finalResponse.tool_calls.length > 0) {
                  logger.warn('[Stream Route] ⚠️ Réponse finale forcée contient encore des tool calls, ils seront ignorés', {
                    requestedToolCalls: finalResponse.tool_calls.length
                  });
                }

                if (finalResponse.content) {
                  sendSSE({
                    type: 'delta',
                    content: finalResponse.content,
                    reasoning: finalResponse.reasoning
                  });

                  sendSSE({
                    type: 'assistant_round_complete',
                    content: finalResponse.content,
                    tool_calls: [],
                    finishReason: 'stop',
                    forced: true,
                    timestamp: Date.now()
                  });

                  currentMessages.push({
                    role: 'assistant',
                    content: finalResponse.content,
                    timestamp: new Date().toISOString()
                  });
                } else {
                  logger.error('[Stream Route] ❌ Réponse finale forcée vide, envoi d’une erreur au client');
                  sendSSE({
                    type: 'error',
                    error: 'Réponse finale indisponible après la limite de tool calls'
                  });
                }
              } catch (finalError) {
                logger.error('[Stream Route] ❌ Erreur lors de la relance finale forcée', finalError);
                sendSSE({
                  type: 'error',
                  error: 'Erreur lors de la relance finale forcée'
                });
              }

              break;
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

