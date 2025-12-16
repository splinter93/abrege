import { NextRequest } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { XAIProvider } from '@/services/llm/providers/implementations/xai';
import { GroqProvider } from '@/services/llm/providers/implementations/groq';
import type { ChatMessage } from '@/types/chat';
import { hasToolCalls } from '@/types/chat';
import { SERVER_ENV } from '@/config/env.server';
import type { OpenApiEndpoint } from '@/services/llm/executors/OpenApiToolExecutor';
import type { Tool, McpTool } from '@/services/llm/types/strictTypes';
import type { ToolCall } from '@/services/llm/types/strictTypes';
import { isMcpTool, isFunctionTool } from '@/services/llm/types/strictTypes';
import { llmStreamRequestSchema } from '../validation';
import { chatRateLimiter } from '@/services/rateLimiter';
import {
  validateAndExtractUserId,
  resolveAgent,
  validateAndNormalizeModel,
  normalizeLLMParams,
  extractTextFromContent
} from './helpers';

// Force Node.js runtime for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  SERVER_ENV.supabase.url,
  SERVER_ENV.supabase.serviceRoleKey
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
    
    // ✅ Validation Zod stricte
    const validation = llmStreamRequestSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('[Stream Route] ❌ Validation failed:', validation.error.format());
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.error.flatten().fieldErrors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { message, context, history, agentConfig, skipAddingUserMessage } = validation.data;

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
    const userIdResult = await validateAndExtractUserId(
      userToken,
      supabase as unknown as SupabaseClient<unknown, { PostgrestVersion: string }, never, never, { PostgrestVersion: string }>
    );
    
    if (!userIdResult.success) {
      return new Response(
        JSON.stringify({ error: userIdResult.error }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = userIdResult.userId;

    // ✅ SÉCURITÉ: Rate limiting par utilisateur
    const chatLimit = await chatRateLimiter.check(userId);
    
    if (!chatLimit.allowed) {
      const resetDate = new Date(chatLimit.resetTime);
      logger.warn(`[Stream Route] ⛔ Rate limit dépassé pour userId ${userId.substring(0, 8)}...`);
      
      return new Response(
        JSON.stringify({
          error: 'Rate limit dépassé',
          message: `Vous avez atteint la limite de ${chatLimit.limit} messages par minute. Veuillez réessayer dans quelques instants.`,
          remaining: chatLimit.remaining,
          resetTime: chatLimit.resetTime,
          resetDate: resetDate.toISOString()
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': chatLimit.limit.toString(),
            'X-RateLimit-Remaining': chatLimit.remaining.toString(),
            'X-RateLimit-Reset': chatLimit.resetTime.toString(),
            'Retry-After': Math.ceil((chatLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // ✅ Récupérer l'agent comme la route classique (table 'agents')
    const agentId = context.agentId;
    const providerName = context.provider || 'xai';
    
    const finalAgentConfig = await resolveAgent(
      agentId,
      providerName,
      agentConfig,
      supabase as unknown as SupabaseClient<unknown, { PostgrestVersion: string }, never, never, { PostgrestVersion: string }>
    );

    // ✅ Sélectionner le provider selon la config agent (Groq ou xAI)
    let providerType = finalAgentConfig?.provider?.toLowerCase() || 'groq';
    let model = finalAgentConfig?.model || (providerType === 'xai' ? 'grok-4-1-fast-reasoning' : 'openai/gpt-oss-20b');
    
    // 🔍 Auto-détection du provider depuis le modèle (pour éviter incohérences)
    const { getModelInfo } = await import('@/constants/groqModels');
    const modelInfo = getModelInfo(model);
    if (modelInfo?.provider && modelInfo.provider !== providerType) {
      logger.warn(`[Stream Route] ⚠️ Correction automatique provider: ${providerType} → ${modelInfo.provider} (modèle: ${model})`);
      providerType = modelInfo.provider;
    }
    
    // 🔍 Validation et normalisation du modèle
    model = validateAndNormalizeModel(providerType, model);
    
    // Validation et normalisation des paramètres LLM
    const { temperature, topP, maxTokens } = normalizeLLMParams(finalAgentConfig);

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
    let provider;
    if (providerType === 'xai') {
      provider = new XAIProvider({ model, temperature, topP, maxTokens });
    } else if (providerType === 'liminality') {
      const { LiminalityProvider } = await import('@/services/llm/providers/implementations/liminality');
      provider = new LiminalityProvider({ model, temperature, topP, maxTokens });
    } else {
      provider = new GroqProvider({ model, temperature, topP, maxTokens });
    }
    
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
        id: context.id ?? sessionId ?? 'unknown',
        sessionId: sessionId ?? '', // ✅ CRITIQUE : Injecter sessionId explicitement pour tous les LLM
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
    // ⚠️ IMPORTANT: Garder le format original (string OU array multi-modal avec images)
    let processedMessage: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail?: string } }> = message || '';
    
    // Si message est multi-modal (array), extraire le texte pour traitement prompts
    const textForPrompts = typeof message === 'string' 
      ? message 
      : Array.isArray(message) 
        ? message.find((part): part is { type: 'text'; text: string } => part.type === 'text')?.text || ''
        : '';
    
    if (!skipAddingUserMessage && textForPrompts) {
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

          let finalContent = textForPrompts;

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

          // ✅ Si message était multi-modal (array), reconstruire avec texte modifié
          if (Array.isArray(message)) {
            processedMessage = message.map(part => 
              part.type === 'text' ? { ...part, text: finalContent } : part
            );
          } else {
            processedMessage = finalContent;
          }

          logger.info('[Stream Route] 📝 Prompts remplacés', {
            count: prompts.length,
            originalLength: processedMessage.length,
            finalLength: processedMessage.length
          });
        }
      } catch (promptError) {
        logger.error('[Stream Route] ❌ Erreur remplacement prompts:', promptError);
      }
    }
    }
    
    // ✅ Construire le tableau de messages avec contextes injectés AVANT user message
    // Conversion type-safe via mapper
    const sanitizedHistory = history.map((msg, index) => ({
      ...msg,
      id: msg.id ?? `history-${index}`,
      content: msg.content ?? '',
      timestamp: msg.timestamp ?? new Date().toISOString()
    })) as ChatMessage[];

    const messages: ChatMessage[] = ([
      {
        role: 'system',
        content: systemMessage,
        timestamp: new Date().toISOString()
      },
      ...sanitizedHistory,
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
    ]) as ChatMessage[];

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
          // ✅ Type-safe: buildHybridTools retourne Tool[] | McpServerConfig[]
          const hybridTools = await mcpConfigService.buildHybridTools(
            context.agentId,
            userToken,
            openApiTools
          );
          
          tools = hybridTools as Tool[];
          
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
        const TIMEOUT_MS = 180000; // 180s (3 minutes) - permet plusieurs rounds avec tool calls
        
        // ✅ Vérifier timeout
        const checkTimeout = () => {
          if (Date.now() - startTime > TIMEOUT_MS) {
            throw new Error('Stream timeout (180s)');
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
          const currentMessages = [...messages];
          let roundCount = 0;
          const maxRounds = 20;
          
          // ✅ AUDIT : Tracker les tool calls déjà exécutés pour détecter les doublons
          const executedToolCallsSignatures = new Set<string>();
          
          // ✅ RECOVERY: Flag pour indiquer qu'on est dans un round final de recovery (sans tools)
          let forcedFinalRound = false;
          
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
          // Extrait dans helpers.ts

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
            const toolCallsMap = new Map<string, ToolCall>(); // Accumuler par ID pour gérer les chunks
            let finishReason: string | null = null;

            // ✅ Stream depuis le provider avec gestion d'erreur
            try {
              for await (const chunk of provider.callWithMessagesStream(currentMessages, tools)) {
                // ✅ Le chunk contient déjà type: 'delta' (ajouté par le provider)
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
            } catch (streamError) {
              // ✅ ERREUR CRITIQUE : Le stream du provider a échoué
              const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
              const errorStack = streamError instanceof Error ? streamError.stack : undefined;
              
              // Parser pour extraire les détails (status code, etc.)
              let statusCode: number | undefined;
              let errorDetails = errorMessage;
              
              // Pattern pour détecter les erreurs HTTP (ex: "API error: 400 - {...}")
              const httpErrorMatch = errorMessage.match(/(?:error|status):\s*(\d{3})/i);
              if (httpErrorMatch) {
                statusCode = parseInt(httpErrorMatch[1], 10);
              }
              
              logger.error(`[Stream Route] ❌ ERREUR STREAMING PROVIDER (Round ${roundCount}):`, {
                provider: providerType,
                model,
                statusCode,
                errorMessage,
                errorStack,
                roundCount,
                sessionId,
                messagesCount: currentMessages.length
              });
              
              // ✅ Envoyer un événement SSE d'erreur détaillé au client
              sendSSE({
                type: 'error',
                error: errorDetails,
                provider: providerType,
                model,
                statusCode,
                roundCount,
                timestamp: Date.now(),
                recoverable: statusCode === 400 || statusCode === 429 // Erreurs potentiellement récupérables
              });
              
              // Arrêter la boucle des rounds
              break;
            }

            // ✅ AUDIT DÉTAILLÉ : Logger la décision de fin de round
            logger.dev(`[Stream Route] 🎯 DÉCISION ROUND ${roundCount}:`, {
              finishReason,
              toolCallsCount: toolCallsMap.size,
              accumulatedContentLength: accumulatedContent.length,
              willContinue: finishReason === 'tool_calls' && toolCallsMap.size > 0
            });

            // ✅ RECOVERY: Si on est dans un round final forcé, sortir immédiatement après la réponse
            if (forcedFinalRound) {
              logger.info('[Stream Route] ✅ Round final de recovery terminé - sortie de la boucle');
              break;
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

            // ✅ Déduplication forte : ne pas exécuter deux fois le même tool (nom + args)
            const uniqueToolCalls: ToolCall[] = [];
            accumulatedToolCalls.forEach((tc, index) => {
              const signature = `${tc.function.name}:${tc.function.arguments}`;
              const isDuplicate = executedToolCallsSignatures.has(signature);

              logger.info(`[Stream Route] 🔧 TOOL CALL ${index + 1}:`, {
                id: tc.id,
                functionName: tc.function.name,
                args: tc.function.arguments.substring(0, 100),
                isDuplicate
              });

              if (isDuplicate) {
                logger.warn(`[Stream Route] ⚠️ DOUBLON DÉTECTÉ - SKIP ${tc.function.name}`);
                return;
              }

              executedToolCallsSignatures.add(signature);
              uniqueToolCalls.push(tc);
            });

            const dedupedCount = accumulatedToolCalls.length - uniqueToolCalls.length;

            // ✅ NOUVEAU : Persister le message de ce round (outil dédupliqué)
            if (accumulatedContent || uniqueToolCalls.length > 0) {
              sendSSE({
                type: 'assistant_round_complete',
                content: accumulatedContent,
                tool_calls: uniqueToolCalls,
                finishReason: finishReason,
                timestamp: Date.now()
              });
            }

            if (dedupedCount > 0) {
              sendSSE({
                type: 'tool_dedup',
                skipped: dedupedCount,
                timestamp: Date.now()
              });
            }

            // ✅ CRITICAL FIX: Si tous les tool calls sont des doublons, forcer un dernier round SANS tools
            // pour que le LLM explique la situation à l'utilisateur au lieu d'un arrêt silencieux
            if (uniqueToolCalls.length === 0 && accumulatedToolCalls.length > 0) {
              logger.warn('[Stream Route] ⚠️ Tous les tool calls étaient des doublons - forçage dernier round SANS tools');
              
              // Ajouter un message système expliquant la situation
              currentMessages.push({
                role: 'system',
                content: `⚠️ ATTENTION: Tous vos tool calls précédents étaient des doublons d'appels déjà effectués. Pour éviter une boucle infinie, les tools ont été désactivés pour ce round. 

Vous DEVEZ maintenant répondre directement à l'utilisateur pour :
1. Expliquer ce qui s'est passé (quelles erreurs ont été rencontrées)
2. Dire pourquoi vous n'avez pas pu compléter la tâche
3. Proposer des alternatives ou demander des clarifications

NE TENTEZ PAS de refaire les mêmes tool calls. Répondez en texte.`,
                timestamp: new Date().toISOString()
              });
              
              // Envoyer un événement SSE pour informer l'utilisateur
              sendSSE({
                type: 'system_notice',
                message: 'Détection de doublons : relance du LLM sans tools pour explication',
                timestamp: Date.now()
              });
              
              // ✅ Forcer tools = [] et activer le flag de recovery
              tools = [];
              forcedFinalRound = true;
              // On continue la boucle pour que le LLM réponde
              continue;
            }

            // ✅ Exécuter les tool calls (uniques uniquement)
            logger.dev(`[Stream Route] 🔧 Exécution de ${uniqueToolCalls.length} tool calls (après déduplication)`);
            
            // Envoyer un événement d'exécution de tools
            sendSSE({
              type: 'tool_execution',
              toolCount: uniqueToolCalls.length,
              timestamp: Date.now()
            });

            // Ajouter le message assistant avec tool calls dédupliqués
            currentMessages.push({
              role: 'assistant',
              content: accumulatedContent || '',
              tool_calls: uniqueToolCalls,
              timestamp: new Date().toISOString()
            });

            if (!userToken) {
              throw new Error('[Stream Route] Missing user token for OpenAPI tool execution');
            }

            // ✅ Créer l'executor OpenAPI (les tools MCP sont gérés nativement par Groq)
            const { OpenApiToolExecutor } = await import('@/services/llm/executors/OpenApiToolExecutor');
            const openApiExecutor = new OpenApiToolExecutor('', openApiEndpoints);
            
            // ✅ Exécuter chaque tool call
            for (const toolCall of uniqueToolCalls) {
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

