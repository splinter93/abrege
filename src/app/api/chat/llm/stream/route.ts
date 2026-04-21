import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';
import { createClient } from '@supabase/supabase-js';
import { GroqProvider } from '@/services/llm/providers/implementations/groq';
import type { ChatMessage } from '@/types/chat';
import { hasToolCalls } from '@/types/chat';
import { SERVER_ENV } from '@/config/env.server';
import type { OpenApiEndpoint } from '@/services/llm/executors/OpenApiToolExecutor';
import type { Tool, McpTool } from '@/services/llm/types/strictTypes';
import type { ToolCall } from '@/services/llm/types/strictTypes';
import { isMcpTool, isFunctionTool } from '@/services/llm/types/strictTypes';
import type {
  InternalToolStartChunk,
  InternalToolDoneChunk,
  InternalToolErrorChunk
} from '@/services/llm/types/liminalityTypes';
import { llmStreamRequestSchema } from '../validation';
import type { LLMProvider } from '@/services/llm/types';
import { dynamicChatRateLimiter } from '@/services/dynamicRateLimiter';
import {
  validateAndExtractUserId,
  resolveAgent,
  validateAndNormalizeModel,
  normalizeLLMParams,
  extractTextFromContent
} from './helpers';
import { streamBroadcastService } from '@/services/streamBroadcastService';
import { metricsCollector } from '@/services/monitoring/MetricsCollector';
import {
  compressToolResults,
  MAX_HISTORY_MESSAGES,
  TOOL_RESULT_THRESHOLD,
  truncateHistory,
  sanitizeToolSequences
} from '@/services/llm/context/ContextCompressor';
import { resolveAgentSystemInstructionNotes } from '@/services/llm/AgentMentionResolver';

// Force Node.js runtime for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  SERVER_ENV.supabase.url,
  SERVER_ENV.supabase.serviceRoleKey
);

/** Métadonnées tools (callables) séparées du tableau `Tool[]` pour éviter les mutations ad hoc. */
interface StreamToolsContext {
  tools: Tool[];
  synesiaCallables?: string[];
  callableMapping?: Map<string, string>;
}

/**
 * ✅ Route API Streaming pour LLM (Groq ou xAI)
 * Retourne un ReadableStream avec SSE
 * Provider sélectionné automatiquement selon la config agent
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let success = false;
  let sessionId: string | undefined;
  let userToken: string | undefined;
  
  try {
    const body = await request.json();
    
    // ✅ Validation Zod stricte
    const validation = llmStreamRequestSchema.safeParse(body);
    
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      logger.warn(LogCategory.API, '[Stream Route] ❌ Validation failed', {
        errors: validation.error.format()
      });
      return new Response(
        JSON.stringify({
          error: 'Validation échouée. Vérifiez que le message et la session sont valides.',
          details: fieldErrors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { message, context, history, agentConfig, skipAddingUserMessage, maxHistoryMessages } = validation.data;

    // 🎨 Extraire le noteId du contexte canva (si présent)
    const noteId = context.canva_context && typeof context.canva_context === 'object' && 'activeNote' in context.canva_context 
      ? (context.canva_context as { activeNote?: { note?: { id?: string } } }).activeNote?.note?.id 
      : null;

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

    // ✅ Valider le JWT et extraire userId
    const userIdResult = await validateAndExtractUserId(userToken, supabase);
    
    if (!userIdResult.success) {
      return new Response(
        JSON.stringify({ error: userIdResult.error }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = userIdResult.userId;

    // ✅ SÉCURITÉ: Rate limiting par utilisateur (différencié free/premium)
    const chatLimit = await dynamicChatRateLimiter.check(userId);
    
    if (!chatLimit.allowed) {
      const resetDate = new Date(chatLimit.resetTime);
      logger.warn(LogCategory.API, `[Stream Route] ⛔ Rate limit dépassé pour userId`, {
        userId: userId.substring(0, 8) + '...',
        limit: chatLimit.limit,
        resetTime: chatLimit.resetTime
      });
      
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
      supabase
    );

    // ✅ Sélectionner le provider selon la config agent (Groq ou xAI)
    let providerType = finalAgentConfig?.provider?.toLowerCase() || 'groq';
    let model = finalAgentConfig?.model || (providerType === 'xai' ? 'grok-4-1-fast-reasoning' : 'openai/gpt-oss-20b');
    
    logger.info(LogCategory.API, `[Stream Route] 🔍 Configuration initiale:`, {
      agentProvider: finalAgentConfig?.provider,
      agentModel: finalAgentConfig?.model,
      providerType,
      model
    });
    
    // 🔍 Auto-détection du provider depuis le modèle (pour éviter incohérences)
    const { getModelInfo } = await import('@/constants/groqModels');
    const modelInfo = getModelInfo(model);
    
    if (modelInfo?.provider && modelInfo.provider !== providerType) {
      logger.warn(LogCategory.API, `[Stream Route] ⚠️ Correction automatique provider`, {
        from: providerType,
        to: modelInfo.provider,
        model,
        modelInfoId: modelInfo.id
      });
      providerType = modelInfo.provider;
    }

    // Anciennes configs agent (provider deepseek retiré du produit)
    if (providerType === 'deepseek') {
      logger.warn(LogCategory.API, '[Stream Route] Provider deepseek n\'est plus supporté — bascule groq', {
        model,
      });
      providerType = 'groq';
      if (model.includes('deepseek')) {
        model = 'openai/gpt-oss-20b';
      }
    }
    
    // ✅ Log final pour debug
    logger.info(LogCategory.API, `[Stream Route] 🔍 Provider sélectionné:`, {
      providerType,
      model,
      modelInfoFound: !!modelInfo,
      modelInfoProvider: modelInfo?.provider,
      modelInfoId: modelInfo?.id
    });
    
    // 🔍 Validation et normalisation du modèle
    model = validateAndNormalizeModel(providerType, model);
    
    // Validation et normalisation des paramètres LLM
    const { temperature, topP, maxTokens } = normalizeLLMParams(finalAgentConfig);
    
    // ✅ Variables pour paramètres finaux (seront mises à jour après override si nécessaire)
    let finalTemperature = temperature;
    let finalTopP = topP;
    let finalMaxTokens = maxTokens;

    // ✅ Construire le contexte UI (SANS attachedNotes - gérées séparément)
    const uiContext = {
      ...(context.uiContext || {})
      // Notes ne sont PLUS passées ici (évite duplication tokens)
    };
    
    logger.debug(LogCategory.API, '[Stream Route] 🕵️‍♂️ Contexte UI reçu', {
      hasUIContext: !!context.uiContext,
      uiContextKeys: context.uiContext ? Object.keys(context.uiContext) : [],
      contextType: context.type,
      contextId: context.id,
      hasAttachedNotes: !!(context.attachedNotes && context.attachedNotes.length > 0),
      attachedNotesCount: context.attachedNotes?.length || 0
    });

    // ✅ Construire le system message (instructions agent + contexte UI via ContextInjectionService)
    const { SystemMessageBuilder } = await import('@/services/llm/SystemMessageBuilder');
    const { contextInjectionService } = await import('@/services/llm/context');
    const { addToolCallInstructions, addBaseToolCallInstructions } = await import('@/services/llm/toolCallInstructions');
    const systemMessageBuilder = SystemMessageBuilder.getInstance();
    
    // Construire ExtendedLLMContext pour ContextInjectionService (pour context messages uniquement)
    // uiContext contient déjà tous les champs requis de LLMContext
    const extendedContext: import('@/services/llm/context/types').ExtendedLLMContext = {
      ...uiContext,
      sessionId: sessionId ?? '',
      agentId: finalAgentConfig?.id,
      attachedNotes: context.attachedNotes,
      mentionedNotes: context.mentionedNotes,
      canvasSelections: context.canvasSelections
    } as import('@/services/llm/context/types').ExtendedLLMContext;
    
    const agentConfigForSystem =
      finalAgentConfig &&
      Array.isArray(finalAgentConfig.system_instructions_mentions) &&
      finalAgentConfig.system_instructions_mentions.length > 0
        ? {
            ...finalAgentConfig,
            system_instructions: resolveAgentSystemInstructionNotes(
              finalAgentConfig.system_instructions ?? '',
              finalAgentConfig.system_instructions_mentions
            ),
          }
        : finalAgentConfig || {};

    // Construire le system message (instructions agent + contexte UI)
    // SystemMessageBuilder utilise déjà ContextInjectionService pour le contexte UI
    const systemMessageResult = systemMessageBuilder.buildSystemMessage(
      agentConfigForSystem,
      {
        type: context.type || 'chat_session',
        name: context.name || 'Chat',
        id: context.id ?? sessionId ?? 'unknown',
        sessionId: sessionId ?? '',
        provider: providerType,
        ...uiContext
      }
    );
    
    // Instructions tool calls + contrat plan : injectées après chargement des tools si __plan_update est disponible
    const systemMessageBase = systemMessageResult.content;

    // Injecter les context messages (notes, mentions) via ContextInjectionService
    // Note: SystemMessageBuilder a déjà injecté le contexte UI dans le system message
    // Ici on récupère uniquement les MessageContextProviders (notes, mentions)
    const contextInjectionResult = contextInjectionService.injectContext(
      finalAgentConfig || {},
      extendedContext
    );
    
    logger.debug(LogCategory.API, '[Stream Route] 📝 Messages construits:', {
      systemMessageBaseLength: systemMessageBase.length,
      contextMessagesCount: contextInjectionResult.contextMessages.length,
      providersApplied: contextInjectionResult.metadata.providersApplied,
      agentName: finalAgentConfig?.name || 'default',
      vocalMode: context?.vocalMode ?? false
    });
    
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
              logger.warn(LogCategory.API, '[Stream Route] ⚠️ Prompt template manquant', {
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
              logger.warn(LogCategory.API, '[Stream Route] ⚠️ Placeholders non remplis détectés', {
                slug: promptMeta.slug,
                missing: remainingPlaceholders.map((placeholder) => placeholder.name)
              });
            }

            finalContent = finalContent.replace(pattern, `${resolvedTemplate}\n\n`);
            logger.debug(LogCategory.API,'[Stream Route] ✅ Prompt remplacé', {
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

          logger.info(LogCategory.API, '[Stream Route] 📝 Prompts remplacés', {
            count: prompts.length,
            originalLength: processedMessage.length,
            finalLength: processedMessage.length
          });
        }
      } catch (promptError) {
        logger.error(LogCategory.API, '[Stream Route] ❌ Erreur remplacement prompts', {
          error: promptError instanceof Error ? promptError.message : String(promptError)
        }, promptError instanceof Error ? promptError : undefined);
      }
    }
    }
    
    // ✅ Construire le tableau de messages avec contextes injectés AVANT user message
    // Conversion type-safe via mapper
    const sanitizedHistory = sanitizeToolSequences(
      truncateHistory(
        history.map((msg, index) => ({
          ...msg,
          id: msg.id ?? `history-${index}`,
          content: msg.content ?? '',
          timestamp: msg.timestamp ?? new Date().toISOString()
        })) as ChatMessage[],
        maxHistoryMessages ?? MAX_HISTORY_MESSAGES
      )
    );

    // ✅ Extraire les images du format multi-modal si présent
    let userMessageImages: Array<{ url: string; fileName?: string }> | undefined;
    let userMessageText: string = '';
    
    if (!skipAddingUserMessage) {
      if (Array.isArray(processedMessage)) {
        // Format multi-modal : extraire texte et images
        const textPart = processedMessage.find((part): part is { type: 'text'; text: string } => part.type === 'text');
        userMessageText = textPart?.text || '';
        
        const imageParts = processedMessage.filter((part): part is { type: 'image_url'; image_url: { url: string; detail?: string } } => 
          part.type === 'image_url' && !!part.image_url?.url
        );
        
        if (imageParts.length > 0) {
          userMessageImages = imageParts.map(part => ({
            url: part.image_url.url,
            fileName: undefined // Pas de fileName dans le format multi-modal
          }));
          
          logger.debug(LogCategory.API,'[Stream Route] 🖼️ Images extraites du format multi-modal:', {
            count: userMessageImages.length,
            urlPrefixes: userMessageImages.map(img => {
              const url = img.url;
              if (url.startsWith('data:')) {
                return `data:${url.substring(5, 20)}...`; // Afficher juste le type MIME
              } else if (url.startsWith('http')) {
                return url.substring(0, 50) + '...';
              }
              return url.substring(0, 30) + '...';
            })
          });
        }
      } else {
        // Format texte simple
        userMessageText = typeof processedMessage === 'string' ? processedMessage : '';
      }
    }

    // ✅ CRITIQUE : Détection d'images APRÈS extraction complète (pour override modèle)
    const hasImages = !!(userMessageImages && userMessageImages.length > 0);

    // ✅ NOUVEAU : Résolution override modèle/params (images + reasoning)
    // Maintenant qu'on a extrait les images, on peut faire la détection correctement
    const { modelOverrideService } = await import('@/services/llm/modelOverride');
    const overrideContext: import('@/services/llm/modelOverride').ModelOverrideContext = {
      originalModel: model,
      provider: providerType,
      hasImages: hasImages,
      reasoningOverride: context.reasoningOverride || null,
      originalParams: { temperature, topP, maxTokens }
    };

    const overrideResult = modelOverrideService.resolveModelAndParams(overrideContext);
    model = overrideResult.model;
    // ✅ Mettre à jour les paramètres finaux (déjà déclarés plus haut)
    finalTemperature = overrideResult.params.temperature ?? temperature;
    finalTopP = overrideResult.params.topP ?? topP;
    finalMaxTokens = overrideResult.params.maxTokens ?? maxTokens;

    // ✅ CRITIQUE : Utiliser le provider final du résultat override (si détecté)
    // Si le modèle a changé, le provider peut aussi avoir changé (ex: liminality → groq)
    if (overrideResult.finalProvider && overrideResult.finalProvider !== providerType) {
      logger.info(LogCategory.API, `[Stream Route] 🔄 Provider auto-corrigé après override`, {
        from: providerType,
        to: overrideResult.finalProvider,
        model
      });
      providerType = overrideResult.finalProvider;
    }

    if (overrideResult.reasons.length > 0) {
      logger.info(LogCategory.API, '[Stream Route] 🔄 Model/Params override appliqué', {
        originalModel: overrideResult.originalModel,
        newModel: overrideResult.model,
        originalProvider: overrideContext.provider,
        finalProvider: providerType,
        originalParams: { temperature, topP, maxTokens },
        newParams: overrideResult.params,
        reasons: overrideResult.reasons
      });
    }

    // ✅ CRITIQUE : Convertir les URLs S3 canoniques en presigned URLs pour les providers qui en ont besoin
    // Groq, xAI et Liminality : le serveur (ou Synesia) doit pouvoir GET les images
    if (userMessageImages && userMessageImages.length > 0 && (providerType === 'groq' || providerType === 'xai' || providerType === 'liminality')) {
      const { convertS3UrlsToPresigned } = await import('@/services/s3/s3ImageUrlService');
      await convertS3UrlsToPresigned({
        images: userMessageImages,
        provider: providerType,
        expiresIn: 86400 // 24 heures
      });
    }

    // ✅ CRITIQUE : Créer le provider APRÈS l'override (pour utiliser les bons paramètres)
    let provider: LLMProvider;
    if (providerType === 'xai') {
      // ✅ Utiliser XAINativeProvider pour support MCP complet
      const { XAINativeProvider } = await import('@/services/llm/providers/implementations/xai-native');
      provider = new XAINativeProvider({ model, temperature: finalTemperature, topP: finalTopP, maxTokens: finalMaxTokens });
    } else if (providerType === 'liminality') {
      const { LiminalityProvider } = await import('@/services/llm/providers/implementations/liminality');
      let userLiminalityKey: string | undefined;
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('settings')
          .eq('id', userId)
          .maybeSingle();
        const raw = userRow?.settings;
        const key =
          raw &&
          typeof raw === 'object' &&
          !Array.isArray(raw) &&
          typeof (raw as Record<string, unknown>).synesia_api_key === 'string'
            ? String((raw as Record<string, unknown>).synesia_api_key).trim()
            : '';
        if (key.length > 0) {
          userLiminalityKey = key;
          logger.info(LogCategory.API, '[Stream Route] Clé Liminality / Synesia: profil utilisateur utilisée', {
            userId,
          });
        }
      } catch (e) {
        logger.warn(LogCategory.API, '[Stream Route] Impossible de lire settings.synesia_api_key', {
          userId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      provider = new LiminalityProvider({
        model,
        temperature: finalTemperature,
        topP: finalTopP,
        maxTokens: finalMaxTokens,
        ...(userLiminalityKey ? { apiKey: userLiminalityKey } : {}),
      });
    } else if (providerType === 'cerebras') {
      const { CerebrasProvider } = await import('@/services/llm/providers/implementations/cerebras');
      provider = new CerebrasProvider({ model, temperature: finalTemperature, topP: finalTopP, maxTokens: finalMaxTokens });
    } else {
      provider = new GroqProvider({ model, temperature: finalTemperature, topP: finalTopP, maxTokens: finalMaxTokens });
    }

    // ✅ Charger les tools (OpenAPI + MCP) ET les endpoints
    let tools: Tool[] = [];
    const toolsMeta: {
      synesiaCallables?: string[];
      callableMapping?: Map<string, string>;
    } = {};
    let openApiEndpoints = new Map<string, OpenApiEndpoint>();
    
    // 🔥 LOG CRITIQUE : Vérifier si context.agentId existe
    logger.info(LogCategory.API, `[Stream Route] 🔥 MCP - Context`, {
      agentId: context.agentId || 'none'
    });
    
    if (context.agentId) {
      try {
        // 1. Charger les schémas OpenAPI de l'agent
        const { data: agentSchemas } = await supabase
          .from('agent_openapi_schemas')
          .select('openapi_schema_id')
          .eq('agent_id', context.agentId);

        logger.info(LogCategory.API, `[Stream Route] 🔥 MCP - Schémas OpenAPI`, {
          count: agentSchemas?.length || 0
        });

        let openApiTools: Tool[] = [];

        if (agentSchemas && agentSchemas.length > 0) {
          const { openApiSchemaService } = await import('@/services/llm/openApiSchemaService');
          
          const schemaIds = agentSchemas.map(s => s.openapi_schema_id);
          const { tools, endpoints } = await openApiSchemaService.getToolsAndEndpointsFromSchemas(schemaIds);
          
          openApiTools = tools;
          openApiEndpoints = endpoints;
          
          logger.info(LogCategory.API, `[Stream Route] 🔥 MCP - OpenAPI tools`, {
            count: openApiTools.length
          });
        } else {
          logger.warn(LogCategory.API, `[Stream Route] ⚠️ Aucun schéma OpenAPI pour agent, mais on charge quand même les MCP tools`, {
            agentId: context.agentId
          });
        }
        
        // 2. Charger les tools MCP de l'agent (TOUJOURS, même sans schémas OpenAPI)
        const { mcpConfigService } = await import('@/services/llm/mcpConfigService');
        
        logger.info(LogCategory.API, `[Stream Route] 🔥 MCP - Appel buildHybridTools`, {
          openApiToolsCount: openApiTools.length
        });
        
        // ✅ Type-safe: buildHybridTools retourne Tool[] | McpServerConfig[]
        const hybridTools = await mcpConfigService.buildHybridTools(
          context.agentId,
          userToken,
          openApiTools
        );
        
        tools = hybridTools as Tool[];
        
        // ✅ Charger les callables liés à l'agent
        const { callableService } = await import('@/services/llm/callableService');
        const agentCallables = await callableService.getCallablesForAgent(context.agentId);
        const synesiaCallableIds = agentCallables.length > 0 ? agentCallables.map(c => c.id) : undefined;
        
        if (synesiaCallableIds && synesiaCallableIds.length > 0) {
          logger.info(LogCategory.API, `[Stream Route] 🔗 Callables trouvés pour l'agent`, {
            count: synesiaCallableIds.length
          });
          
          // ✅ Pour Liminality : IDs callables passés au provider ; sinon conversion en FunctionTool
          if (providerType === 'liminality') {
            toolsMeta.synesiaCallables = synesiaCallableIds;
          } else {
            // ✅ Pour les autres providers : convertir en FunctionTool
            const { CallableToolsAdapter } = await import('@/services/llm/providers/adapters/CallableToolsAdapter');
            const { tools: callableTools, mapping: callableMapping } = CallableToolsAdapter.convertToFunctionTools(agentCallables);
            
            if (callableTools.length > 0) {
              tools.push(...callableTools);
              
              toolsMeta.callableMapping = callableMapping;
              
              logger.info(LogCategory.API, `[Stream Route] ✅ ${callableTools.length} callables convertis en tools pour provider ${providerType}`);
            }
          }
        }
        
        // ✅ Internal tools (plan_update, etc.) — injectés uniquement si l'agent a
        // au moins 2 external tools réels. Un seul tool ne justifie pas un plan en
        // étapes séquentielles, et les petits modèles déraillent avec __plan_update.
        const { INTERNAL_TOOLS, INTERNAL_TOOL_NAMES: _internalNames } = await import('@/services/llm/tools/internalTools');
        const externalToolCount =
          tools.filter(t => isFunctionTool(t) && !_internalNames.has(t.function.name)).length +
          tools.filter(isMcpTool).length;
        if (externalToolCount >= 2) {
          tools.push(...INTERNAL_TOOLS);
        }

        const mcpCount = tools.filter(isMcpTool).length;
        const functionTools = tools.filter(isFunctionTool);
        const openApiCount = functionTools.length;
        const callableMapping = toolsMeta.callableMapping;
        const callableCount = callableMapping ? callableMapping.size : 0;
        
        logger.info(LogCategory.API, `[Stream Route] ✅ MCP - Tools chargés`, {
          total: tools.length,
          mcpCount,
          openApiCount,
          callableCount,
          callables: agentCallables.length
        });
        
        logger.debug(LogCategory.API, `[Stream Route] ✅ ${tools.length} tools chargés`, {
        mcpCount,
        openApiCount,
        callableCount,
        endpoints: openApiEndpoints.size,
        callables: agentCallables.length
      });
      } catch (toolsError) {
        logger.error(LogCategory.API, '[Stream Route] ❌ Erreur chargement tools', {
          error: toolsError instanceof Error ? toolsError.message : String(toolsError)
        }, toolsError instanceof Error ? toolsError : undefined);
        // Continue sans tools
      }
    } else {
      logger.warn(LogCategory.API, `[Stream Route] ⚠️ PAS de context.agentId → 0 tools chargés`);
    }

    const hasPlanTool = tools.some((t) => isFunctionTool(t) && t.function?.name === '__plan_update');
    const hasAnyTool = tools.length > 0;
    // Plan tool présent → JSON hygiene + plan protocol + notes
    // Autres tools sans plan → JSON hygiene uniquement (évite tokens inutiles)
    // Aucun tool → system message brut
    const systemMessage = hasPlanTool
      ? addToolCallInstructions(systemMessageBase)
      : hasAnyTool
        ? addBaseToolCallInstructions(systemMessageBase)
        : systemMessageBase;

    const messages: ChatMessage[] = ([
      {
        role: 'system',
        content: systemMessage,
        timestamp: new Date().toISOString()
      },
      ...sanitizedHistory,
      ...contextInjectionResult.contextMessages,
      ...(skipAddingUserMessage ? [] : [{
        role: 'user' as const,
        content: userMessageText,
        timestamp: new Date().toISOString(),
        ...(userMessageImages && userMessageImages.length > 0 && { attachedImages: userMessageImages })
      }])
    ]) as ChatMessage[];

    const lastUserMessageForLog = messages.filter(m => m.role === 'user').pop();
    logger.info(LogCategory.API, '[Stream Route] 📋 Messages construits pour le provider', {
      totalMessages: messages.length,
      historyLength: sanitizedHistory.length,
      hasUserMessage: !skipAddingUserMessage,
      hasPlanToolInstructions: hasPlanTool,
      systemMessageLength: systemMessage.length,
      userMessageText: userMessageText.substring(0, 100) + (userMessageText.length > 100 ? '...' : ''),
      userMessageHasImages: !!(userMessageImages && userMessageImages.length > 0),
      userMessageImageCount: userMessageImages?.length || 0,
      provider: providerType,
      model: model,
      messagesRoles: messages.map(m => m.role),
      lastMessageRole: messages[messages.length - 1]?.role,
      lastMessageHasImages: !!(messages[messages.length - 1] && 'attachedImages' in messages[messages.length - 1] && (messages[messages.length - 1] as { attachedImages?: unknown[] }).attachedImages?.length),
      lastUserMessageHasAttachedImages: !!(lastUserMessageForLog && 'attachedImages' in lastUserMessageForLog && (lastUserMessageForLog as { attachedImages?: unknown[] }).attachedImages?.length),
      lastUserMessageAttachedImagesCount: lastUserMessageForLog && 'attachedImages' in lastUserMessageForLog ? ((lastUserMessageForLog as { attachedImages?: unknown[] }).attachedImages?.length || 0) : 0
    });

    const toolsCtx: StreamToolsContext = {
      tools,
      ...(toolsMeta.synesiaCallables !== undefined
        ? { synesiaCallables: toolsMeta.synesiaCallables }
        : {}),
      ...(toolsMeta.callableMapping !== undefined
        ? { callableMapping: toolsMeta.callableMapping }
        : {}),
    };

    // ✅ Créer le ReadableStream pour SSE avec gestion tool calls
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const TIMEOUT_MS = 600000; // 600s (10 minutes) - permet enchaînements longs comme Cursor avec dizaines de tool calls
        
        // ✅ Vérifier timeout
        const checkTimeout = (context?: string) => {
          const elapsed = Date.now() - startTime;
          if (elapsed > TIMEOUT_MS) {
            const timeoutError = new Error(`Stream timeout après ${Math.round(elapsed / 1000)}s (limite: ${TIMEOUT_MS / 1000}s)`);
            (timeoutError as Error & { 
              isTimeout: boolean; 
              elapsed: number; 
              limit: number;
              context?: string;
            }).isTimeout = true;
            (timeoutError as Error & { elapsed: number }).elapsed = elapsed;
            (timeoutError as Error & { limit: number }).limit = TIMEOUT_MS;
            if (context) {
              (timeoutError as Error & { context: string }).context = context;
            }
            throw timeoutError;
          }
        };
        
        // ✅ Déclarer roundCount avant le try pour qu'il soit accessible dans le catch
        let roundCount = 0;
        
        try {
          logger.debug(LogCategory.API,'[Stream Route] 📡 Démarrage du stream SSE');
          
          // Helper pour envoyer un chunk SSE
          const sendSSE = (data: unknown) => {
            checkTimeout('sendSSE'); // Vérifier avant chaque envoi
            const chunk = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          };

          // UUID partagé serveur/client pour dédup add_message_atomic (persist serveur + client)
          const serverOperationId = randomUUID();

          // Envoyer un chunk de début avec info modèle (pour debug)
          const wasOverridden = overrideResult.model !== overrideResult.originalModel || overrideResult.reasons.length > 0;
          sendSSE({
            type: 'start',
            sessionId,
            operationId: serverOperationId,
            timestamp: Date.now(),
            model: {
              original: overrideResult.originalModel,
              current: overrideResult.model,
              wasOverridden,
              reasons: overrideResult.reasons
            }
          });

          // ✅ Boucle agentic en streaming (max 5 tours)
          const currentMessages = [...messages];
          const maxRounds = 20;
          let toolValidationRetryCount = 0; // ✅ NOUVEAU: Compteur pour retry tool_use_failed
          const maxToolValidationRetries = 1; // ✅ Max 1 retry automatique
          
          // ✅ AUDIT : Tracker les tool calls déjà exécutés pour détecter les doublons
          // ✅ RECOVERY: Flag pour indiquer qu'on est dans un round final de recovery (sans tools)
          let forcedFinalRound = false;
          
          // ✅ Séparer les tools MCP (exécutés par Groq nativement) des OpenAPI (exécutés par nous)
          const mcpTools = toolsCtx.tools.filter(isMcpTool);
          const openApiTools = toolsCtx.tools.filter(isFunctionTool);
          
          // ✅ Créer une Map des tool names OpenAPI → pour routing d'exécution
          const openApiToolNames = new Set(openApiTools.map(t => t.function.name));
          
          // ✅ Récupérer le mapping des callables si disponible
          const callableMapping = toolsCtx.callableMapping;
          const callableToolNames = callableMapping ? new Set(callableMapping.keys()) : new Set<string>();
          
          logger.debug(LogCategory.API,`[Stream Route] 🗺️ Tools séparés:`, {
            totalTools: toolsCtx.tools.length,
            mcpCount: mcpTools.length,
            openApiCount: openApiTools.length,
            callableCount: callableToolNames.size,
            mcpServers: mcpTools.map(t => (t as McpTool).server_label),
            openApiNames: Array.from(openApiToolNames),
            callableNames: Array.from(callableToolNames)
          });

          // ✅ Helper: Extraire le texte d'un MessageContent (string ou array multi-modal)
          // Extrait dans helpers.ts

          while (roundCount < maxRounds) {
            roundCount++;
            logger.debug(LogCategory.API,`[Stream Route] 🔄 Round ${roundCount}/${maxRounds}`);

            // ✅ AUDIT DÉTAILLÉ : Logger les messages envoyés au LLM pour ce round
            const lastMessage = currentMessages[currentMessages.length - 1];
            const lastContent = lastMessage?.content ? extractTextFromContent(lastMessage.content) : '';
            
            logger.debug(LogCategory.API,`[Stream Route] 📋 MESSAGES ENVOYÉS AU LLM - ROUND ${roundCount}:`, {
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
              logger.info(LogCategory.API, `[Stream Route] 🔍 DERNIERS 5 MESSAGES (Round ${roundCount}):`);
              last5.forEach((m, i) => {
                const toolCallId = m.role === 'tool' ? (m as { tool_call_id?: string }).tool_call_id : undefined;
                const toolCallsCount = m.role === 'assistant' && 'tool_calls' in m && Array.isArray(m.tool_calls) ? m.tool_calls.length : 0;
                logger.info(LogCategory.API, `  ${i+1}. ${m.role} - toolCalls:${toolCallsCount} - toolCallId:${toolCallId||'none'}`);
              });
            }

            // Accumuler tool calls et content du stream
            let accumulatedContent = '';
            const toolCallsMap = new Map<string, ToolCall>(); // Accumuler par ID pour gérer les chunks
            let finishReason: string | null = null;
            
            // ✅ Liminality callables : IDs déjà traités via internal_tool.start/done.
            // Permet d'ignorer les mêmes tool_calls qui apparaissent ensuite dans l'event 'done'.
            const liminalityInternalToolIds = new Set<string>();
            
            // ✅ NOUVEAU : Stocker les mcp_calls pour les afficher dans la timeline
            let currentRoundMcpCalls: Array<{ server_label: string; name: string; arguments: Record<string, unknown>; output?: unknown }> = [];

            // ✅ Stream depuis le provider avec gestion d'erreur
            try {
              // ✅ CRITIQUE : Logger le modèle utilisé et les images avant l'appel
              const lastUserMsg = currentMessages.filter(m => m.role === 'user').pop();
              logger.info(LogCategory.API, `[Stream Route] 🚀 Appel provider - Round ${roundCount}:`, {
                provider: providerType,
                model: model,
                hasImages: !!(lastUserMsg && 'attachedImages' in lastUserMsg && (lastUserMsg as { attachedImages?: unknown[] }).attachedImages?.length),
                imageCount: lastUserMsg && 'attachedImages' in lastUserMsg ? ((lastUserMsg as { attachedImages?: unknown[] }).attachedImages?.length || 0) : 0,
                messagesCount: currentMessages.length
              });
              
              const roundTools = forcedFinalRound ? [] : toolsCtx.tools;
              const streamCall = provider.callWithMessagesStream(
                currentMessages,
                roundTools,
                providerType === 'liminality' ? toolsCtx.synesiaCallables : undefined
              );
              
              for await (const chunk of streamCall) {
                // ✅ Vérifier si c'est un chunk d'erreur du provider
                if (chunk && typeof chunk === 'object' && 'type' in chunk && chunk.type === 'error') {
                  const errorChunk = chunk as { error?: string; errorCode?: string; provider?: string; model?: string };
                  sendSSE({
                    type: 'error',
                    error: errorChunk.error || 'Erreur inconnue du provider',
                    errorCode: errorChunk.errorCode,
                    provider: errorChunk.provider || providerType,
                    model: errorChunk.model || model,
                    roundCount,
                    timestamp: Date.now()
                  });
                  // Arrêter le stream en cas d'erreur
                  break;
                }

                // ✅ Liminality callables : traduire internal_tool.* en événements SSE client (assistant_round_complete / tool_result)
                if (chunk && typeof chunk === 'object' && 'type' in chunk) {
                  if (chunk.type === 'internal_tool.start') {
                    const startChunk = chunk as InternalToolStartChunk;
                    logger.debug(LogCategory.API, '[Stream Route] 🔧 internal_tool.start → assistant_round_complete', {
                      name: startChunk.name,
                      toolCallId: startChunk.tool_call_id.substring(0, 8),
                      ...(startChunk.mcp_server && { mcp_server: startChunk.mcp_server })
                    });
                    // Mémoriser l'ID : le même tool_call_id apparaîtra ensuite dans l'event 'done'
                    // de Liminality → on l'ignorera pour éviter un doublon assistant_round_complete.
                    liminalityInternalToolIds.add(startChunk.tool_call_id);
                    sendSSE({
                      type: 'assistant_round_complete',
                      content: '',
                      tool_calls: [{
                        id: startChunk.tool_call_id,
                        type: 'function',
                        function: {
                          name: startChunk.name,
                          arguments: JSON.stringify(startChunk.arguments ?? {})
                        }
                      }],
                      finishReason: 'tool_calls',
                      timestamp: Date.now(),
                      ...(startChunk.mcp_server && { mcp_server: startChunk.mcp_server })
                    });
                    continue;
                  }
                  if (chunk.type === 'internal_tool.done') {
                    const doneChunk = chunk as InternalToolDoneChunk;
                    logger.debug(LogCategory.API, '[Stream Route] ✅ internal_tool.done → tool_result', {
                      name: doneChunk.name,
                      ...(doneChunk.mcp_server && { mcp_server: doneChunk.mcp_server })
                    });
                    // Garantir que l'ID est bien mémorisé même si .done arrive avant .start (rare mais possible)
                    liminalityInternalToolIds.add(doneChunk.tool_call_id);
                    sendSSE({
                      type: 'tool_result',
                      toolCallId: doneChunk.tool_call_id,
                      toolName: doneChunk.name,
                      result: doneChunk.result,
                      success: true,
                      timestamp: Date.now(),
                      isCallable: true,
                      ...(doneChunk.mcp_server && { mcp_server: doneChunk.mcp_server })
                    });
                    continue;
                  }
                  if (chunk.type === 'internal_tool.error') {
                    const errChunk = chunk as InternalToolErrorChunk;
                    logger.debug(LogCategory.API, '[Stream Route] ❌ internal_tool.error → tool_result', {
                      name: errChunk.name,
                      ...(errChunk.mcp_server && { mcp_server: errChunk.mcp_server })
                    });
                    sendSSE({
                      type: 'tool_result',
                      toolCallId: errChunk.tool_call_id,
                      toolName: errChunk.name,
                      result: errChunk.error,
                      success: false,
                      timestamp: Date.now(),
                      isCallable: true,
                      ...(errChunk.mcp_server && { mcp_server: errChunk.mcp_server })
                    });
                    continue;
                  }
                }

                // ✅ Le chunk contient déjà type: 'delta' (ajouté par le provider)
                sendSSE(chunk);

                // 🎨 Broadcaster vers le canevas si actif
                if (noteId && chunk && typeof chunk === 'object' && 'content' in chunk && chunk.content) {
                  streamBroadcastService.broadcast(noteId, {
                    type: 'chunk',
                    data: chunk.content as string,
                    position: 'end', // Ajouter à la fin
                    metadata: {
                      timestamp: Date.now()
                    }
                  });
                }

                // Accumuler content
                if (chunk && typeof chunk === 'object' && 'content' in chunk && chunk.content) {
                  accumulatedContent += chunk.content as string;
                }
                
                // ✅ NOUVEAU : Extraire les mcp_calls si présents dans le chunk
                if (chunk && typeof chunk === 'object' && 'x_groq' in chunk && chunk.x_groq && typeof chunk.x_groq === 'object' && 'mcp_calls' in chunk.x_groq) {
                  const mcpCalls = (chunk.x_groq as { mcp_calls?: Array<{ server_label: string; name: string; arguments: Record<string, unknown>; output?: unknown }> }).mcp_calls;
                  if (mcpCalls && Array.isArray(mcpCalls)) {
                    currentRoundMcpCalls = mcpCalls;
                    logger.debug(LogCategory.API,`[Stream Route] 🔧 MCP calls détectés dans chunk: ${mcpCalls.length}`);
                  }
                }
                
                // ✅ Accumuler tool calls (peuvent venir en plusieurs chunks)
                if (chunk && typeof chunk === 'object' && 'tool_calls' in chunk && chunk.tool_calls && Array.isArray(chunk.tool_calls) && chunk.tool_calls.length > 0) {
                  for (const tc of chunk.tool_calls) {
                    // ✅ VALIDATION: Filtrer les tool calls sans ID valide (chunks incomplets)
                    if (!tc.id || tc.id.trim().length === 0) {
                      logger.debug(LogCategory.API, `[Stream Route] ⚠️ SKIP tool call chunk sans ID valide (chunk incomplet, attendre prochain chunk)`, {
                        hasName: !!tc.function?.name,
                        hasArgs: !!tc.function?.arguments
                      });
                      continue; // ⚠️ Attendre le chunk suivant avec l'ID
                    }
                    
                    // ✅ Liminality : ignorer les tool_calls déjà traités via internal_tool.start/done.
                    // L'event 'done' de Synesia répète les callables exécutés nativement → doublon.
                    if (liminalityInternalToolIds.has(tc.id)) {
                      logger.debug(LogCategory.API, `[Stream Route] ⏭️ SKIP tool call Liminality déjà traité via internal_tool.*`, {
                        id: tc.id,
                        name: tc.function?.name
                      });
                      continue;
                    }
                    
                    // Extension custom pour MCP tools (alreadyExecuted, result)
                    const mcpToolCall = tc as ToolCall & { alreadyExecuted?: boolean; result?: unknown };
                    const hasCustomProps = mcpToolCall.alreadyExecuted !== undefined || mcpToolCall.result !== undefined;
                    if (hasCustomProps) {
                      logger.debug(LogCategory.API,`[Stream Route] 🔧 Tool call avec props MCP:`, { 
                        id: tc.id, 
                        name: tc.function.name,
                        alreadyExecuted: mcpToolCall.alreadyExecuted,
                        hasResult: !!mcpToolCall.result
                      });
                    }
                    
                    if (!toolCallsMap.has(tc.id)) {
                      // ✅ Créer l'objet de base
                      const baseToolCall: ToolCall = {
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                          name: tc.function?.name || '', // ⚠️ Peut être vide dans le premier chunk
                          arguments: tc.function?.arguments || ''
                        }
                      };
                      
                      // ✅ Copier TOUTES les propriétés custom (alreadyExecuted, result, etc.)
                      const fullToolCall = Object.assign(baseToolCall, tc);
                      toolCallsMap.set(tc.id, fullToolCall);
                    } else {
                      // Accumuler les arguments progressifs
                      const existing = toolCallsMap.get(tc.id);
                      if (!existing) {
                        logger.error(LogCategory.API, `[Stream Route] ⚠️ Tool call ${tc.id} not found in map`, { toolCallId: tc.id });
                        continue;
                      }
                      // ✅ Mettre à jour le nom si présent (peut arriver après l'ID dans le stream)
                      if (tc.function?.name && tc.function.name.trim().length > 0) {
                        existing.function.name = tc.function.name;
                      }
                      // ✅ Accumuler les arguments (peuvent venir en plusieurs chunks)
                      if (tc.function?.arguments) {
                        const existingArgs = existing.function.arguments;
                        const newFragment = tc.function.arguments;
                        let skipDuplicate = false;
                        if (newFragment === existingArgs || newFragment.trim() === existingArgs.trim()) {
                          skipDuplicate = true;
                        } else if (newFragment.trim().startsWith('{')) {
                          try {
                            const existingObj = JSON.parse(existingArgs);
                            if (existingObj && typeof existingObj === 'object' && !Array.isArray(existingObj)) {
                              const newObj = JSON.parse(newFragment.trim());
                              if (newObj && typeof newObj === 'object' && !Array.isArray(newObj) && JSON.stringify(newObj) === JSON.stringify(existingObj)) {
                                skipDuplicate = true;
                              }
                            }
                          } catch (_e) {
                            logger.debug(
                              LogCategory.API,
                              '[Stream Route] JSON args parse skip — fragment accumulé',
                              { fragmentPrefix: newFragment?.slice(0, 40) }
                            );
                          }
                        }
                        if (!skipDuplicate) {
                          existing.function.arguments += newFragment;
                        }
                      }
                    }
                  }
                }

                // ✅ Capturer finish_reason
                if (chunk && typeof chunk === 'object' && 'finishReason' in chunk && chunk.finishReason) {
                  finishReason = chunk.finishReason as string;
                }
              }
            } catch (streamError) {
              // ✅ ERREUR CRITIQUE : Le stream du provider a échoué
              const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
              const errorStack = streamError instanceof Error ? streamError.stack : undefined;
              
              // ✅ Extraire les métadonnées enrichies attachées par le provider (si présentes)
              const enrichedError = streamError as Error & { 
                statusCode?: number; 
                provider?: string; 
                errorCode?: string; 
              };
              
              let statusCode = enrichedError.statusCode;
              let errorCode = enrichedError.errorCode;
              const providerFromError = enrichedError.provider;
              const errorDetails = errorMessage;
              
              // ✅ Fallback: Parser le message pour extraire statusCode si non présent
              if (!statusCode) {
                const httpErrorMatch = errorMessage.match(/(?:error|status):\s*(\d{3})/i);
                if (httpErrorMatch) {
                  statusCode = parseInt(httpErrorMatch[1], 10);
                }
              }
              
              // ✅ Fallback: Parser le message pour extraire errorCode si non présent
              if (!errorCode) {
                const errorCodeMatch = errorMessage.match(/code[:\s]+["']?([a-z_]+)["']?/i);
                if (errorCodeMatch) {
                  errorCode = errorCodeMatch[1];
                }
              }
              
              logger.error(LogCategory.API, `[Stream Route] ❌ ERREUR STREAMING PROVIDER (Round ${roundCount}):`, {
                provider: providerFromError || providerType,
                model,
                statusCode,
                errorCode,
                errorMessage,
                errorStack,
                roundCount,
                sessionId,
                messagesCount: currentMessages.length
              });
              
              // ✅ RETRY AUTOMATIQUE pour tool_use_failed (1 fois max)
              if (errorCode === 'tool_use_failed' && toolValidationRetryCount < maxToolValidationRetries) {
                toolValidationRetryCount++;
                
                logger.warn(LogCategory.API, `[Stream Route] 🔄 Retry automatique pour tool_use_failed (${toolValidationRetryCount}/${maxToolValidationRetries})`);
                
                // Envoyer un SSE pour informer le client du retry
                sendSSE({
                  type: 'assistant_round_complete',
                  finishReason: 'error_retry',
                  content: `⚠️ Erreur de validation tool call détectée. Retry automatique en cours...`
                });
                
                // Ajouter un message système pour que le LLM corrige
                currentMessages.push({
                  role: 'system',
                  content: `❌ Tool call validation error: ${errorDetails}\n\nThe tool you tried to call is not available or the parameters are invalid. Please:\n1. Check the available tools list\n2. Use only the tools that are actually provided\n3. Ensure all parameters match the expected schema\n\nIf you cannot complete the task with available tools, inform the user clearly.`
                });
                
                // Continuer la boucle pour réessayer
                continue;
              }
              
              // ✅ Si retry épuisé ou erreur non-recoverable → Envoyer erreur au client
              sendSSE({
                type: 'error',
                error: errorDetails,
                errorCode, // ✅ NOUVEAU: Code d'erreur spécifique (ex: "tool_use_failed")
                provider: providerFromError || providerType,
                model,
                statusCode,
                roundCount,
                timestamp: Date.now(),
                recoverable: (statusCode === 400 || statusCode === 429 || errorCode === 'tool_use_failed') && toolValidationRetryCount >= maxToolValidationRetries // ✅ Recoverable si retry disponible
              });
              
              // Arrêter la boucle des rounds
              break;
            }

            // ✅ AUDIT DÉTAILLÉ : Logger la décision de fin de round
            logger.debug(LogCategory.API,`[Stream Route] 🎯 DÉCISION ROUND ${roundCount}:`, {
              finishReason,
              toolCallsCount: toolCallsMap.size,
              accumulatedContentLength: accumulatedContent.length,
              willContinue: finishReason === 'tool_calls' && toolCallsMap.size > 0
            });

            // ✅ RECOVERY: Si on est dans un round final forcé, sortir immédiatement après la réponse
            if (forcedFinalRound) {
              logger.info(LogCategory.API, '[Stream Route] ✅ Round final de recovery terminé - sortie de la boucle');
              break;
            }

            // ✅ Décision basée sur finish_reason
            // ⚠️ CRITICAL: Si finishReason === 'stop' MAIS on a des tool calls MCP, on doit les afficher AVANT de sortir
            if (finishReason === 'tool_calls' && toolCallsMap.size > 0) {
              logger.debug(LogCategory.API,`[Stream Route] 🔧 Tool calls détectés (${toolCallsMap.size}), exécution...`);
            } else if (finishReason === 'stop') {
              // ✅ CRITICAL FIX: Si on a des tool calls MCP (déjà exécutés), on doit les afficher AVANT de sortir
              if (toolCallsMap.size > 0) {
                logger.debug(LogCategory.API,`[Stream Route] 🔧 finishReason='stop' mais ${toolCallsMap.size} tool call(s) MCP à afficher - traitement avant sortie`);
                // On continue pour traiter les tool calls MCP (lignes suivantes)
              } else {
                logger.debug(LogCategory.API,'[Stream Route] ✅ Réponse finale (stop), fin du stream');
                break;
              }
            } else if (finishReason === 'length') {
              logger.warn(LogCategory.API, '[Stream Route] ⚠️ Token limit atteint');
              break;
            } else {
              logger.debug(LogCategory.API,'[Stream Route] ✅ Pas de tool calls, fin du stream');
              break;
            }

            const accumulatedToolCalls = Array.from(toolCallsMap.values());

            // ✅ VALIDATION: Filtrer les tool calls invalides (id vide, name vide)
            const validToolCalls = accumulatedToolCalls.filter((tc) => {
              const hasValidId = tc.id && tc.id.trim().length > 0;
              const hasValidName = tc.function?.name && tc.function.name.trim().length > 0;
              
              if (!hasValidId || !hasValidName) {
                logger.warn(LogCategory.API, `[Stream Route] ⚠️ SKIP tool call invalide:`, {
                  id: tc.id || '(vide)',
                  name: tc.function?.name || '(vide)',
                  hasValidId,
                  hasValidName
                });
                return false;
              }
              return true;
            });

            // ✅ Séparer les tool calls : MCP x.ai (déjà exécutés) vs autres (à exécuter)
            const alreadyExecutedTools: ToolCall[] = [];
            const toolsToExecute: ToolCall[] = [];
            
            validToolCalls.forEach((tc) => {
              if (tc.alreadyExecuted === true) {
                alreadyExecutedTools.push(tc);
              } else {
                toolsToExecute.push(tc);
              }
            });

            logger.debug(LogCategory.API,`[Stream Route] 🔧 Tool calls: ${alreadyExecutedTools.length} déjà exécutés (MCP x.ai), ${toolsToExecute.length} à exécuter (${accumulatedToolCalls.length - validToolCalls.length} invalides filtrés)`);

            // ✅ DÉDUPLICATION SIMPLE: Utiliser uniquement l'ID (les IDs sont uniques par définition)
            // ⚠️ IMPORTANT: On ne bloque PAS les tool calls entre les rounds - c'est normal qu'un tool soit appelé plusieurs fois dans une conversation
            const uniqueToolCalls: ToolCall[] = [];
            const seenToolCallIds = new Set<string>(); // ✅ IDs déjà vus dans ce round uniquement
            
            toolsToExecute.forEach((tc, index) => {
              // ✅ Validation
              if (!tc.id || tc.id.trim().length === 0) {
                logger.warn(LogCategory.API, `[Stream Route] ⚠️ SKIP tool call sans ID valide`);
                return;
              }
              
              if (!tc.function?.name || tc.function.name.trim().length === 0) {
                logger.warn(LogCategory.API, `[Stream Route] ⚠️ SKIP tool call sans nom de fonction`);
                return;
              }

              // ✅ Vérifier uniquement si l'ID a déjà été vu dans CE round (vrai doublon)
              if (seenToolCallIds.has(tc.id)) {
                logger.warn(LogCategory.API, `[Stream Route] ⚠️ DOUBLON DÉTECTÉ (même ID dans ce round) - SKIP ${tc.function.name}`, {
                  id: tc.id,
                  round: roundCount
                });
                return;
              }

              logger.info(LogCategory.API, `[Stream Route] 🔧 TOOL CALL ${index + 1}:`, {
                id: tc.id,
                functionName: tc.function.name,
                args: (tc.function.arguments || '').substring(0, 100),
                round: roundCount
              });

              // ✅ Ajouter l'ID à la liste des IDs vus dans ce round
              seenToolCallIds.add(tc.id);
              uniqueToolCalls.push(tc);
            });

            const dedupedCount = toolsToExecute.length - uniqueToolCalls.length;

            // ✅ NOUVEAU : Persister le message de ce round (outil dédupliqué)
            // Combiner MCP tools (déjà exécutés) + tools à exécuter pour la timeline
            const allToolsForTimeline = [...alreadyExecutedTools, ...uniqueToolCalls];
            
            if (accumulatedContent || allToolsForTimeline.length > 0) {
              logger.debug(LogCategory.API,`[Stream Route] 📤 Envoi assistant_round_complete:`, {
                toolCallsCount: allToolsForTimeline.length,
                mcpCount: alreadyExecutedTools.length,
                openApiCount: uniqueToolCalls.length,
                toolNames: allToolsForTimeline.map(tc => tc.function.name)
              });
              
              sendSSE({
                type: 'assistant_round_complete',
                content: accumulatedContent,
                tool_calls: allToolsForTimeline,
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

            // ✅ CRITICAL FIX: Si on a seulement des MCP tools déjà exécutés ET du contenu, c'est la fin
            // xAI a déjà généré la réponse finale après avoir exécuté le MCP call
            // ⚠️ MAIS: On doit envoyer assistant_round_complete et tool_result AVANT de sortir
            // On continue pour traiter les tool calls MCP (lignes suivantes)
            // Le break sera après l'envoi des tool_result (voir ligne ~950)
            if (uniqueToolCalls.length === 0 && alreadyExecutedTools.length > 0 && accumulatedContent.length > 0) {
              logger.info(LogCategory.API, '[Stream Route] ✅ MCP tools déjà exécutés + contenu reçu - réponse finale de xAI, traitement puis fin du round');
              // On continue pour envoyer assistant_round_complete et tool_result
            }

            // ✅ CRITICAL FIX: Si tous les tool calls sont des doublons, forcer un dernier round SANS tools
            // pour que le LLM explique la situation à l'utilisateur au lieu d'un arrêt silencieux
            // ⚠️ MAIS: Si on a des MCP tools déjà exécutés, PAS besoin de forcer un round
            if (uniqueToolCalls.length === 0 && toolsToExecute.length > 0 && alreadyExecutedTools.length === 0) {
              logger.warn(LogCategory.API, '[Stream Route] ⚠️ Tous les tool calls étaient des doublons - forçage dernier round SANS tools');
              
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
              
              forcedFinalRound = true;
              // On continue la boucle pour que le LLM réponde
              continue;
            }

            // ✅ Ajouter le message assistant avec TOUS les tool calls (MCP + OpenAPI)
            // Les MCP tools doivent aussi être dans l'historique pour éviter d'être traités comme doublons
            if (allToolsForTimeline.length > 0) {
              currentMessages.push({
                role: 'assistant',
                content: accumulatedContent || '',
                tool_calls: allToolsForTimeline, // ✅ MCP + OpenAPI
                timestamp: new Date().toISOString()
              });
            }

            // ✅ Exécuter les tool calls (uniques uniquement)
            // ⚠️ Les MCP tools x.ai sont déjà exécutés côté serveur, on ajoute juste leur résultat
            if (alreadyExecutedTools.length > 0) {
              logger.info(LogCategory.API, `[Stream Route] ✅ ${alreadyExecutedTools.length} MCP tool(s) déjà exécuté(s) par x.ai - ajout résultats`);
              
              // Ajouter les résultats MCP dans l'historique pour le prochain round
              for (const mcpTool of alreadyExecutedTools) {
                // Extension custom pour MCP tools (result)
                const mcpToolWithResult = mcpTool as ToolCall & { result?: unknown };
                const result = mcpToolWithResult.result || 'Executed by x.ai (MCP)';
                
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: mcpTool.id,
                  name: mcpTool.function.name, // ✅ Required by ToolMessage
                  content: typeof result === 'string' ? result : JSON.stringify(result),
                  timestamp: new Date().toISOString()
                });
                
                // Envoyer dans la timeline UI
                sendSSE({
                  type: 'tool_result',
                  toolCallId: mcpTool.id,
                  toolName: mcpTool.function.name,
                  success: true,
                  result: result,
                  timestamp: Date.now(),
                  isMcp: true // ✅ Flag pour différencier dans l'UI
                });
              }
              
              // ✅ CRITICAL FIX: Si c'était la fin (finishReason === 'stop'), sortir APRÈS avoir envoyé les tool_result
              if (finishReason === 'stop' && uniqueToolCalls.length === 0) {
                logger.info(LogCategory.API, '[Stream Route] ✅ Tool_result MCP envoyés, fin du stream (finishReason=stop)');
                break;
              }
            }
            
            logger.debug(LogCategory.API,`[Stream Route] 🔧 Exécution de ${uniqueToolCalls.length} tool calls OpenAPI (après déduplication)`);
            
            // Envoyer un événement d'exécution de tools (seulement pour ceux à exécuter)
            if (uniqueToolCalls.length > 0) {
              sendSSE({
                type: 'tool_execution',
                toolCount: uniqueToolCalls.length,
                timestamp: Date.now()
              });
            }

            if (!userToken) {
              throw new Error('[Stream Route] Missing user token for OpenAPI tool execution');
            }

            // ✅ Créer l'executor OpenAPI (les tools MCP sont gérés nativement par Groq)
            const { OpenApiToolExecutor } = await import('@/services/llm/executors/OpenApiToolExecutor');
            const { INTERNAL_TOOL_NAMES } = await import('@/services/llm/tools/internalTools');
            const openApiExecutor = new OpenApiToolExecutor('', openApiEndpoints);
            
            // ✅ Exécuter chaque tool call
            for (const toolCall of uniqueToolCalls) {
              checkTimeout(`tool_execution:${toolCall.function.name}`); // Vérifier timeout avant chaque tool
              try {
                logger.debug(LogCategory.API,`[Stream Route] 🔧 Exécution tool: ${toolCall.function.name}`);
                
                // ✅ Internal tools : exécutés localement sans HTTP
                if (INTERNAL_TOOL_NAMES.has(toolCall.function.name)) {
                  let args: Record<string, unknown>;
                  try {
                    args = JSON.parse(toolCall.function.arguments || '{}');
                  } catch {
                    args = { steps: [] };
                    logger.warn(LogCategory.API, '[Stream Route] Invalid JSON in internal tool arguments', {
                      toolName: toolCall.function.name,
                      rawArgs: toolCall.function.arguments?.substring(0, 200),
                    });
                  }

                  let result = 'Plan updated and displayed to user.';
                  let internalToolSuccess = true;

                  if (toolCall.function.name === '__plan_update') {
                    const truncateStepContent = (s: string, max = 60): string =>
                      s.length > max ? `${s.slice(0, max)}…` : s;
                    const steps = args.steps as Array<{ id: string; content: string; status: string }> | undefined;
                    if (Array.isArray(steps) && steps.length > 0) {
                      sendSSE({
                        type: 'plan_update',
                        payload: args,
                        toolCallId: toolCall.id,
                        timestamp: Date.now()
                      });

                      // Build a rich feedback string so the LLM stays anchored in its progress
                      const total = steps.length;
                      const completedCount = steps.filter(s => s.status === 'completed').length;
                      const inProgressStep = steps.find(s => s.status === 'in_progress');
                      const pendingSteps = steps.filter(s => s.status === 'pending');

                      const parts: string[] = [`Plan updated (${completedCount}/${total} done).`];
                      if (inProgressStep) {
                        parts.push(`In progress: "${truncateStepContent(String(inProgressStep.content ?? ''))}".`);
                      }
                      if (pendingSteps.length > 0) {
                        parts.push(
                          `Remaining: ${pendingSteps.map(s => `"${truncateStepContent(String(s.content ?? ''))}"`).join(', ')}.`
                        );
                      }
                      if (completedCount === total) {
                        parts.push('All steps completed — you may now deliver the final response.');
                      } else {
                        parts.push('Continue: mark each step completed before moving to the next.');
                      }
                      result = parts.join(' ');
                    } else {
                      result =
                        'Error: __plan_update requires at least one step. Declare your steps before executing.';
                      internalToolSuccess = false;
                      logger.warn(LogCategory.API, '[Stream Route] __plan_update skipped: empty or invalid steps', {
                        toolCallId: toolCall.id
                      });
                    }
                  }
                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: result,
                    timestamp: new Date().toISOString()
                  });
                  
                  sendSSE({
                    type: 'tool_result',
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    success: internalToolSuccess,
                    result,
                    timestamp: Date.now(),
                    isInternal: true
                  });
                  continue;
                }

                // ✅ Vérifier si c'est un tool OpenAPI (exécuté par nous)
                // Les tools MCP sont exécutés nativement par Groq, on ne les touche pas
                const isOpenApiTool = openApiToolNames.has(toolCall.function.name);
                const isCallableTool = callableToolNames.has(toolCall.function.name);
                
                if (isCallableTool) {
                  // ✅ Tool Callable : Exécuter via CallableToolExecutor
                  logger.debug(LogCategory.API,`[Stream Route] 🔧 Callable tool détecté: ${toolCall.function.name}`);
                  
                  if (!callableMapping) {
                    throw new Error(`Mapping callable manquant pour ${toolCall.function.name}`);
                  }
                  
                  const { CallableToolExecutor } = await import('@/services/llm/executors/CallableToolExecutor');
                  const callableExecutor = new CallableToolExecutor(callableMapping);
                  const result = await callableExecutor.executeToolCall(toolCall, userToken);
                  
                  // ✅ AUDIT DÉTAILLÉ : Logger après exécution
                  logger.debug(LogCategory.API,`[Stream Route] ✅ APRÈS EXÉCUTION CALLABLE:`, {
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
                    content: result.content,
                    timestamp: new Date().toISOString()
                  });

                  // Envoyer dans la timeline UI
                  let parsedResult: unknown;
                  try {
                    parsedResult = JSON.parse(result.content);
                  } catch (parseError) {
                    logger.warn(LogCategory.API, `[Stream Route] ⚠️ Erreur parsing résultat callable, utilisation du contenu brut`, {
                      error: parseError instanceof Error ? parseError.message : String(parseError)
                    });
                    parsedResult = result.content;
                  }
                  
                  sendSSE({
                    type: 'tool_result',
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    success: result.success,
                    result: parsedResult,
                    timestamp: Date.now(),
                    isCallable: true // ✅ Flag pour différencier les callable tools dans l'UI
                  });
                  
                  logger.debug(LogCategory.API,`[Stream Route] ✅ Callable tool ${toolCall.function.name} exécuté et résultat envoyé`);
                  continue;
                }
                
                if (!isOpenApiTool) {
                  // ✅ Tool MCP : Groq l'a déjà exécuté, afficher dans la timeline
                  logger.debug(LogCategory.API,`[Stream Route] 🔧 MCP tool détecté (géré par Groq): ${toolCall.function.name}`);
                  
                  // ✅ Chercher le résultat MCP correspondant
                  let mcpOutput: string | unknown = 'MCP tool executed by Groq';
                  
                  if (currentRoundMcpCalls.length > 0) {
                    const mcpCall = currentRoundMcpCalls.find(call => 
                      toolCall.function.name.includes(call.name) || toolCall.function.name.includes(call.server_label)
                    );
                    if (mcpCall?.output) {
                      mcpOutput = mcpCall.output;
                    }
                  }
                  
                  // ✅ Envoyer l'événement timeline pour affichage
                  sendSSE({
                    type: 'tool_result',
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    success: true,
                    result: typeof mcpOutput === 'string' ? mcpOutput : JSON.stringify(mcpOutput),
                    timestamp: Date.now(),
                    isMcp: true // ✅ Flag pour différencier les MCP tools dans l'UI
                  });
                  
                  logger.debug(LogCategory.API,`[Stream Route] ✅ MCP tool ${toolCall.function.name} affiché dans timeline`);
                  continue;
                }
                
                // ✅ Exécuter le tool OpenAPI
                const result = await openApiExecutor.executeToolCall(toolCall, userToken);

                // ✅ AUDIT DÉTAILLÉ : Logger après exécution
                logger.debug(LogCategory.API,`[Stream Route] ✅ APRÈS EXÉCUTION TOOL:`, {
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

                logger.debug(LogCategory.API,`[Stream Route] ✅ Tool ${toolCall.function.name} exécuté (success: ${result.success})`);

              } catch (toolError) {
                logger.error(LogCategory.API, `[Stream Route] ❌ Erreur tool ${toolCall.function.name}:`, undefined, toolError instanceof Error ? toolError : undefined);
                
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

            // Si ce round n'a exécuté que des internal tools (ex. __plan_update seul),
            // certains modèles s'arrêtent au round suivant avec un contenu vide parce
            // qu'ils interprètent le feedback "Plan updated" comme une fin de tâche.
            // Un message system court les force à enchaîner les vrais tool calls.
            const allToolsWereInternal =
              uniqueToolCalls.length > 0 &&
              uniqueToolCalls.every(tc => INTERNAL_TOOL_NAMES.has(tc.function.name));
            if (allToolsWereInternal) {
              currentMessages.push({
                role: 'system',
                content: 'Plan declared. Now execute the first step: call the required tools.',
                timestamp: new Date().toISOString()
              });
              logger.info(
                LogCategory.API,
                '[Stream Route] 📋 Plan-only round — message system injecté pour forcer l\'exécution des tools',
                { roundCount }
              );
            }

            const hasReachedRoundLimit = roundCount >= maxRounds;

            if (hasReachedRoundLimit) {
              logger.warn(LogCategory.API, `[Stream Route] ⚠️ Limite de ${maxRounds} rounds atteinte, relance finale forcée sans nouveaux tool calls`);
              
              try {
                const finalResponse = await provider.callWithMessages(
                  currentMessages,
                  [],
                  undefined
                );

                // Type guard pour finalResponse
                if (finalResponse && typeof finalResponse === 'object') {
                  const response = finalResponse as { tool_calls?: unknown[]; content?: string; reasoning?: string };
                  
                  if ('tool_calls' in response && response.tool_calls && Array.isArray(response.tool_calls) && response.tool_calls.length > 0) {
                    logger.warn(LogCategory.API, '[Stream Route] ⚠️ Réponse finale forcée contient encore des tool calls, ils seront ignorés', {
                      requestedToolCalls: response.tool_calls.length
                    });
                  }

                  if (response.content) {
                    sendSSE({
                      type: 'delta',
                      content: response.content,
                      reasoning: response.reasoning
                    });

                    sendSSE({
                      type: 'assistant_round_complete',
                      content: response.content,
                      tool_calls: [],
                      finishReason: 'stop',
                      forced: true,
                      timestamp: Date.now()
                    });

                    currentMessages.push({
                      role: 'assistant',
                      content: response.content,
                      timestamp: new Date().toISOString()
                    });
                  } else {
                    logger.error(LogCategory.API, '[Stream Route] ❌ Réponse finale forcée vide, envoi d\'une erreur au client');
                    sendSSE({
                      type: 'error',
                      error: 'Réponse finale indisponible après la limite de tool calls'
                    });
                  }
                } else {
                  logger.error(LogCategory.API, '[Stream Route] ❌ Réponse finale invalide, envoi d\'une erreur au client');
                  sendSSE({
                    type: 'error',
                    error: 'Réponse finale invalide après la limite de tool calls'
                  });
                }
              } catch (finalError) {
                logger.error(LogCategory.API, '[Stream Route] ❌ Erreur lors de la relance finale forcée', undefined, finalError instanceof Error ? finalError : undefined);
                sendSSE({
                  type: 'error',
                  error: 'Erreur lors de la relance finale forcée'
                });
              }

              break;
            }

            // Continuer la boucle pour relancer le LLM avec les résultats
            compressToolResults(currentMessages, TOOL_RESULT_THRESHOLD, INTERNAL_TOOL_NAMES);
            logger.debug(LogCategory.API,`[Stream Route] 🔄 Relance du LLM avec ${currentMessages.length} messages`);
          }

          // Persistance serveur : survit au refresh / navigation / fermeture d'onglet (client peut se déconnecter avant done)
          if (sessionId) {
            const finalAssistant = [...currentMessages]
              .reverse()
              .find((m): m is ChatMessage => m.role === 'assistant');
            const textContent = finalAssistant?.content
              ? extractTextFromContent(finalAssistant.content)
              : '';
            if (textContent.trim()) {
              try {
                const { data: ownedSession } = await supabase
                  .from('chat_sessions')
                  .select('id')
                  .eq('id', sessionId)
                  .eq('user_id', userId)
                  .maybeSingle();

                if (!ownedSession) {
                  logger.warn(LogCategory.API, '[Stream Route] ⚠️ Server persist skipped: session missing or not owned', {
                    sessionId
                  });
                } else {
                  const { historyManager } = await import('@/services/chat/HistoryManager');
                  const reasoning =
                    finalAssistant &&
                    'reasoning' in finalAssistant &&
                    typeof finalAssistant.reasoning === 'string'
                      ? finalAssistant.reasoning
                      : undefined;
                  await historyManager.addMessage(sessionId, {
                    role: 'assistant',
                    content: textContent,
                    ...(reasoning ? { reasoning } : {}),
                    operation_id: serverOperationId
                  });
                }
              } catch (persistErr) {
                logger.error(
                  LogCategory.API,
                  '[Stream Route] ⚠️ Server persist failed (client fallback)',
                  { sessionId },
                  persistErr instanceof Error ? persistErr : undefined
                );
              }
            }
          }

          // Chunk done + fermeture : peuvent échouer si le client a déjà coupé la connexion (persist serveur déjà faite au-dessus)
          try {
            sendSSE({
              type: 'done',
              rounds: roundCount,
              timestamp: Date.now()
            });
          } catch (doneErr) {
            logger.warn(LogCategory.API, '[Stream Route] ⚠️ Chunk done non envoyé (client souvent déconnecté)', {
              sessionId,
              message: doneErr instanceof Error ? doneErr.message : String(doneErr)
            });
          }

          // 🎨 Signaler la fin du streaming au canevas
          if (noteId) {
            try {
              streamBroadcastService.broadcast(noteId, {
                type: 'end'
              });
            } catch (broadcastErr) {
              logger.warn(LogCategory.API, '[Stream Route] ⚠️ broadcast canva end échoué', {
                noteId,
                message: broadcastErr instanceof Error ? broadcastErr.message : String(broadcastErr)
              });
            }
          }

          logger.info(LogCategory.API, '[Stream Route] ✅ Stream terminé avec succès');
          try {
            controller.close();
          } catch {
            /* stream déjà fermé côté client */
          }

        } catch (error) {
          // ✅ Détecter si c'est un timeout
          const isTimeout = error instanceof Error && 'isTimeout' in error && (error as Error & { isTimeout: boolean }).isTimeout;
          const elapsed = error instanceof Error && 'elapsed' in error ? (error as Error & { elapsed: number }).elapsed : undefined;
          const limit = error instanceof Error && 'limit' in error ? (error as Error & { limit: number }).limit : TIMEOUT_MS;
          const context = error instanceof Error && 'context' in error ? (error as Error & { context?: string }).context : undefined;
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          logger.error(LogCategory.API, '[Stream Route] ❌ Erreur stream:', {
            error: errorMessage,
            isTimeout,
            elapsed: elapsed ? `${Math.round(elapsed / 1000)}s` : undefined,
            limit: `${limit / 1000}s`,
            context,
            roundCount,
            sessionId,
            provider: providerType,
            model
          });
          
          // ✅ Envoyer l'erreur au client avec métadonnées enrichies
          const errorChunk = {
            type: 'error',
            error: errorMessage,
            errorCode: isTimeout ? 'timeout' : 'stream_error',
            provider: providerType,
            model,
            roundCount,
            timestamp: Date.now(),
            ...(isTimeout && {
              timeout: {
                elapsed: elapsed ? Math.round(elapsed / 1000) : undefined,
                limit: Math.round(limit / 1000),
                context
              }
            })
          };
          
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
          } catch (enqueueErr) {
            logger.warn(LogCategory.API, '[Stream Route] ⚠️ Error chunk not sent (client likely disconnected)', {
              sessionId,
              message: enqueueErr instanceof Error ? enqueueErr.message : String(enqueueErr)
            });
          }
          try {
            controller.close();
          } catch {
            /* déjà fermé ou stream invalide */
          }
        }
      }
    });

    // Retourner la réponse avec headers SSE
    success = true;
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    const errorType = error instanceof Error && error.message.includes('Validation') 
      ? 'validation_error' 
      : error instanceof Error && error.message.includes('Rate limit')
      ? 'rate_limit_error'
      : 'server_error';
    
    metricsCollector.recordError('chat/llm/stream', errorType, error instanceof Error ? error : new Error(String(error)));
    
    logger.error(LogCategory.API, '[Stream Route] ❌ Erreur globale:', undefined, error instanceof Error ? error : undefined);
    
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
  } finally {
    const latency = Date.now() - startTime;
    metricsCollector.recordLatency('chat/llm/stream', latency, success);
    metricsCollector.recordThroughput('chat/llm/stream');
  }
}

