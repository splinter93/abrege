import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LLMProviderManager } from '@/services/llm/providerManager';
import { DeepSeekProvider, TogetherProvider, GroqProvider } from '@/services/llm/providers';
// Import temporairement désactivé pour résoudre le problème de build Vercel
import { agentApiV2Tools } from '@/services/agentApiV2Tools';

import type { AppContext, ChatMessage } from '@/services/llm/types';
import { simpleLogger as logger } from '@/utils/logger';
import { buildObservation, computeToolCallHash } from '@/services/toolFlowUtils';

// Instance singleton du LLM Manager
const llmManager = new LLMProviderManager();

// Configuration Supabase - Vérification différée pour éviter les erreurs de build
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes');
  }

  return { supabaseUrl, supabaseServiceKey };
};

// Fonction pour créer le client admin
const createSupabaseAdmin = () => {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Fonction pour récupérer un agent
const getAgentById = async (id: string) => {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Erreur lors de la récupération de l\'agent:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Erreur getAgentById:', error);
    return null;
  }
};

// Fonction pour récupérer l'historique des messages d'une session (sécurisée par user_id)
const getSessionHistory = async (sessionId: string, userToken: string, userId: string) => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Récupérer la session avec le thread complet
    const { data: session, error } = await userClient
      .from('chat_sessions')
      .select('thread, history_limit')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('[LLM API] ❌ Erreur récupération session:', error);
      return [];
    }

    if (!session) {
      logger.error('[LLM API] ❌ Session non trouvée:', sessionId);
      return [];
    }

    // Appliquer la limite d'historique
    const historyLimit = session.history_limit || 10;
    const limitedHistory = (session.thread || []).slice(-historyLimit);

    logger.dev('[LLM API] 📚 Historique récupéré:', {
      sessionId,
      totalMessages: session.thread?.length || 0,
      limitedMessages: limitedHistory.length,
      limit: historyLimit
    });

    return limitedHistory;
  } catch (error) {
    logger.error('[LLM API] ❌ Erreur getSessionHistory:', error);
    return [];
  }
};

/**
 * Nettoie et valide les arguments JSON des function calls
 */
const cleanAndParseFunctionArgs = (rawArgs: string): any => {
  try {
    // Si c'est vide ou juste des espaces, retourner un objet vide
    if (!rawArgs || rawArgs.trim() === '' || rawArgs.trim() === '""' || rawArgs.trim() === "''") {
      logger.dev("[LLM API] ✅ Arguments vides détectés, retour objet vide");
      return {};
    }
    
    // Essayer de parser directement
    return JSON.parse(rawArgs);
  } catch (error) {
    logger.dev("[LLM API] ⚠️ Arguments JSON malformés, tentative de nettoyage:", rawArgs);
    
    try {
      // Nettoyer les arguments en supprimant les caractères problématiques
      let cleanedArgs = rawArgs
        .replace(/\n/g, '') // Supprimer les retours à la ligne
        .replace(/\r/g, '') // Supprimer les retours chariot
        .replace(/\t/g, '') // Supprimer les tabulations
        .trim();
      
      // Si c'est vide après nettoyage, retourner un objet vide
      if (!cleanedArgs || cleanedArgs === '""' || cleanedArgs === "''") {
        logger.dev("[LLM API] ✅ Arguments vides après nettoyage, retour objet vide");
        return {};
      }
      
      // Si on a plusieurs objets JSON concaténés, prendre le premier
      if (cleanedArgs.includes('}{')) {
        const firstBrace = cleanedArgs.indexOf('{');
        const lastBrace = cleanedArgs.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanedArgs = cleanedArgs.substring(firstBrace, lastBrace + 1);
        }
      }
      
      // Essayer de parser le JSON nettoyé
      const parsed = JSON.parse(cleanedArgs);
      logger.dev("[LLM API] ✅ Arguments nettoyés avec succès:", parsed);
      return parsed;
      
    } catch (cleanError) {
      logger.error("[LLM API] ❌ Impossible de nettoyer les arguments JSON:", cleanError);
      throw new Error(`Arguments JSON invalides: ${rawArgs}`);
    }
  }
};

/**
 * Helper pour persister un message avec plusieurs tentatives.
 * @param persistFn - La fonction de persistance à exécuter.
 * @param description - Description du message pour les logs.
 */
async function persistWithRetry(persistFn: () => Promise<any>, description: string) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 100; // ms

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const result = await persistFn();
      if (result && !result.success) {
        throw new Error(result.error || `La persistance a échoué mais n'a pas renvoyé d'erreur explicite.`);
      }
      logger.dev(`[LLM API] ✅ ${description} sauvegardé avec succès.`);
      return; // Succès, on sort de la boucle
    } catch (error) {
      logger.error(`[LLM API] ❌ Tentative ${i + 1}/${MAX_RETRIES} échouée pour la sauvegarde de "${description}":`, error);
      if (i === MAX_RETRIES - 1) {
        logger.error(`[LLM API] ❌ Échec final de la sauvegarde de "${description}" après ${MAX_RETRIES} tentatives.`);
        // Ne pas relancer l'erreur pour ne pas bloquer le flux principal, mais on pourrait le faire si la persistance est critique.
      } else {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const MAX_TOOL_DEPTH = 5;
  logger.dev("[LLM API] 🚀 REQUÊTE REÇUE !");
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
      const supabase = createSupabaseAdmin();
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.dev("[LLM API] ❌ Token invalide ou expiré");
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      logger.dev("[LLM API] ✅ Utilisateur authentifié:", userId);
    } else {
      logger.dev("[LLM API] ❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const { message, context, history, provider, channelId: incomingChannelId } = await request.json();
    
    logger.dev("[LLM API] 🚀 Début de la requête");
    logger.dev("[LLM API] 👤 Utilisateur:", userId);
    logger.dev("[LLM API] 📦 Body reçu:", { message, context, provider });

    // 🔧 CORRECTION: Récupérer l'historique depuis la base de données
    let sessionHistory: ChatMessage[] = [];
    if (context?.sessionId) {
      logger.dev("[LLM API] 📚 Récupération historique pour session:", context.sessionId);
      sessionHistory = await getSessionHistory(context.sessionId, userToken, userId);
      logger.dev("[LLM API] ✅ Historique récupéré:", sessionHistory.length, "messages");
      
      // 🔧 CORRECTION: Exclure le dernier message s'il correspond au message actuel
      if (sessionHistory.length > 0) {
        const lastMessage = sessionHistory[sessionHistory.length - 1];
        if (lastMessage.content === message && lastMessage.role === 'user') {
          logger.dev("[LLM API] 🔧 Exclusion du dernier message (déjà dans l'historique):", message);
          sessionHistory = sessionHistory.slice(0, -1);
          logger.dev("[LLM API] ✅ Historique corrigé:", sessionHistory.length, "messages");
        }
      }
    } else {
      logger.dev("[LLM API] ⚠️ Pas de sessionId, utilisation de l'historique fourni");
      sessionHistory = history || [];
    }

    // Récupérer la configuration de l'agent si spécifiée
    let agentConfig: any = null;
    if (context?.agentId) {
      logger.dev("[LLM API] 🔍 Recherche agent avec ID:", context.agentId);
      agentConfig = await getAgentById(context.agentId);
      logger.dev("[LLM API] 🤖 Configuration agent trouvée:", agentConfig?.name);
      if (agentConfig) {
        if (agentConfig.system_instructions) {
          logger.dev("[LLM API] 📝 Instructions système (extrait):", agentConfig.system_instructions.substring(0, 200) + '...');
        }
      } else {
        logger.dev("[LLM API] ⚠️ Agent non trouvé pour l'ID:", context.agentId);
      }
    } else {
      logger.dev("[LLM API] ⚠️ Aucun agentId fourni dans le contexte");
    }

    // Déterminer le provider à utiliser
    let targetProvider = provider;
    
    // PRIORITÉ 1: Agent sélectionné (priorité absolue)
    if (agentConfig && agentConfig.provider) {
      targetProvider = agentConfig.provider;
      logger.dev("[LLM API] 🎯 Agent sélectionné - Forcer provider:", agentConfig.provider, "pour l'agent:", agentConfig.name);
    }
    // PRIORITÉ 2: Provider manuel (menu kebab)
    else if (provider) {
      targetProvider = provider;
      logger.dev("[LLM API] 🔧 Provider manuel sélectionné:", provider);
    }
    // PRIORITÉ 3: Provider par défaut
    else {
      targetProvider = 'synesia';
      logger.dev("[LLM API] ⚙️ Utilisation du provider par défaut:", targetProvider);
    }

    // Changer de provider si nécessaire
    if (targetProvider && targetProvider !== llmManager.getCurrentProviderId()) {
      const success = llmManager.setProvider(targetProvider);
      if (success) {
        logger.dev("[LLM API] 🔄 Provider changé vers:", targetProvider);
      } else {
        logger.warn("[LLM API] ⚠️ Échec du changement de provider, utilisation du fallback");
      }
    }

    // Préparer le contexte par défaut si non fourni
    const appContext: AppContext = context || {
      type: 'chat_session',
      id: 'default',
      name: 'Chat général'
    };

    // Utiliser le provider manager
    const currentProvider = llmManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error('Aucun provider LLM disponible');
    }

    // Minimal logs only
    logger.dev("[LLM API] 🚀 Provider utilisé:", currentProvider.id);

    // Vérifier si c'est DeepSeek pour le streaming
    if (currentProvider.id === 'deepseek') {
      logger.dev("[LLM API] 🚀 Streaming avec DeepSeek");
      
      // Créer un canal unique pour le streaming
      const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Utiliser le provider avec configuration d'agent
      const deepseekProvider = new DeepSeekProvider();
      
      const config = {
        model: agentConfig?.model || deepseekProvider.getDefaultConfig().model,
        temperature: agentConfig?.temperature || deepseekProvider.getDefaultConfig().temperature,
        max_tokens: agentConfig?.max_tokens || deepseekProvider.getDefaultConfig().max_tokens,
        top_p: agentConfig?.top_p || deepseekProvider.getDefaultConfig().top_p,
        system_instructions: agentConfig?.system_instructions || deepseekProvider.getDefaultConfig().system_instructions
      };
      
      // Préparer les messages avec la configuration dynamique
      const systemContent = `Assistant IA spécialisé dans l'aide et la conversation. Contexte: ${appContext.name}`;
      
      const messages = [
        {
          role: 'system' as const,
          content: systemContent
        },
        ...sessionHistory.map((msg: ChatMessage) => {
          const mappedMsg: any = {
            role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
            content: msg.content
          };
          
          // 🔧 CORRECTION: Transmettre les tool_calls pour les messages assistant
          if (msg.role === 'assistant' && (msg as any).tool_calls) {
            mappedMsg.tool_calls = (msg as any).tool_calls;
          }
          
          // 🔧 CORRECTION: Transmettre tool_call_id et name pour les messages tool
          if ((msg as any).role === 'tool') {
            if ((msg as any).tool_call_id) {
              mappedMsg.tool_call_id = (msg as any).tool_call_id;
            }
            if ((msg as any).name) {
              mappedMsg.name = (msg as any).name;
            }
          }
          
          return mappedMsg;
        }),
        {
          role: 'user' as const,
          content: message
        }
      ];

      // Minimal structured log: payload + history snapshot
      try {
        const historySnapshot = messages.map(m => ({ role: m.role, contentLen: (m as any).content?.length || 0, hasTools: !!(m as any).tool_calls }));
        logger.info('[LLM API] payload', { component: 'LLM_API', operation: 'payload' }, { model: config.model, messages: historySnapshot });
      } catch {}
      
      // 🔧 TOOLS: Accès complet à tous les endpoints pour tous les modèles
      const isGptOss = config.model.includes('gpt-oss');
      const isQwen = config.model.includes('Qwen');
      const supportsFunctionCalling = true; // ✅ Tous les modèles supportent les function calls
      
      if (isGptOss) {
        logger.dev("[LLM API] ✅ GPT-OSS détecté - Function calling supporté via Groq");
      } else if (isQwen) {
        logger.dev("[LLM API] ✅ Qwen détecté - Function calling supporté");
      }
      
      // ✅ Attendre l'initialisation asynchrone des tools OpenAPI
      await agentApiV2Tools.waitForInitialization();
      
      // 🔧 ACCÈS COMPLET: GPT/Grok ont accès à TOUS les tools
      const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Tous les tools disponibles // Tous les tools disponibles

      logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
      logger.dev("[LLM API] 🔧 Support function calling:", supportsFunctionCalling);
      logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);

      // Appeler DeepSeek avec streaming et configuration dynamique
      const payload = {
        model: config.model,
        messages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        ...(tools && { tools, tool_choice: 'auto' })
      };

      logger.dev("[LLM API] 📤 Payload complet envoyé à DeepSeek:");
      logger.dev(JSON.stringify(payload, null, 2));
      logger.dev("[LLM API] 📤 Appel DeepSeek avec streaming");

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[LLM API] ❌ Erreur DeepSeek:", errorText);
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }
    }
    // ✅ NOUVEAU: Vérifier si c'est Groq pour le streaming
    else if (currentProvider.id === 'groq') {
      logger.dev("[LLM API] 🚀 Streaming avec Groq");
      
      // Créer un canal unique pour le streaming
      const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Préparer le canal et s'abonner pour s'assurer que les broadcasts partent
      const supabaseInit = createSupabaseAdmin();
      const channelInit = supabaseInit.channel(channelId);
      try {
        await channelInit.subscribe();
      } catch {}
      
      // Utiliser le provider avec configuration d'agent
      const groqProvider = new GroqProvider();
      
      const config = {
        model: agentConfig?.model || groqProvider.config.model,
        temperature: agentConfig?.temperature || groqProvider.config.temperature,
        max_tokens: agentConfig?.max_tokens || groqProvider.config.maxTokens,
        top_p: agentConfig?.top_p || groqProvider.config.topP,
        system_instructions: agentConfig?.system_instructions || 'Assistant IA spécialisé dans l\'aide et la conversation.'
      };
      
      // Préparer les messages avec la configuration dynamique
      const systemContent = `Assistant IA spécialisé dans l'aide et la conversation. Contexte: ${appContext.name}`;
      
      const messages = [
        {
          role: 'system' as const,
          content: systemContent
        },
        ...sessionHistory.map((msg: ChatMessage) => {
          const mappedMsg: any = {
            role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
            content: msg.content
          };
          
          // 🔧 CORRECTION: Transmettre les tool_calls pour les messages assistant
          if (msg.role === 'assistant' && (msg as any).tool_calls) {
            mappedMsg.tool_calls = (msg as any).tool_calls;
          }
          
          // 🔧 CORRECTION: Transmettre tool_call_id et name pour les messages tool
          if ((msg as any).role === 'tool') {
            if ((msg as any).tool_call_id) {
              mappedMsg.tool_call_id = (msg as any).tool_call_id;
            }
            if ((msg as any).name) {
              mappedMsg.name = (msg as any).name;
            }
          }
          
          return mappedMsg;
        }),
        {
          role: 'user' as const,
          content: message
        }
      ];

      // 🔧 TOOLS: Accès complet à tous les endpoints pour tous les modèles
      const isGptOss = config.model.includes('gpt-oss');
      const isQwen = config.model.includes('Qwen');
      const supportsFunctionCalling = true; // ✅ Tous les modèles supportent les function calls
      
      if (isGptOss) {
        logger.dev("[LLM API] ✅ GPT-OSS détecté - Function calling supporté via Groq");
      } else if (isQwen) {
        logger.dev("[LLM API] ✅ Qwen détecté - Function calling supporté");
      }
      
      // ✅ Attendre l'initialisation asynchrone des tools OpenAPI
      await agentApiV2Tools.waitForInitialization();
      
      // 🔧 ACCÈS COMPLET: GPT/Grok ont accès à TOUS les tools
      const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Tous les tools disponibles // Tous les tools disponibles

      logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
      logger.dev("[LLM API] 🔧 Support function calling:", supportsFunctionCalling);
      logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);

      // 🎯 DÉCISION: Utiliser Groq pour GPT-OSS, Together AI pour les autres
      const useGroq = isGptOss;
      const apiUrl = useGroq 
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.together.xyz/v1/chat/completions';
      const apiKey = useGroq 
        ? process.env.GROQ_API_KEY
        : process.env.TOGETHER_API_KEY;
      const providerName = useGroq ? 'Groq' : 'Together AI';

      // Appeler l'API appropriée avec streaming
      const payload = useGroq ? {
        // 🎯 Payload spécifique pour Groq
        model: 'openai/gpt-oss-120b', // ✅ Modèle correct pour Groq
        messages,
        stream: true,
        temperature: config.temperature,
        max_completion_tokens: config.max_tokens, // ✅ Groq utilise max_completion_tokens
        top_p: config.top_p,
        reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium', // ✅ Utiliser la config de l'agent
        ...(tools && { tools, tool_choice: 'auto' })
      } : {
        // 🎯 Payload pour Together AI avec support Qwen 3
        model: config.model,
        messages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        // ✅ NOUVEAU: Support du reasoning pour Qwen 3 selon la documentation Alibaba Cloud
        ...(isQwen && {
          enable_thinking: false, // ❌ DÉSACTIVÉ: Le thinking/reasoning pour Qwen
          result_format: 'message' // ✅ Format de réponse avec reasoning
        }),
        ...(tools && { tools, tool_choice: 'auto' })
      };

      logger.dev(`[LLM API] 📤 Payload complet envoyé à ${providerName}:`);
      logger.dev(JSON.stringify(payload, null, 2));
      logger.dev(`[LLM API] 📤 Appel ${providerName} avec streaming`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[LLM API] ❌ Erreur ${providerName}:`, errorText);
        throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
      }

      // Gestion du streaming avec function calling
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Impossible de lire le stream de réponse');
      }

      let accumulatedContent = '';
      let pendingDataLine = '';
      const toolCallMap: Record<string, { id: string; name: string; arguments: string }> = {};
      const toolCallOrder: string[] = [];
      let legacyFunctionCall: { name: string; arguments: string } | null = null;
      let tokenBuffer = '';
      let bufferSize = 0;
      const BATCH_SIZE = 5; // Envoyer par batch de 5 tokens
      const BATCH_TIMEOUT = 100; // Ou toutes les 100ms

      // Créer le canal pour le broadcast
      const supabase = createSupabaseAdmin();
      const channel = supabase.channel(channelId);
      try { await channel.subscribe(); } catch {}

      // Fonction pour envoyer le buffer de tokens
      const flushTokenBuffer = async () => {
        if (tokenBuffer.length > 0) {
          await channel.send({
            type: 'broadcast',
            event: 'llm-token-batch',
            payload: {
              tokens: tokenBuffer,
              sessionId: context.sessionId
            }
          });
          tokenBuffer = '';
          bufferSize = 0;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const toParse = (pendingDataLine ? pendingDataLine : '') + data;
              let parsed: any;
              try {
                parsed = JSON.parse(toParse);
                pendingDataLine = '';
              } catch (e) {
                // Incomplet: bufferiser et continuer
                pendingDataLine = toParse;
                continue;
              }
              
              logger.dev("[LLM API] 📥 Chunk complet:", JSON.stringify(parsed));
              
              if (parsed.choices?.[0]?.delta) {
                const delta = parsed.choices[0].delta;
                logger.dev("[LLM API] 🔍 Delta trouvé:", JSON.stringify(delta));
                
                // 🔧 SÉCURITÉ: Log détaillé pour debug
                if (delta.function_call || delta.tool_calls || delta.tool_call) {
                  logger.dev("[LLM API] 🔧 Tool call détecté dans delta:", {
                    hasFunctionCall: !!delta.function_call,
                    hasToolCalls: !!delta.tool_calls,
                    hasToolCall: !!delta.tool_call,
                    toolCallsType: delta.tool_calls ? typeof delta.tool_calls : 'undefined',
                    toolCallsIsArray: Array.isArray(delta.tool_calls)
                  });
                }
                
                // ✅ Reasoning GPT-OSS (Groq): reasoning tokens on analysis channel
                if (delta.reasoning && delta.channel === 'analysis') {
                  await channel.send({
                    type: 'broadcast',
                    event: 'llm-reasoning',
                    payload: { reasoning: delta.reasoning, sessionId: context.sessionId }
                  });
                  continue;
                }
                
                // Gestion du function calling (ancien format) → un seul appel
                if (delta.function_call) {
                  if (!legacyFunctionCall) {
                    legacyFunctionCall = { name: delta.function_call.name || '', arguments: delta.function_call.arguments || '' };
                  } else {
                    if (delta.function_call.name) legacyFunctionCall.name = delta.function_call.name;
                    if (delta.function_call.arguments) legacyFunctionCall.arguments += delta.function_call.arguments;
                    }
                    }
                // Gestion du tool calling (nouveau format) → potentiellement plusieurs tool_calls
                else if (delta.tool_calls) {
                  logger.dev("[LLM API] 🔧 Tool calls détectés:", JSON.stringify(delta.tool_calls));
                  for (const toolCall of delta.tool_calls) {
                    const id = toolCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    if (!toolCallMap[id]) {
                      toolCallMap[id] = { id, name: toolCall.function?.name || '', arguments: toolCall.function?.arguments || '' };
                      toolCallOrder.push(id);
                    } else {
                      if (toolCall.function?.name) toolCallMap[id].name = toolCall.function.name;
                      if (toolCall.function?.arguments) toolCallMap[id].arguments += toolCall.function.arguments;
                    }
                  }
                  // Broadcast des tool calls au frontend
                  await channel.send({ type: 'broadcast', event: 'llm-tool-calls', payload: { sessionId: context.sessionId, tool_calls: delta.tool_calls } });
                }
                // Gestion du tool calling (format alternatif)
                else if (delta.tool_call) {
                  logger.dev("[LLM API] 🔧 Tool call détecté (format alternatif):", JSON.stringify(delta.tool_call));
                  const id = delta.tool_call.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  if (!toolCallMap[id]) {
                    toolCallMap[id] = { id, name: delta.tool_call.function?.name || '', arguments: delta.tool_call.function?.arguments || '' };
                    toolCallOrder.push(id);
                  } else {
                    if (delta.tool_call.function?.name) toolCallMap[id].name = delta.tool_call.function.name;
                    if (delta.tool_call.function?.arguments) toolCallMap[id].arguments += delta.tool_call.function.arguments;
                  }
                }
                else if (delta.content) {
                  const token = delta.content
                    ?? delta.message?.content
                    ?? (typeof delta.text === 'string' ? delta.text : undefined)
                    ?? (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
                  if (token) {
                    accumulatedContent += token;
                    tokenBuffer += token;
                    bufferSize++;
                    if (bufferSize >= BATCH_SIZE) {
                      await flushTokenBuffer();
                    }
                  }
                }
              }
            } catch (parseError) {
              logger.dev("[LLM API] ⚠️ Chunk non-JSON ignoré:", data);
            }
          }
        }
      }

              // Envoyer le buffer restant
        await flushTokenBuffer();

        // ✅ Priorité: exécuter les tool_calls (nouveau format) s'ils existent
        if (toolCallOrder.length > 0) {
          logger.dev('[LLM API] 🔍 Tool calls détectés (nouveau format):', { count: toolCallOrder.length });
          const outgoingAssistantToolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
          const toolResultMessages: any[] = [];

          // Helper de persistance robuste (3 tentatives)
          const persistWithRetry = async (msg: any, description: string = 'message') => {
            try {
              const { ChatSessionService } = await import('@/services/chatSessionService');
              const css = ChatSessionService.getInstance();
              let attempt = 0;
              while (attempt < 3) {
                try {
                  const result = await css.addMessageWithToken(context.sessionId, msg, userToken);
                  if (result && result.success === false) {
                    throw new Error(result.error || 'addMessageWithToken returned success=false');
                  }
                  logger.dev('[LLM API] 💾 Persist OK:', { description, role: msg?.role, hasToolCalls: !!msg?.tool_calls, toolCallId: msg?.tool_call_id });
                  return true;
                } catch (e) {
                  attempt++;
                  logger.error('[LLM API] ❌ Persist attempt failed:', { attempt, description, error: e instanceof Error ? e.message : String(e) });
                  if (attempt >= 3) throw e;
                  await new Promise(r => setTimeout(r, 150 * attempt));
                }
              }
            } catch (e) {
              logger.error('[LLM API] ❌ Échec persistance message (tool/tool_calls) après retries:', { description, error: e instanceof Error ? e.message : String(e) });
              return false;
            }
          };

          for (const id of toolCallOrder) {
            const call = toolCallMap[id];
            if (!call?.name) continue;
            const callId = call.id || id;
            outgoingAssistantToolCalls.push({ id: callId, type: 'function', function: { name: call.name, arguments: call.arguments } });
            const args = cleanAndParseFunctionArgs(call.arguments);
            const result = await agentApiV2Tools.executeTool(call.name, args, userToken);
            const isError = !!(result && typeof result === 'object' && result.success === false);
            const contentStr = typeof result === 'string' ? ((): string => { try { JSON.parse(result); return result; } catch { return JSON.stringify(result); } })() : JSON.stringify(result);
            toolResultMessages.push({ role: 'tool' as const, tool_call_id: callId, name: call.name, content: contentStr });
            // 🔧 Broadcast immédiat du résultat (succès/erreur) pour que le frontend affiche et que l'agent voie le feedback
            await channel.send({ type: 'broadcast', event: 'llm-tool-result', payload: { sessionId: context.sessionId, tool_name: call.name, tool_call_id: callId, result: result, success: !isError } });
          }
          // Sauvegarder assistant(tool_calls) dans l'historique (pour que le LLM voie les calls)
          const assistantMessageToPersist = { role: 'assistant', content: null, tool_calls: outgoingAssistantToolCalls, timestamp: new Date().toISOString() };
          await persistWithRetry(assistantMessageToPersist, 'assistant_tool_calls');

          for (const toolMessage of toolResultMessages) {
            await persistWithRetry({ ...toolMessage, timestamp: new Date().toISOString() } as any, `tool_result: ${toolMessage.name}`);
          }
          
          logger.dev('[LLM API] ✅ Messages tool Groq sauvegardés (nouveau format)');

          // Réinjection et relance Groq pour la réponse finale (le modèle voit les erreurs JSON des tools et peut réagir)
          const cleanMessages = messages.filter(msg => !(msg.role === 'user' && 'tool_calls' in (msg as any)));
          const toolAssistantMsg = { role: 'assistant' as const, content: null, tool_calls: outgoingAssistantToolCalls };
          const updatedMessagesBase = [...cleanMessages, toolAssistantMsg, ...toolResultMessages];

          // Flow post-échec: observation -> tentative réparation -> force texte
          const anyFailed = toolResultMessages.some(m => { try { const c = JSON.parse(m.content); return c?.success === false; } catch { return false; } });
          let updatedMessages = updatedMessagesBase;
          if (anyFailed) {
            // 1) Observation assistant
            const firstFailed = toolResultMessages.find(m => { try { const c = JSON.parse(m.content); return c?.success === false; } catch { return false; } });
            const obs = buildObservation(firstFailed?.name || 'unknown_tool', firstFailed?.content || '{}');
            updatedMessages = [...updatedMessagesBase, { role: 'assistant' as const, content: obs.text }];
          }

          const relaunchPayload = {
            model: 'openai/gpt-oss-120b',
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_completion_tokens: config.max_tokens,
            top_p: config.top_p,
            reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium'
          };

          const relaunchResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify(relaunchPayload)
          });

          if (!relaunchResp.ok) {
            const errTxt = await relaunchResp.text();
            logger.error('[LLM API] ❌ Erreur relance Groq (nouveau format):', errTxt);
            throw new Error(`Groq relaunch error: ${relaunchResp.status} - ${errTxt}`);
          }

          const relaunchReader = relaunchResp.body?.getReader();
          if (!relaunchReader) throw new Error('Impossible de lire le stream de relance Groq');
          let finalAccum = '';
          let finalBuf = '';
          let finalSize = 0;
          const flushFinal = async () => { if (finalBuf.length > 0) { await channel.send({ type: 'broadcast', event: 'llm-token-batch', payload: { tokens: finalBuf, sessionId: context.sessionId } }); finalBuf = ''; finalSize = 0; } };
          let doneR = false;
          // Nouvelle détection d'un 2e tool call pendant la relance Groq
          let relaunchToolCallData: { name: string; arguments: string; tool_call_id?: string } | null = null;
          while (!doneR) {
            const { done, value } = await relaunchReader.read();
            if (done) { doneR = true; break; }
            const c = new TextDecoder().decode(value);
            const ls = c.split('\n');
            for (const l of ls) {
              if (!l.startsWith('data: ')) continue;
              const d = l.slice(6);
              if (d === '[DONE]') { doneR = true; break; }
              try {
                const p = JSON.parse(d);
                const del = p.choices?.[0]?.delta;
                // Détection d'un tool_call pendant la relance
                if (del?.tool_calls && Array.isArray(del.tool_calls)) {
                  for (const tc of del.tool_calls) {
                    const nm = tc.function?.name || '';
                    const args = tc.function?.arguments || '';
                    const id = tc.id;
                    if (!relaunchToolCallData) relaunchToolCallData = { name: nm, arguments: args, tool_call_id: id };
                    else {
                      if (nm) relaunchToolCallData.name = nm;
                      if (args) relaunchToolCallData.arguments += args;
                      if (id) relaunchToolCallData.tool_call_id = id;
                    }
                  }
                  // Broadcast pour UI
                  await channel.send({ type: 'broadcast', event: 'llm-tool-calls', payload: { sessionId: context.sessionId, tool_calls: del.tool_calls, tool_name: relaunchToolCallData?.name || 'unknown_tool' } });
                  continue;
                }
                const t = del?.content ?? del?.message?.content ?? (typeof del?.text === 'string' ? del.text : undefined) ?? (typeof (del as any)?.output_text === 'string' ? (del as any).output_text : undefined);
                if (t) { finalAccum += t; finalBuf += t; finalSize++; if (finalSize >= BATCH_SIZE) { await flushFinal(); } }
              } catch {}
            }
          }
          await flushFinal();
          // Si un 2e tool_call a été demandé pendant la relance, l'exécuter puis relancer une dernière fois
          if (relaunchToolCallData && relaunchToolCallData.name) {
            try {
              // Dédup une passe max
              const callHash = computeToolCallHash(relaunchToolCallData.name, relaunchToolCallData.arguments || '{}');
              // marquage simple (mémoire en cours de requête seulement)
              const seen = new Set<string>();
              if (seen.has(callHash)) {
                // Forcer texte si doublon
                const forcedMessages = [...updatedMessages, { role: 'assistant' as const, content: "Je ne peux pas relancer le même outil avec les mêmes arguments. Voici ce que je propose : expliquez ce qui manque ou proposez une alternative." }];
                const payloadNone = { ...relaunchPayload, messages: forcedMessages, tools: undefined, tool_choice: 'none' as const };
                const finalRespForced = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify(payloadNone) });
                const txt = await finalRespForced.text();
                await channel.send({ type:'broadcast', event:'llm-token-batch', payload:{ tokens: txt, sessionId: context.sessionId } });
                await channel.send({ type:'broadcast', event:'llm-complete', payload:{ sessionId: context.sessionId, fullResponse: txt } });
                return NextResponse.json({ success: true, completed: true, response: txt });
              }
              seen.add(callHash);
              const toolCallId2 = relaunchToolCallData.tool_call_id || `call_${Date.now()}_2`;
              const toolMessage2 = { role: 'assistant' as const, content: null, tool_calls: [{ id: toolCallId2, type: 'function' as const, function: { name: relaunchToolCallData.name, arguments: relaunchToolCallData.arguments } }] };
              const toolResultMessage2: any = { role: 'tool' as const, tool_call_id: toolCallId2, name: relaunchToolCallData.name, content: '' };
              const functionArgs2 = cleanAndParseFunctionArgs(relaunchToolCallData.arguments);
              const result2 = await agentApiV2Tools.executeTool(relaunchToolCallData.name, functionArgs2, userToken);
              // Sécuriser le content string
              let content2 = '';
              if (typeof result2 === 'string') { try { JSON.parse(result2); content2 = result2; } catch { content2 = JSON.stringify(result2); } }
              else { content2 = JSON.stringify(result2); }
              toolResultMessage2.content = content2;
              // Persister tool_calls + result
              const { ChatSessionService } = await import('@/services/chatSessionService');
              const css = ChatSessionService.getInstance();
              const persist = async (msg: any, desc: string) => { try { const r = await css.addMessageWithToken(context.sessionId, msg, userToken); if (r && r.success === false) throw new Error(r.error); } catch (e) { logger.error('[LLM API] ❌ Persist relaunch tool failed:', { desc, err: e instanceof Error ? e.message : String(e) }); } };
              await persist(toolMessage2, 'assistant tool_calls (relaunch)');
              await persist(toolResultMessage2, `tool result ${relaunchToolCallData.name} (relaunch)`);
              // Relancer une dernière fois avec historique mis à jour
              const updatedMessages2 = [...updatedMessages, toolMessage2, toolResultMessage2];
              // Si pas de texte ou échec, forcer texte
              const finalPayload2 = {
                model: 'openai/gpt-oss-120b',
                messages: updatedMessages2,
                stream: true,
                temperature: config.temperature,
                max_completion_tokens: config.max_tokens,
                top_p: config.top_p,
                reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium'
              };
              const finalResp2 = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify(finalPayload2) });
              if (!finalResp2.ok) { const et = await finalResp2.text(); throw new Error(`Groq relaunch2 error: ${finalResp2.status} - ${et}`); }
              const rr = finalResp2.body?.getReader(); if (!rr) throw new Error('Impossible de lire le stream de relance Groq (2)');
              let acc2 = ''; let buf2=''; let size2=0; const flush2 = async ()=>{ if (buf2.length>0){ await channel.send({ type:'broadcast', event:'llm-token-batch', payload:{ tokens: buf2, sessionId: context.sessionId } }); buf2=''; size2=0; } };
              let done2=false; while(!done2){ const {done, value}= await rr.read(); if (done){done2=true; break;} const ch = new TextDecoder().decode(value); const lines= ch.split('\n'); for(const line of lines){ if(!line.startsWith('data: ')) continue; const dd = line.slice(6); if (dd==='[DONE]'){done2=true; break;} try { const pp = JSON.parse(dd); const dl = pp.choices?.[0]?.delta; const tok = dl?.content ?? dl?.message?.content ?? (typeof dl?.text==='string'? dl.text: undefined) ?? (typeof (dl as any)?.output_text==='string' ? (dl as any).output_text : undefined); if (tok){ acc2+=tok; buf2+=tok; size2++; if(size2>=BATCH_SIZE){ await flush2(); } } } catch{} } }
              await flush2();
              const safe2 = (acc2 || '').trim();
              await channel.send({ type:'broadcast', event:'llm-complete', payload:{ sessionId: context.sessionId, fullResponse: safe2 } });
              if (safe2) {
                try { const css2 = ChatSessionService.getInstance(); await css2.addMessageWithToken(context.sessionId, { role:'assistant', content: safe2, timestamp: new Date().toISOString() } as any, userToken); } catch {}
              }
              return NextResponse.json({ success: true, completed: true, response: safe2 });
            } catch (err) {
              logger.error(`❌ Error while chaining tool call: ${err instanceof Error ? err.message : String(err)}`);
              await channel.send({ type:'broadcast', event:'llm-complete', payload:{ sessionId: context.sessionId, fullResponse: '' } });
              return NextResponse.json({ success: true, completed: true, response: '', error: true });
            }
          }
          // ✅ Aucun 2e tool_call: terminer proprement en émettant llm-complete et persister la réponse
          const safeFinal = (finalAccum || '').trim();
          await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId: context.sessionId, fullResponse: safeFinal } });
          if (safeFinal) {
            try {
              const { ChatSessionService } = await import('@/services/chatSessionService');
              const css2 = ChatSessionService.getInstance();
              await css2.addMessageWithToken(context.sessionId, { role: 'assistant', content: safeFinal, timestamp: new Date().toISOString() } as any, userToken);
            } catch {}
          }
          return NextResponse.json({ success: true, completed: true, response: safeFinal });
        }

        // Si une fonction a été appelée, l'exécuter
        logger.dev("[LLM API] 🔍 Function call détectée:", legacyFunctionCall);
        logger.dev("[LLM API] 🔍 Function call name:", legacyFunctionCall?.name);
        logger.dev("[LLM API] 🔍 Function call args:", legacyFunctionCall?.arguments);
        
        // 🔧 SÉCURITÉ: Vérifier que legacyFunctionCall est valide
        if (!legacyFunctionCall || !legacyFunctionCall.name) {
          logger.dev("[LLM API] ❌ PAS DE FUNCTION CALL - Réponse normale");
          // Réponse normale sans function calling
          // Broadcast de completion
          await channel.send({
            type: 'broadcast',
            event: 'llm-complete',
            payload: {
              sessionId: context.sessionId,
              fullResponse: accumulatedContent
            }
          });
          
          // 🔧 CORRECTION: Retourner du JSON pur pour éviter l'erreur parsing
          return NextResponse.json({ 
            success: true, 
            completed: true,
            response: accumulatedContent 
          });
        }
        
        // 🔧 ANTI-BOUCLE: Limiter à une seule exécution de fonction par requête
        if (legacyFunctionCall && legacyFunctionCall.name) {
        logger.dev("[LLM API] 🚀 Exécution tool:", legacyFunctionCall.name);
        try {
          // 🔧 NOUVEAU: Nettoyer et valider les arguments JSON
          const functionArgs = cleanAndParseFunctionArgs(legacyFunctionCall.arguments);
          
          // Timeout de 15 secondes pour les tool calls
          const toolCallPromise = agentApiV2Tools.executeTool(
            legacyFunctionCall.name, 
            functionArgs, 
            userToken
          );
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout tool call (15s)')), 15000);
          });
          
          const result = await Promise.race([toolCallPromise, timeoutPromise]);

          logger.dev("[LLM API] ✅ Tool exécuté:", result);

          // ✅ CORRECTION: Vérifier si le tool a échoué
          const safeResult = result || { success: true, message: "Tool exécuté avec succès" };
          
          // Si le tool a échoué, informer le modèle
          if (safeResult.success === false) {
            logger.dev("[LLM API] ⚠️ Tool a échoué:", safeResult.error);
          }
          
          // 🔧 NOUVEAU: ID stable du tool call (utilisé pour broadcast, DB et réinjection)
          const toolCallId = `call_${Date.now()}`;

          // 🔧 NOUVEAU: Broadcast du résultat du tool call au frontend
          await channel.send({
            type: 'broadcast',
            event: 'llm-tool-result',
            payload: {
              sessionId: context.sessionId,
              tool_name: legacyFunctionCall.name,
              tool_call_id: toolCallId,
              result: safeResult,
              success: safeResult.success !== false
            }
          });
          
          // 🔧 CORRECTION: Injecter le message tool et relancer le LLM
          logger.dev("[LLM API] 🔧 Injection du message tool et relance LLM");

          // 1. Créer le message assistant avec le bon format (structure minimale qui DÉBLOQUE tout)
          const toolMessage = {
            role: 'assistant' as const,
            content: null, // 🔧 SÉCURITÉ: jamais "undefined"
            tool_calls: [{ // 🔧 SÉCURITÉ: Array [{...}], pas nombre
              id: toolCallId, // 🔧 CORRECTION: ID réel du tool call
              type: 'function',
              function: {
                name: legacyFunctionCall.name || 'unknown_tool', // 🔧 SÉCURITÉ: fallback
                arguments: legacyFunctionCall.arguments
              }
            }]
          };
          
          // 🔧 SÉCURITÉ: Valider le message assistant
          logger.dev("[LLM API] 🔧 Message assistant créé:", {
            content: toolMessage.content,
            tool_calls_length: toolMessage.tool_calls.length,
            tool_call_id: toolMessage.tool_calls[0].id,
            tool_call_name: toolMessage.tool_calls[0].function.name,
            tool_call_type: toolMessage.tool_calls[0].type
          });
          
          // 🔧 SÉCURITÉ: Validation stricte du format
          if (toolMessage.content !== null) {
            logger.error("[LLM API] ❌ Assistant content doit être null, pas:", toolMessage.content);
            throw new Error('Assistant content doit être null');
          }
          
          if (!Array.isArray(toolMessage.tool_calls) || toolMessage.tool_calls.length !== 1) {
            logger.error("[LLM API] ❌ Assistant tool_calls doit être un array avec 1 élément, pas:", toolMessage.tool_calls);
            throw new Error('Assistant tool_calls doit être un array avec 1 élément');
          }
          
          if (!toolMessage.tool_calls[0].function?.name) {
            logger.error("[LLM API] ❌ Assistant tool_call function name manquant");
            throw new Error('Assistant tool_call function name manquant');
          }

          // 🔧 SÉCURITÉ: Éviter le double-échappement et vérifier la taille
          let toolContent: string;
          if (typeof safeResult === 'string') {
            // Si c'est déjà une string, vérifier si c'est du JSON valide
            try {
              JSON.parse(safeResult); // Test si c'est du JSON valide
              toolContent = safeResult; // Utiliser directement si c'est du JSON
            } catch {
              toolContent = JSON.stringify(safeResult); // Échapper si ce n'est pas du JSON
            }
          } else {
            toolContent = JSON.stringify(safeResult);
          }

          // 🔧 SÉCURITÉ: Vérifier la taille du content (limite à 8KB)
          const maxContentSize = 8 * 1024; // 8KB
          if (toolContent.length > maxContentSize) {
            logger.dev(`[LLM API] ⚠️ Content trop long (${toolContent.length} chars), tronquer`);
            toolContent = JSON.stringify({
              success: safeResult.success,
              message: "Résultat tronqué - données trop volumineuses",
              truncated: true,
              original_size: toolContent.length
            });
          }

          // 2. Créer le message tool avec le bon format (structure minimale qui DÉBLOQUE tout)
          const toolResultMessage = {
            role: 'tool' as const,
            tool_call_id: toolCallId, // 🔧 SÉCURITÉ: même ID
            name: legacyFunctionCall.name || 'unknown_tool', // 🔧 SÉCURITÉ: même nom (fallback)
            content: toolContent // 🔧 SÉCURITÉ: JSON string
          };

          if (toolResultMessage.name !== toolMessage.tool_calls[0].function.name) {
            logger.error("[LLM API] ❌ Tool name doit correspondre au nom de l'appel");
            throw new Error('Tool name doit correspondre au nom de l\'appel');
          }
          
          if (typeof toolResultMessage.content !== 'string') {
            logger.error("[LLM API] ❌ Tool content doit être une string, pas:", typeof toolResultMessage.content);
            throw new Error('Tool content doit être une string');
          }

          // 2. Nettoyer l'historique et ajouter les tool calls (pas de tool_calls dans les messages user)
          const cleanMessages = messages.filter(msg => {
            // Garder tous les messages sauf les tool_calls dans les messages user
            if (msg.role === 'user' && 'tool_calls' in msg) {
              logger.dev("[LLM API] 🔧 Suppression tool_calls du message user");
              return false;
            }
            return true;
          });
          
          const updatedMessages = [
            ...cleanMessages,
            toolMessage,
            toolResultMessage
          ];

          // 🔧 NOUVEAU: Sauvegarder les messages tool dans la base de données (NOUVEAU FORMAT)
          const { ChatSessionService } = await import('@/services/chatSessionService');
          const css = ChatSessionService.getInstance();
          
          // 🔧 Persister le message de l'assistant contenant les tool calls
          await persistWithRetry(
            () => css.addMessageWithToken(context.sessionId, {
              role: 'assistant',
              content: null,
              tool_calls: [{ id: toolCallId, type: 'function', function: { name: legacyFunctionCall.name, arguments: legacyFunctionCall.arguments } }],
              timestamp: new Date().toISOString()
            }, userToken),
            "Message assistant avec tool_calls"
          );

          // Persister le résultat du tool call
          await persistWithRetry(
            () => css.addMessageWithToken(context.sessionId, {
              role: 'tool',
              tool_call_id: toolCallId,
              name: legacyFunctionCall.name,
              content: toolResultMessage.content,
              timestamp: new Date().toISOString()
            }, userToken),
            `Résultat du tool ${legacyFunctionCall.name}`
          );
          
          logger.dev("[LLM API] ✅ Cycle de persistance des tools terminé.");

          // 3. Relancer le LLM avec l'historique complet (SANS tools)
          const finalPayload = useGroq ? {
            // 🎯 Payload spécifique pour Groq (relance)
            model: 'openai/gpt-oss-120b',
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_completion_tokens: config.max_tokens,
            top_p: config.top_p,
            reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium'
          } : {
            // 🎯 Payload pour Together AI (relance)
            model: config.model,
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            ...(tools && { tools, tool_choice: 'auto' })
          };

          logger.dev("[LLM API] 🔄 Relance LLM avec payload SANS tools:", JSON.stringify(finalPayload, null, 2));
          logger.dev("[LLM API] 📝 Messages injectés:", updatedMessages.map(m => ({ 
            role: m.role, 
            content: m.content?.substring(0, 100),
            tool_calls: 'tool_calls' in m ? m.tool_calls?.length : undefined,
            tool_call_id: 'tool_call_id' in m ? m.tool_call_id : undefined
          })));

          // ✅ CORRECTION: Utiliser le même provider que l'appel initial
          const finalResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(finalPayload)
          });

          if (!finalResponse.ok) {
            const errorText = await finalResponse.text();
            logger.error("[LLM API] ❌ Erreur relance Together AI:", errorText);
            throw new Error(`Together AI relance error: ${finalResponse.status} - ${errorText}`);
          }

          logger.dev("[LLM API] 🔄 LLM relancé avec historique complet SANS tools");

          // 4. Streamer la vraie réponse du LLM
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                const reader = finalResponse.body?.getReader();
                if (!reader) {
                  throw new Error('Impossible de lire le stream de réponse finale');
                }

                let accumulatedContent = '';
                let isComplete = false;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = new TextDecoder().decode(value);
                  const lines = chunk.split('\n');

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const data = line.slice(6);
                      if (data === '[DONE]') {
                        isComplete = true;
                        break;
                      }

                      try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta;
                        
                        if (delta?.content) {
                          const token = delta.content;
                          accumulatedContent += token;
                          
                          // Broadcast du token
                          await channel.send({
                            type: 'broadcast',
                            event: 'llm-token',
                            payload: {
                              token,
                              sessionId: context.sessionId
                            }
                          });

                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                        }
                      } catch (parseError) {
                        logger.dev("[LLM API] ⚠️ Chunk non-JSON ignoré:", data);
                      }
                    }
                  }

                  if (isComplete) break;
                }

                // Broadcast de completion avec le contenu accumulé
                await channel.send({
                  type: 'broadcast',
                  event: 'llm-complete',
                  payload: {
                    sessionId: context.sessionId,
                    fullResponse: accumulatedContent
                  }
                });

                logger.dev("[LLM API] ✅ Streaming terminé, contenu accumulé:", accumulatedContent.substring(0, 100) + "...");

                controller.close();
              } catch (error) {
                logger.error("[LLM API] ❌ Erreur streaming réponse finale:", error);
                controller.error(error);
              }
            }
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          logger.error("[LLM API] ❌ Erreur exécution fonction:", error);
          
          // 🔧 AMÉLIORATION: Créer un résultat d'erreur structuré
          const errorResult = {
            success: false,
            error: true,
            message: `❌ ÉCHEC : ${errorMessage}`,
            tool_name: legacyFunctionCall?.name,
            tool_args: legacyFunctionCall?.arguments,
            timestamp: new Date().toISOString()
          };
          
          logger.dev("[LLM API] 🔧 Injection de l'erreur tool dans l'historique avec feedback structuré");

          // 1. Créer le message tool avec l'erreur
          const toolCallId = `call_${Date.now()}`; // 🔧 Générer un ID de tool call
          const toolMessage = {
            role: 'assistant' as const,
            content: null,
            tool_calls: [{
              id: toolCallId,
              type: 'function',
              function: {
                name: legacyFunctionCall.name,
                arguments: legacyFunctionCall.arguments
              }
            }]
          };

          // 🔧 SÉCURITÉ: Standardiser le format d'erreur
          const errorContent = JSON.stringify({
            success: false,
            error: errorMessage,
            message: `❌ ÉCHEC : ${errorMessage}` // Message humain pour le modèle
          });

          const toolResultMessage = {
            role: 'tool' as const,
            tool_call_id: toolCallId,
            name: legacyFunctionCall.name || 'unknown_tool', // 🔧 SÉCURITÉ: fallback
            content: errorContent
          };
          
          // 2. Nettoyer l'historique et ajouter les tool calls (pas de tool_calls dans les messages user)
          const cleanMessages = messages.filter(msg => {
            // Garder tous les messages sauf les tool_calls dans les messages user
            if (msg.role === 'user' && 'tool_calls' in msg) {
              logger.dev("[LLM API] 🔧 Suppression tool_calls du message user");
              return false;
            }
            return true;
          });
          
          const updatedMessages = [
            ...cleanMessages,
            toolMessage,
            toolResultMessage
          ];

          // 🔧 NOUVEAU: Sauvegarder les messages tool dans la base de données (NOUVEAU FORMAT)
          const { ChatSessionService } = await import('@/services/chatSessionService');
          const css = ChatSessionService.getInstance();
          
          // 🔧 Persister le message de l'assistant contenant les tool calls
          await persistWithRetry(
            () => css.addMessageWithToken(context.sessionId, {
              role: 'assistant',
              content: null,
              tool_calls: [{ id: toolCallId, type: 'function', function: { name: legacyFunctionCall.name, arguments: legacyFunctionCall.arguments } }],
              timestamp: new Date().toISOString()
            }, userToken),
            "Message assistant avec tool_calls"
          );

          // Persister le résultat du tool call
          await persistWithRetry(
            () => css.addMessageWithToken(context.sessionId, {
              role: 'tool',
              tool_call_id: toolCallId,
              name: legacyFunctionCall.name,
              content: toolResultMessage.content,
              timestamp: new Date().toISOString()
            }, userToken),
            `Résultat du tool ${legacyFunctionCall.name}`
          );
          
          logger.dev("[LLM API] ✅ Cycle de persistance des tools terminé.");

          // 3. Relancer le LLM avec l'historique complet (SANS tools)
          const finalPayload = useGroq ? {
            // 🎯 Payload spécifique pour Groq (relance)
            model: 'openai/gpt-oss-120b',
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_completion_tokens: config.max_tokens,
            top_p: config.top_p,
            reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium'
          } : {
            // 🎯 Payload pour Together AI (relance)
            model: config.model,
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            ...(tools && { tools, tool_choice: 'auto' })
          };

          logger.dev("[LLM API] 🔄 Relance LLM avec erreur tool");

          // ✅ CORRECTION: Utiliser le même provider que l'appel initial
          const finalResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(finalPayload)
          });

          if (!finalResponse.ok) {
            const errorText = await finalResponse.text();
            logger.error("[LLM API] ❌ Erreur relance Together AI:", errorText);
            throw new Error(`Together AI relance error: ${finalResponse.status} - ${errorText}`);
          }

          logger.dev("[LLM API] 🔄 LLM relancé avec erreur tool");

          // 4. Streamer la réponse du LLM avec l'erreur
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                const reader = finalResponse.body?.getReader();
                if (!reader) {
                  throw new Error('Impossible de lire le stream de réponse finale');
                }

                let accumulatedContent = '';
                let isComplete = false;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = new TextDecoder().decode(value);
                  const lines = chunk.split('\n');

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const data = line.slice(6);
                      if (data === '[DONE]') {
                        isComplete = true;
                        break;
                      }

                      try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta;
                        
                        if (delta?.content) {
                          const token = delta.content;
                          accumulatedContent += token;
                          
                          // Broadcast du token
                          await channel.send({
                            type: 'broadcast',
                            event: 'llm-token',
                            payload: {
                              token,
                              sessionId: context.sessionId
                            }
                          });

                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                        }
                      } catch (parseError) {
                        logger.dev("[LLM API] ⚠️ Chunk non-JSON ignoré:", data);
                      }
                    }
                  }

                  if (isComplete) break;
                }

                // Broadcast de completion avec le contenu accumulé
                await channel.send({
                  type: 'broadcast',
                  event: 'llm-complete',
                  payload: {
                    sessionId: context.sessionId,
                    fullResponse: accumulatedContent
                  }
                });

                logger.dev("[LLM API] ✅ Streaming terminé avec erreur tool, contenu accumulé:", accumulatedContent.substring(0, 100) + "...");

                controller.close();
              } catch (streamError) {
                logger.error("[LLM API] ❌ Erreur streaming réponse finale:", streamError);
                controller.error(streamError);
              }
            }
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
      } else {
        logger.dev("[LLM API] ❌ PAS DE FUNCTION CALL - Réponse normale");
        // Réponse normale sans function calling
        // Broadcast de completion
        await channel.send({
          type: 'broadcast',
          event: 'llm-complete',
          payload: {
            sessionId: context.sessionId,
            fullResponse: accumulatedContent
          }
        });
        
        // 🔧 CORRECTION: Retourner du JSON pur pour éviter l'erreur parsing
        return NextResponse.json({ 
          success: true, 
          completed: true,
          response: accumulatedContent 
        });
      }

    } else {
      // Pour les autres providers (Synesia, Together AI, etc.)
      if (currentProvider.id === 'together') {
        logger.dev("[LLM API] 🚀 Streaming avec Together AI");
        
        // Créer un canal unique pour le streaming
        const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Utiliser le provider avec configuration d'agent
        const togetherProvider = new TogetherProvider();
        
        const config = togetherProvider['mergeConfigWithAgent'](agentConfig || undefined);
        
        // Préparer les messages avec la configuration dynamique
        const systemContent = togetherProvider['formatContext'](appContext, config);
        
        const messages = [
          {
            role: 'system' as const,
            content: systemContent
          },
          ...sessionHistory.map((msg: ChatMessage) => {
          const mappedMsg: any = {
            role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
            content: msg.content
          };
          
          // 🔧 CORRECTION: Transmettre les tool_calls pour les messages assistant
          if (msg.role === 'assistant' && (msg as any).tool_calls) {
            mappedMsg.tool_calls = (msg as any).tool_calls;
          }
          
          // 🔧 CORRECTION: Transmettre tool_call_id et name pour les messages tool
          if ((msg as any).role === 'tool') {
            if ((msg as any).tool_call_id) {
              mappedMsg.tool_call_id = (msg as any).tool_call_id;
            }
            if ((msg as any).name) {
              mappedMsg.name = (msg as any).name;
            }
          }
          
          return mappedMsg;
        }),
          {
            role: 'user' as const,
            content: message
          }
        ];

        // 🔧 TOOLS: Accès complet à tous les endpoints pour tous les modèles
        const isGptOss = config.model.includes('gpt-oss');
        const isQwen = config.model.includes('Qwen');
        const supportsFunctionCalling = true; // ✅ Tous les modèles supportent les function calls
        
        if (isGptOss) {
          logger.dev("[LLM API] ✅ GPT-OSS détecté - Function calling supporté via Groq");
        } else if (isQwen) {
          logger.dev("[LLM API] ✅ Qwen détecté - Function calling supporté");
        }
        
        // ✅ Attendre l'initialisation asynchrone des tools OpenAPI
        await agentApiV2Tools.waitForInitialization();
        
        // 🔧 ACCÈS COMPLET: GPT/Grok ont accès à TOUS les tools
        const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Tous les tools disponibles // Tous les tools disponibles

        logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
        logger.dev("[LLM API] 🔧 Support function calling:", supportsFunctionCalling);
        logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);

        // 🎯 DÉCISION: Utiliser Groq pour GPT-OSS, Together AI pour les autres
        const useGroq = isGptOss;
        const apiUrl = useGroq 
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.together.xyz/v1/chat/completions';
        const apiKey = useGroq 
          ? process.env.GROQ_API_KEY
          : process.env.TOGETHER_API_KEY;
        const providerName = useGroq ? 'Groq' : 'Together AI';

        // Appeler l'API appropriée avec streaming
        const payload = useGroq ? {
          // 🎯 Payload spécifique pour Groq
          model: 'openai/gpt-oss-120b', // ✅ Modèle correct pour Groq
          messages,
          stream: true,
          temperature: config.temperature,
          max_completion_tokens: config.max_tokens, // ✅ Groq utilise max_completion_tokens
          top_p: config.top_p,
          reasoning_effort: 'medium', // ✅ Activer le reasoning pour Groq
          ...(tools && { tools, tool_choice: 'auto' })
        } : {
          // 🎯 Payload pour Together AI avec support Qwen 3
          model: config.model,
          messages,
          stream: true,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          top_p: config.top_p,
          // ✅ NOUVEAU: Support du reasoning pour Qwen 3 selon la documentation Alibaba Cloud
          ...(isQwen && {
            enable_thinking: false, // ❌ DÉSACTIVÉ: Le thinking/reasoning pour Qwen
            result_format: 'message' // ✅ Format de réponse avec reasoning
          }),
          ...(tools && { tools, tool_choice: 'auto' })
        };

        logger.dev(`[LLM API] 📤 Payload complet envoyé à ${providerName}:`);
        logger.dev(JSON.stringify(payload, null, 2));
        logger.dev(`[LLM API] 📤 Appel ${providerName} avec streaming`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[LLM API] ❌ Erreur ${providerName}:`, errorText);
          throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
        }

        // Gestion du streaming
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Impossible de lire le stream de réponse');
        }

        let accumulatedContent = '';
        let functionCallData: any = null;
        let tokenBuffer = '';
        let bufferSize = 0;
        const BATCH_SIZE = 5; // Envoyer par batch de 5 tokens

        // Créer le canal pour le broadcast
        const supabase = createSupabaseAdmin();
        const channel = supabase.channel(channelId);
        try { await channel.subscribe(); } catch {}

        // Fonction pour envoyer le buffer de tokens
        const flushTokenBuffer = async () => {
          if (tokenBuffer.length > 0) {
            await channel.send({
              type: 'broadcast',
              event: 'llm-token-batch',
              payload: {
                tokens: tokenBuffer,
                sessionId: context.sessionId
              }
            });
            tokenBuffer = '';
            bufferSize = 0;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                
                logger.dev("[LLM API] 📥 Chunk Together AI:", JSON.stringify(parsed));
                
                if (delta) {
                  logger.dev("[LLM API] 🔍 Delta Together AI trouvé:", JSON.stringify(delta));
                  
                  // Gestion du function calling (ancien format)
                  if (delta.function_call) {
                    if (!functionCallData) {
                      functionCallData = {
                        name: delta.function_call.name || '',
                        arguments: delta.function_call.arguments || ''
                      };
                    } else {
                      if (delta.function_call.name) {
                        functionCallData.name = delta.function_call.name;
                      }
                      if (delta.function_call.arguments) {
                        functionCallData.arguments += delta.function_call.arguments;
                      }
                    }
                  }
                  
                  // Gestion du tool calling (nouveau format)
                  if (delta.tool_calls) {
                    logger.dev("[LLM API] 🔧 Tool calls Together AI détectés:", JSON.stringify(delta.tool_calls));
                    
                    for (const toolCall of delta.tool_calls) {
                      if (!functionCallData) {
                        functionCallData = {
                          name: toolCall.function?.name || '',
                          arguments: toolCall.function?.arguments || '',
                          tool_call_id: toolCall.id // 🔧 NOUVEAU: Stocker l'ID du tool call
                        };
                      } else {
                        if (toolCall.function?.name) {
                          functionCallData.name = toolCall.function.name;
                        }
                        if (toolCall.function?.arguments) {
                          functionCallData.arguments += toolCall.function.arguments;
                        }
                        // 🔧 NOUVEAU: Garder l'ID du tool call
                        if (toolCall.id) {
                          functionCallData.tool_call_id = toolCall.id;
                        }
                      }
                    }
                    
                    // 🔧 NOUVEAU: Broadcast des tool calls au frontend
                    await channel.send({
                      type: 'broadcast',
                      event: 'llm-tool-calls',
                      payload: {
                        sessionId: context.sessionId,
                        tool_calls: delta.tool_calls,
                        tool_name: functionCallData?.name || 'unknown_tool'
                      }
                    });
                  }
                  
                  // ✅ NOUVEAU: Gestion du reasoning pour Qwen 3 selon la documentation Alibaba Cloud
                  if (delta.reasoning_content && isQwen) {
                    logger.dev("[LLM API] 🧠 Reasoning Qwen détecté:", delta.reasoning_content);
                    
                    // Broadcast du reasoning en temps réel
                    await channel.send({
                      type: 'broadcast',
                      event: 'llm-reasoning',
                      payload: {
                        reasoning: delta.reasoning_content,
                        sessionId: context.sessionId
                      }
                    });
                  }
                  
                  // ✅ NOUVEAU: Gestion du reasoning pour Groq GPT-OSS
                  if (delta.reasoning_content && useGroq) {
                    logger.dev("[LLM API] 🧠 Reasoning Groq détecté:", delta.reasoning_content);
                    
                    // Broadcast du reasoning en temps réel
                    await channel.send({
                      type: 'broadcast',
                      event: 'llm-reasoning',
                      payload: {
                        reasoning: delta.reasoning_content,
                        sessionId: context.sessionId
                      }
                    });
                  }
                  
                  // ✅ CORRECTION: Traitement du contenu normal (peut coexister avec reasoning)
                  if (delta.content) {
                    const token = delta.content
                      ?? delta.message?.content
                      ?? (typeof delta.text === 'string' ? delta.text : undefined)
                      ?? (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
                    if (token) {
                    accumulatedContent += token;
                    tokenBuffer += token;
                    bufferSize++;
                    if (bufferSize >= BATCH_SIZE) {
                        await flushTokenBuffer();
                      }
                    }
                  }
                }
              } catch (parseError) {
                logger.dev("[LLM API] ⚠️ Chunk non-JSON ignoré:", data);
              }
            }
          }
        }

        // Envoyer le buffer restant
        await flushTokenBuffer();

        // Si une fonction a été appelée, l'exécuter
        logger.dev("[LLM API] 🔍 Function call Together AI détectée:", functionCallData);
        
        // 🔧 ANTI-BOUCLE: Limiter à une seule exécution de fonction par requête
        if (functionCallData && functionCallData.name) {
          logger.dev("[LLM API] 🚀 Exécution tool Together AI:", functionCallData.name);
          
          // Définir les variables en dehors du try/catch
          const toolCallId = functionCallData.tool_call_id || `call_${Date.now()}`; // 🔧 CORRECTION: Utiliser l'ID réel du tool call
          const toolMessage = {
            role: 'assistant' as const,
            content: null, // 🔧 SÉCURITÉ: jamais "undefined"
            tool_calls: [{ // 🔧 SÉCURITÉ: Array [{...}], pas nombre
              id: toolCallId, // 🔧 SÉCURITÉ: ID arbitraire
              type: 'function',
              function: {
                name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: fallback
                arguments: functionCallData.arguments
              }
            }]
          };

          const toolResultMessage = {
            role: 'tool' as const,
            tool_call_id: toolCallId, // 🔧 SÉCURITÉ: même ID
            name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: même nom (fallback)
            content: ''
          };
          
          // 2. Nettoyer l'historique et ajouter les tool calls (pas de tool_calls dans les messages user)
          const cleanMessages = messages.filter(msg => {
            // Garder tous les messages sauf les tool_calls dans les messages user
            if (msg.role === 'user' && 'tool_calls' in msg) {
              logger.dev("[LLM API] 🔧 Suppression tool_calls du message user");
              return false;
            }
            return true;
          });
          
          const updatedMessages = [
            ...cleanMessages,
            toolMessage,
            toolResultMessage
          ];
          
          try {
            // 🔧 NOUVEAU: Nettoyer et valider les arguments JSON
            const functionArgs = cleanAndParseFunctionArgs(functionCallData.arguments);
            
            // Timeout de 15 secondes pour les tool calls
            const toolCallPromise = agentApiV2Tools.executeTool(
              functionCallData.name, 
              functionArgs, 
              userToken
            );
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout tool call (15s)')), 15000);
            });
            
            const result = await Promise.race([toolCallPromise, timeoutPromise]);

            logger.dev("[LLM API] ✅ Tool Together AI exécuté:", result);

            // 🔧 CORRECTION: Injecter le message tool et relancer le LLM
            logger.dev("[LLM API] 🔧 Injection du message tool et relance Together AI");

            // 🔧 SÉCURITÉ: Éviter le double-échappement et vérifier la taille
            let toolContent: string;
            if (typeof result === 'string') {
              // Si c'est déjà une string, vérifier si c'est du JSON valide
              try {
                JSON.parse(result); // Test si c'est du JSON valide
                toolContent = result; // Utiliser directement si c'est du JSON
              } catch {
                toolContent = JSON.stringify(result); // Échapper si ce n'est pas du JSON
              }
            } else {
              toolContent = JSON.stringify(result);
            }

            // 🔧 SÉCURITÉ: Vérifier la taille du content (limite à 8KB)
            const maxContentSize = 8 * 1024; // 8KB
            if (toolContent.length > maxContentSize) {
              logger.dev(`[LLM API] ⚠️ Content Together AI trop long (${toolContent.length} chars), tronquer`);
              toolContent = JSON.stringify({
                success: result.success,
                message: "Résultat tronqué - données trop volumineuses",
                truncated: true,
                original_size: toolContent.length
              });
            }

            // Mettre à jour le contenu du message tool avec le résultat
            toolResultMessage.content = toolContent;
            
            logger.dev("[LLM API] 📝 Message tool mis à jour:", {
              toolCallId,
              content: toolResultMessage.content.substring(0, 200) + "..."
            });

            // 3. Relancer Together AI avec l'historique complet (SANS tools)
            const finalPayload = {
              model: config.model,
              messages: updatedMessages,
              stream: true,
              temperature: config.temperature,
              max_tokens: config.max_tokens,
              top_p: config.top_p
              // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
            };

            logger.dev("[LLM API] 📤 Relance Together AI avec historique tool");
            logger.dev("[LLM API] 📋 Payload final:", {
              model: finalPayload.model,
              messageCount: finalPayload.messages.length,
              lastMessage: finalPayload.messages[finalPayload.messages.length - 1]?.role
            });

            const finalResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
              },
              body: JSON.stringify(finalPayload)
            });

            if (!finalResponse.ok) {
              const errorText = await finalResponse.text();
              logger.error("[LLM API] ❌ Erreur relance Together AI:", errorText);
              throw new Error(`Together AI relance error: ${finalResponse.status} - ${errorText}`);
            }

            logger.dev("[LLM API] ✅ Relance Together AI réussie, début du streaming final");

            // Gestion du streaming de la relance
            const finalReader = finalResponse.body?.getReader();
            if (!finalReader) {
              throw new Error('Impossible de lire le stream de relance');
            }

            let finalAccumulatedContent = '';
            let finalTokenBuffer = '';
            let finalBufferSize = 0;
            let finalTokenCount = 0;
            let secondFunctionCallData: any = null; // ✅ Détection d'un 2e tool call

            // Fonction pour envoyer le buffer final
            const flushFinalTokenBuffer = async () => {
              if (finalTokenBuffer.length > 0) {
                try {
                  await channel.send({
                    type: 'broadcast',
                    event: 'llm-token-batch',
                    payload: {
                      tokens: finalTokenBuffer,
                      sessionId: context.sessionId
                    }
                  });
                  logger.dev("[LLM API] 📦 Batch final envoyé:", finalTokenBuffer.length, "chars");
                  finalTokenBuffer = '';
                  finalBufferSize = 0;
                } catch (error) {
                  logger.error("[LLM API] ❌ Erreur broadcast batch final Together AI:", error);
                }
              }
            };

            let isDone = false;
            while (!isDone) {
              const { done, value } = await finalReader.read();
              if (done) {
                isDone = true;
                logger.dev("[LLM API] ✅ Streaming final terminé");
                break;
              }

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    isDone = true;
                    logger.dev("[LLM API] ✅ [DONE] reçu pour streaming final");
                    break;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta;
                    
                    if (delta?.tool_calls) {
                      // ✅ Détecter un 2e tool call pendant la relance
                      logger.dev("[LLM API] 🔧 Tool calls (2e passe) détectés:", JSON.stringify(delta.tool_calls));
                      for (const toolCall of delta.tool_calls) {
                        if (!secondFunctionCallData) {
                          secondFunctionCallData = {
                            name: toolCall.function?.name || '',
                            arguments: toolCall.function?.arguments || '',
                            tool_call_id: toolCall.id
                          };
                        } else {
                          if (toolCall.function?.name) secondFunctionCallData.name = toolCall.function.name;
                          if (toolCall.function?.arguments) secondFunctionCallData.arguments += toolCall.function.arguments;
                          if (toolCall.id) secondFunctionCallData.tool_call_id = toolCall.id;
                        }
                      }

                      // Broadcast des tool calls
                      await channel.send({
                        type: 'broadcast',
                        event: 'llm-tool-calls',
                        payload: {
                          sessionId: context.sessionId,
                          tool_calls: delta.tool_calls,
                          tool_name: secondFunctionCallData?.name || 'unknown_tool'
                        }
                      });
                    }
                    
                    if (delta?.content) {
                      const token = delta.content
                        ?? delta.message?.content
                        ?? (typeof delta.text === 'string' ? delta.text : undefined)
                        ?? (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
                      if (token) {
                      finalAccumulatedContent += token;
                      finalTokenBuffer += token;
                      finalBufferSize++;
                      finalTokenCount++;
                      
                      if (finalBufferSize >= BATCH_SIZE) {
                        try {
                          await flushFinalTokenBuffer();
                          logger.dev("[LLM API] 📦 Batch final Together AI envoyé");
                        } catch (error) {
                          logger.error("[LLM API] ❌ Erreur broadcast batch final Together AI:", error);
                          }
                        }
                      }
                    }
                  } catch (parseError) {
                    logger.dev("[LLM API] ⚠️ Chunk final non-JSON ignoré:", data);
                  }
                }
              }
            }

            // Envoyer le buffer final restant
            await flushFinalTokenBuffer();

            // ✅ Si un 2e tool call a été demandé, l'exécuter puis relancer une dernière fois
            if (secondFunctionCallData && secondFunctionCallData.name) {
              try {
                const toolCallId2 = secondFunctionCallData.tool_call_id || `call_${Date.now()}_2`;

                const toolMessage2 = {
                  role: 'assistant' as const,
                  content: null,
                  tool_calls: [{
                    id: toolCallId2,
                    type: 'function',
                    function: {
                      name: secondFunctionCallData.name || 'unknown_tool',
                      arguments: secondFunctionCallData.arguments
                    }
                  }]
                };

                const toolResultMessage2 = {
                  role: 'tool' as const,
                  tool_call_id: toolCallId2,
                  name: secondFunctionCallData.name || 'unknown_tool',
                  content: ''
                };

                // Nettoyer/valider les args
                const functionArgs2 = cleanAndParseFunctionArgs(secondFunctionCallData.arguments);

                const toolCallPromise2 = agentApiV2Tools.executeTool(
                  secondFunctionCallData.name,
                  functionArgs2,
                  userToken
                );

                const timeoutPromise2 = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout tool call (15s)')), 15000));
                const result2 = await Promise.race([toolCallPromise2, timeoutPromise2]);

                logger.dev("[LLM API] ✅ 2e tool exécuté:", result2);

                // Securité: stringifier le résultat
                let toolContent2: string;
                if (typeof result2 === 'string') {
                  try {
                    JSON.parse(result2);
                    toolContent2 = result2;
                  } catch {
                    toolContent2 = JSON.stringify(result2);
                  }
                } else {
                  toolContent2 = JSON.stringify(result2);
                }

                toolResultMessage2.content = toolContent2;

                const updatedMessages2 = [
                  ...updatedMessages,
                  toolMessage2,
                  toolResultMessage2
                ];

                const finalPayload2 = {
                  model: config.model,
                  messages: updatedMessages2,
                  stream: true,
                  temperature: config.temperature,
                  max_tokens: config.max_tokens,
                  top_p: config.top_p
                  // 🔧 Toujours sans tools pour éviter une boucle infinie
                };

                logger.dev("[LLM API] 📤 2e relance Together AI avec historique tool");

                const finalResponse2 = await fetch('https://api.together.xyz/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
                  },
                  body: JSON.stringify(finalPayload2)
                });

                if (!finalResponse2.ok) {
                  const errorText2 = await finalResponse2.text();
                  logger.error("[LLM API] ❌ Erreur 2e relance Together AI:", errorText2);
                  throw new Error(`Together AI 2e relance error: ${finalResponse2.status} - ${errorText2}`);
                }

                const finalReader2 = finalResponse2.body?.getReader();
                if (!finalReader2) {
                  throw new Error('Impossible de lire le stream de la 2e relance');
                }

                let final2Accumulated = '';
                let final2Buffer = '';
                let final2Size = 0;
                let final2Count = 0;

                const flushFinal2 = async () => {
                  if (final2Buffer.length > 0) {
                    try {
                      await channel.send({
                        type: 'broadcast',
                        event: 'llm-token-batch',
                        payload: { tokens: final2Buffer, sessionId: context.sessionId }
                      });
                      logger.dev("[LLM API] 📦 Batch final Together AI envoyé");
                      final2Buffer = '';
                      final2Size = 0;
                    } catch (error) {
                      logger.error("[LLM API] ❌ Erreur broadcast batch final Together AI:", error);
                    }
                  }
                };

                let done2 = false;
                while (!done2) {
                  const { done, value } = await finalReader2.read();
                  if (done) { done2 = true; break; }
                  const chunk2 = new TextDecoder().decode(value);
                  const lines2 = chunk2.split('\n');
                  for (const line of lines2) {
                    if (line.startsWith('data: ')) {
                      const data2 = line.slice(6);
                      if (data2 === '[DONE]') { done2 = true; break; }
                      try {
                        const parsed2 = JSON.parse(data2);
                        const delta2 = parsed2.choices?.[0]?.delta;
                        if (delta2?.content) {
                          final2Accumulated += delta2.content;
                          final2Buffer += delta2.content;
                          final2Size++;
                          final2Count++;
                          if (final2Size >= BATCH_SIZE) {
                            await flushFinal2();
                          }
                        }
                      } catch {
                        logger.dev("[LLM API] ⚠️ Chunk final non-JSON ignoré:", data2);
                      }
                    }
                  }
                }

                await flushFinal2();

                try {
                  await channel.send({
                    type: 'broadcast',
                    event: 'llm-complete',
                    payload: { sessionId: context.sessionId, fullResponse: final2Accumulated }
                  });
                } catch (error) {
                  logger.error("[LLM API] ❌ Erreur broadcast completion final:", error);
                }

                logger.dev("[LLM API] ✅ Streaming final Together AI terminé, contenu final:", final2Accumulated.substring(0, 100) + "...");

                return NextResponse.json({ success: true, completed: true, response: final2Accumulated });
              } catch (error) {
                const errorMessage2 = error instanceof Error ? error.message : 'Erreur inconnue';
                logger.error("[LLM API] ❌ Erreur exécution 2e tool Together AI:", errorMessage2);
                const fallback2 = `❌ Erreur pendant l'enchaînement des actions: ${errorMessage2}`;
                try {
                  await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId: context.sessionId, fullResponse: fallback2 } });
                } catch {}
                return NextResponse.json({ success: true, completed: true, response: fallback2, error: true });
              }
            }

            logger.dev("[LLM API] 📊 Statistiques streaming final:", {
              totalTokens: finalTokenCount,
              finalContent: finalAccumulatedContent.substring(0, 100) + "..."
            });

            // Broadcast de completion avec le contenu final
            try {
              await channel.send({
                type: 'broadcast',
                event: 'llm-complete',
                payload: {
                  sessionId: context.sessionId,
                  fullResponse: finalAccumulatedContent
                }
              });
              logger.dev("[LLM API] ✅ Broadcast completion final réussi");
            } catch (error) {
              logger.error("[LLM API] ❌ Erreur broadcast completion final:", error);
            }

            logger.dev("[LLM API] ✅ Streaming final Together AI terminé, contenu final:", finalAccumulatedContent.substring(0, 100) + "...");

            // Retourner du JSON pur pour éviter l'erreur parsing
            return NextResponse.json({ 
              success: true, 
              completed: true,
              response: finalAccumulatedContent 
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            logger.error("[LLM API] ❌ Erreur exécution tool Together AI:", errorMessage);

            // 🔧 NOUVEAU: Sauvegarder les messages tool dans la base de données (NOUVEAU FORMAT)
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const css = ChatSessionService.getInstance();
            
            // 🔧 Persister le message de l'assistant contenant les tool calls
            await persistWithRetry(
              () => css.addMessageWithToken(context.sessionId, {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: toolCallId, type: 'function', function: { name: functionCallData.name, arguments: functionCallData.arguments } }],
                timestamp: new Date().toISOString()
              }, userToken),
              "Message assistant avec tool_calls"
            );

            // Persister le résultat du tool call
            await persistWithRetry(
              () => css.addMessageWithToken(context.sessionId, {
                role: 'tool',
                tool_call_id: toolCallId,
                name: functionCallData.name,
                content: toolResultMessage.content,
                timestamp: new Date().toISOString()
              }, userToken),
              `Résultat du tool ${functionCallData.name}`
            );
            
            logger.dev("[LLM API] ✅ Cycle de persistance des tools terminé.");

            // 🔧 NOUVEAU: Fallback - Réponse d'erreur simple
            logger.dev("[LLM API] 🔧 Fallback: Envoi d'une réponse d'erreur simple");
            
            const fallbackResponse = `❌ Désolé, je n'ai pas pu exécuter l'action demandée. Erreur: ${errorMessage}`;
            
            // Broadcast de completion avec la réponse d'erreur
            try {
              await channel.send({
                type: 'broadcast',
                event: 'llm-complete',
                payload: {
                  sessionId: context.sessionId,
                  fullResponse: fallbackResponse
                }
              });
              logger.dev("[LLM API] ✅ Broadcast completion fallback réussi");
            } catch (broadcastError) {
              logger.error("[LLM API] ❌ Erreur broadcast completion fallback:", broadcastError);
            }

            // Retourner la réponse d'erreur
            return NextResponse.json({ 
              success: true, 
              completed: true,
              response: fallbackResponse,
              error: true
            });
          }
        }

        // Broadcast de completion avec le contenu accumulé (si pas de function call)
        await channel.send({
          type: 'broadcast',
          event: 'llm-complete',
          payload: {
            sessionId: context.sessionId,
            fullResponse: accumulatedContent
          }
        });

        logger.dev("[LLM API] ✅ Streaming Together AI terminé, contenu accumulé:", accumulatedContent.substring(0, 100) + "...");

        // Retourner du JSON pur pour éviter l'erreur parsing
        return NextResponse.json({ 
          success: true, 
          completed: true,
          response: accumulatedContent 
        });
      }
      // ✅ NOUVEAU: Gestion du streaming pour Groq
      else if (currentProvider.id === 'groq') {
        logger.dev("[LLM API] 🚀 Streaming avec Groq");
        
        // Créer un canal unique pour le streaming
        const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Préparer le canal et s'abonner pour s'assurer que les broadcasts partent
        const supabaseInit = createSupabaseAdmin();
        const channelInit = supabaseInit.channel(channelId);
        try {
          await channelInit.subscribe();
        } catch {}
        
        // Utiliser le provider avec configuration d'agent
        const groqProvider = new GroqProvider();
        
        const config = {
          model: agentConfig?.model || groqProvider.config.model,
          temperature: agentConfig?.temperature || groqProvider.config.temperature,
          max_tokens: agentConfig?.max_tokens || groqProvider.config.maxTokens,
          top_p: agentConfig?.top_p || groqProvider.config.topP,
          system_instructions: agentConfig?.system_instructions || 'Assistant IA spécialisé dans l\'aide et la conversation.'
        };
        
        // Préparer les messages avec la configuration dynamique
        const systemContent = `Assistant IA spécialisé dans l'aide et la conversation. Contexte: ${appContext.name}`;
        
        const messages = [
          {
            role: 'system' as const,
            content: systemContent
          },
          ...sessionHistory.map((msg: ChatMessage) => {
          const mappedMsg: any = {
            role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
            content: msg.content
          };
          
          // 🔧 CORRECTION: Transmettre les tool_calls pour les messages assistant
          if (msg.role === 'assistant' && (msg as any).tool_calls) {
            mappedMsg.tool_calls = (msg as any).tool_calls;
          }
          
          // 🔧 CORRECTION: Transmettre tool_call_id et name pour les messages tool
          if ((msg as any).role === 'tool') {
            if ((msg as any).tool_call_id) {
              mappedMsg.tool_call_id = (msg as any).tool_call_id;
            }
            if ((msg as any).name) {
              mappedMsg.name = (msg as any).name;
            }
          }
          
          return mappedMsg;
        }),
          {
            role: 'user' as const,
            content: message
          }
        ];

        // 🔧 TOOLS: Accès complet à tous les endpoints pour tous les modèles
        const isGptOss = config.model.includes('gpt-oss');
        const isQwen = config.model.includes('Qwen');
        const supportsFunctionCalling = true; // ✅ Tous les modèles supportent les function calls
        
        if (isGptOss) {
          logger.dev("[LLM API] ✅ GPT-OSS détecté - Function calling supporté via Groq");
        } else if (isQwen) {
          logger.dev("[LLM API] ✅ Qwen détecté - Function calling supporté");
        }
        
        // ✅ Attendre l'initialisation asynchrone des tools OpenAPI
        await agentApiV2Tools.waitForInitialization();
        
        // 🔧 ACCÈS COMPLET: GPT/Grok ont accès à TOUS les tools
        const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Tous les tools disponibles // Tous les tools disponibles

        logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
        logger.dev("[LLM API] 🔧 Support function calling:", supportsFunctionCalling);
        logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);

        // 🎯 DÉCISION: Utiliser Groq pour GPT-OSS, Together AI pour les autres
        const useGroq = isGptOss;
        const apiUrl = useGroq 
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.together.xyz/v1/chat/completions';
        const apiKey = useGroq 
          ? process.env.GROQ_API_KEY
          : process.env.TOGETHER_API_KEY;
        const providerName = useGroq ? 'Groq' : 'Together AI';

        // Appeler l'API appropriée avec streaming
        const payload = useGroq ? {
          // 🎯 Payload spécifique pour Groq
          model: 'openai/gpt-oss-120b', // ✅ Modèle correct pour Groq
          messages,
          stream: true,
          temperature: config.temperature,
          max_completion_tokens: config.max_tokens, // ✅ Groq utilise max_completion_tokens
          top_p: config.top_p,
          reasoning_effort: 'medium', // ✅ Activer le reasoning pour Groq
          ...(tools && { tools, tool_choice: 'auto' })
        } : {
          // 🎯 Payload pour Together AI avec support Qwen 3
          model: config.model,
          messages,
          stream: true,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          top_p: config.top_p,
          // ✅ NOUVEAU: Support du reasoning pour Qwen 3 selon la documentation Alibaba Cloud
          ...(isQwen && {
            enable_thinking: false, // ❌ DÉSACTIVÉ: Le thinking/reasoning pour Qwen
            result_format: 'message' // ✅ Format de réponse avec reasoning
          }),
          ...(tools && { tools, tool_choice: 'auto' })
        };

        logger.dev(`[LLM API] 📤 Payload complet envoyé à ${providerName}:`);
        logger.dev(JSON.stringify(payload, null, 2));
        logger.dev(`[LLM API] 📤 Appel ${providerName} avec streaming`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[LLM API] ❌ Erreur ${providerName}:`, errorText);
          throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
        }

        // Gestion du streaming
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Impossible de lire le stream de réponse');
        }

        let accumulatedContent = '';
        let functionCallData: any = null;
        let tokenBuffer = '';
        let bufferSize = 0;
        const BATCH_SIZE = 5; // Envoyer par batch de 5 tokens

        // Créer le canal pour le broadcast
        const supabase = createSupabaseAdmin();
        const channel = supabase.channel(channelId);
        try { await channel.subscribe(); } catch {}

        // Fonction pour envoyer le buffer de tokens
        const flushTokenBuffer = async () => {
          if (tokenBuffer.length > 0) {
            await channel.send({
              type: 'broadcast',
              event: 'llm-token-batch',
              payload: {
                tokens: tokenBuffer,
                sessionId: context.sessionId
              }
            });
            tokenBuffer = '';
            bufferSize = 0;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                
                logger.dev("[LLM API] 📥 Chunk complet:", JSON.stringify(parsed));
                
                if (parsed.choices?.[0]?.delta) {
                  const delta = parsed.choices[0].delta;
                  logger.dev("[LLM API] 🔍 Delta trouvé:", JSON.stringify(delta));
                  
                  // Gestion du function calling (ancien format)
                  if (delta.function_call) {
                    if (!functionCallData) {
                      functionCallData = {
                        name: delta.function_call.name || '',
                        arguments: delta.function_call.arguments || ''
                      };
                    } else {
                      if (delta.function_call.name) {
                        functionCallData.name = delta.function_call.name;
                      }
                      if (delta.function_call.arguments) {
                        functionCallData.arguments += delta.function_call.arguments;
                      }
                    }
                  }
                  // Gestion du tool calling (nouveau format)
                  else if (delta.tool_calls) {
                    logger.dev("[LLM API] 🔧 Tool calls détectés:", JSON.stringify(delta.tool_calls));
                    
                    for (const toolCall of delta.tool_calls) {
                      if (!functionCallData) {
                        functionCallData = {
                          name: toolCall.function?.name || '',
                          arguments: toolCall.function?.arguments || '',
                          tool_call_id: toolCall.id // 🔧 NOUVEAU: Stocker l'ID du tool call
                        };
                      } else {
                        if (toolCall.function?.name) {
                          functionCallData.name = toolCall.function.name;
                        }
                        if (toolCall.function?.arguments) {
                          functionCallData.arguments += toolCall.function.arguments;
                        }
                        // 🔧 NOUVEAU: Garder l'ID du tool call
                        if (toolCall.id) {
                          functionCallData.tool_call_id = toolCall.id;
                        }
                      }
                    }
                    
                    // 🔧 NOUVEAU: Broadcast des tool calls au frontend
                    await channel.send({
                      type: 'broadcast',
                      event: 'llm-tool-calls',
                      payload: {
                        sessionId: context.sessionId,
                        tool_calls: delta.tool_calls,
                        tool_name: functionCallData?.name || 'unknown_tool'
                      }
                    });
                  }
                  
                  // ✅ NOUVEAU: Gestion du reasoning pour Groq GPT-OSS
                  if (delta.reasoning_content && useGroq) {
                    logger.dev("[LLM API] 🧠 Reasoning Groq détecté:", delta.reasoning_content);
                    
                    // Broadcast du reasoning en temps réel
                    await channel.send({
                      type: 'broadcast',
                      event: 'llm-reasoning',
                      payload: {
                        reasoning: delta.reasoning_content,
                        sessionId: context.sessionId
                      }
                    });
                  }
                  
                  else if (delta.content) {
                    const token = delta.content
                      ?? delta.message?.content
                      ?? (typeof delta.text === 'string' ? delta.text : undefined)
                      ?? (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
                    if (token) {
                      accumulatedContent += token;
                      tokenBuffer += token;
                    bufferSize++;
                    if (bufferSize >= BATCH_SIZE) {
                      await flushTokenBuffer();
                      }
                    }
                  }
                }
              } catch (parseError) {
                logger.dev("[LLM API] ⚠️ Chunk non-JSON ignoré:", data);
              }
            }
          }
        }

        // Envoyer le buffer final
        await flushTokenBuffer();

        // Si une fonction a été appelée, l'exécuter puis relancer Groq
        if (functionCallData && functionCallData.name) {
          logger.dev("[LLM API] 🔍 Function call Groq détectée:", functionCallData);
          const toolCallId = functionCallData.tool_call_id || `call_${Date.now()}`;

          const toolMessage = {
            role: 'assistant' as const,
            content: null,
            tool_calls: [{
              id: toolCallId,
              type: 'function',
              function: {
                name: functionCallData.name || 'unknown_tool',
                arguments: functionCallData.arguments
              }
            }]
          };

          const toolResultMessage = {
            role: 'tool' as const,
            tool_call_id: toolCallId,
            name: functionCallData.name || 'unknown_tool',
            content: ''
          };

          const functionArgs = cleanAndParseFunctionArgs(functionCallData.arguments);
          const toolResult = await agentApiV2Tools.executeTool(
            functionCallData.name,
            functionArgs,
            userToken
          );
          logger.dev("[LLM API] ✅ Tool Groq exécuté:", toolResult);

          let toolContent = '';
          if (typeof toolResult === 'string') {
            try { JSON.parse(toolResult); toolContent = toolResult; } catch { toolContent = JSON.stringify(toolResult); }
          } else {
            toolContent = JSON.stringify(toolResult);
          }
          toolResultMessage.content = toolContent;

          try {
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const css = ChatSessionService.getInstance();
            await css.addMessageWithToken(context.sessionId, {
              role: 'assistant',
              content: null,
              tool_calls: [{ id: toolCallId, type: 'function', function: { name: functionCallData.name, arguments: functionCallData.arguments } }],
              timestamp: new Date().toISOString()
            }, userToken);
            await css.addMessageWithToken(context.sessionId, {
              role: 'tool',
              tool_call_id: toolCallId,
              name: functionCallData.name,
              content: toolResultMessage.content,
              timestamp: new Date().toISOString()
            } as any, userToken);
            logger.dev("[LLM API] ✅ Messages tool Groq sauvegardés");
          } catch (saveError) {
            logger.error("[LLM API] ❌ Erreur sauvegarde messages tool (Groq):", saveError);
          }

          const cleanMessages = messages.filter(msg => !(msg.role === 'user' && 'tool_calls' in (msg as any)));
          const updatedMessages = [
            ...cleanMessages,
            toolMessage,
            toolResultMessage
          ];

          const finalPayloadGroq = {
            model: 'openai/gpt-oss-120b',
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_completion_tokens: config.max_tokens,
            top_p: config.top_p,
            reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium',
            ...(tools && { tools, tool_choice: 'auto' })
          };

          const finalResponseGroq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(finalPayloadGroq)
          });

          if (!finalResponseGroq.ok) {
            const errorText = await finalResponseGroq.text();
            logger.error("[LLM API] ❌ Erreur relance Groq:", errorText);
            throw new Error(`Groq relance error: ${finalResponseGroq.status} - ${errorText}`);
          }

          const finalReaderGroq = finalResponseGroq.body?.getReader();
          if (!finalReaderGroq) {
            throw new Error('Impossible de lire le stream final Groq');
          }
          let finalAccumulatedGroq = '';
          let finalBufferGroq = '';
          let finalSizeGroq = 0;
          const flushFinalGroq = async () => {
            if (finalBufferGroq.length > 0) {
              await channel.send({ type: 'broadcast', event: 'llm-token-batch', payload: { tokens: finalBufferGroq, sessionId: context.sessionId } });
              finalBufferGroq = '';
              finalSizeGroq = 0;
            }
          };
          let secondFnGroq: any = null;
          let doneFinal = false;
          while (!doneFinal) {
            const { done, value } = await finalReaderGroq.read();
            if (done) { doneFinal = true; break; }
            const chunk2 = new TextDecoder().decode(value);
            const lines2 = chunk2.split('\n');
            for (const line of lines2) {
              if (line.startsWith('data: ')) {
                const data2 = line.slice(6);
                if (data2 === '[DONE]') { doneFinal = true; break; }
                try {
                  const parsed2 = JSON.parse(data2);
                  const delta2 = parsed2.choices?.[0]?.delta;
                  if (delta2?.tool_calls) {
                    logger.dev("[LLM API] 🔧 Tool calls (Groq 2e passe) détectés:", JSON.stringify(delta2.tool_calls));
                    for (const toolCall of delta2.tool_calls) {
                      if (!secondFnGroq) {
                        secondFnGroq = { name: toolCall.function?.name || '', arguments: toolCall.function?.arguments || '', tool_call_id: toolCall.id };
                      } else {
                        if (toolCall.function?.name) secondFnGroq.name = toolCall.function.name;
                        if (toolCall.function?.arguments) secondFnGroq.arguments += toolCall.function.arguments;
                        if (toolCall.id) secondFnGroq.tool_call_id = toolCall.id;
                      }
                    }
                    await channel.send({ type: 'broadcast', event: 'llm-tool-calls', payload: { sessionId: context.sessionId, tool_calls: delta2.tool_calls, tool_name: secondFnGroq?.name || 'unknown_tool' } });
                  }
                  if (delta2?.content) {
                    const token2 = delta2?.content
                      ?? delta2?.message?.content
                      ?? (typeof delta2?.text === 'string' ? delta2.text : undefined)
                      ?? (typeof (delta2 as any)?.output_text === 'string' ? (delta2 as any).output_text : undefined);
                    if (token2) {
                      finalAccumulatedGroq += token2;
                      finalBufferGroq += token2;
                    finalSizeGroq++;
                    if (finalSizeGroq >= BATCH_SIZE) { await flushFinalGroq(); }
                    }
                  }
                } catch {
                  logger.dev('[LLM API] ⚠️ Chunk final non-JSON ignoré:', data2);
                }
              }
            }
          }
          await flushFinalGroq();

          if (secondFnGroq && secondFnGroq.name) {
            try {
              const toolCallId2 = secondFnGroq.tool_call_id || `call_${Date.now()}_2`;
              const toolMessage2 = { role: 'assistant' as const, content: null, tool_calls: [{ id: toolCallId2, type: 'function', function: { name: secondFnGroq.name, arguments: secondFnGroq.arguments } }] };
              const toolResultMessage2 = { role: 'tool' as const, tool_call_id: toolCallId2, name: secondFnGroq.name, content: '' };
              const args2 = cleanAndParseFunctionArgs(secondFnGroq.arguments);
              const res2 = await agentApiV2Tools.executeTool(secondFnGroq.name, args2, userToken);
              toolResultMessage2.content = typeof res2 === 'string' ? ((): string => { try { JSON.parse(res2); return res2; } catch { return JSON.stringify(res2); } })() : JSON.stringify(res2);
              const updatedMessages2 = [...updatedMessages, toolMessage2, toolResultMessage2];
              const finalPayload2 = { model: 'openai/gpt-oss-120b', messages: updatedMessages2, stream: true, temperature: config.temperature, max_completion_tokens: config.max_tokens, top_p: config.top_p };
              const finalResp2 = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify(finalPayload2) });
              if (!finalResp2.ok) {
                const errTxt2 = await finalResp2.text();
                logger.error('[LLM API] ❌ Erreur 2e relance Groq:', errTxt2);
                throw new Error(`Groq 2e relance error: ${finalResp2.status} - ${errTxt2}`);
              }
              const reader2 = finalResp2.body?.getReader();
              if (!reader2) { throw new Error('Impossible de lire le stream de la 2e relance Groq'); }
              let acc2 = '';
              let buf2 = '';
              let size2 = 0;
              const flush2 = async () => { if (buf2.length > 0) { await channel.send({ type: 'broadcast', event: 'llm-token-batch', payload: { tokens: buf2, sessionId: context.sessionId } }); buf2 = ''; size2 = 0; } };
              let done2 = false;
              while (!done2) {
                const { done, value } = await reader2.read();
                if (done) { done2 = true; break; }
                const c = new TextDecoder().decode(value);
                const ls = c.split('\n');
                for (const l of ls) {
                  if (l.startsWith('data: ')) {
                    const d = l.slice(6);
                    if (d === '[DONE]') { done2 = true; break; }
                    try {
                      const p = JSON.parse(d);
                      const del = p.choices?.[0]?.delta;
                      const t = del?.content ?? del?.message?.content ?? (typeof del?.text === 'string' ? del.text : undefined) ?? (typeof (del as any)?.output_text === 'string' ? (del as any).output_text : undefined);
                      if (t) { acc2 += t; buf2 += t; size2++; if (size2 >= BATCH_SIZE) { await flush2(); } }
                    } catch { logger.dev('[LLM API] ⚠️ Chunk final non-JSON ignoré:', d); }
                  }
                }
              }
              await flush2();
              await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId: context.sessionId, fullResponse: acc2 } });
              logger.dev('[LLM API] ✅ Streaming final Groq terminé');
              // ✅ Persister le message assistant final (2e passe)
              try {
                const { ChatSessionService } = await import('@/services/chatSessionService');
                const css = ChatSessionService.getInstance();
                await css.addMessageWithToken(context.sessionId, {
                  role: 'assistant',
                  content: acc2,
                  timestamp: new Date().toISOString()
                } as any, userToken);
                logger.dev('[LLM API] 💾 Assistant final (2e passe) sauvegardé');
              } catch (persistError) {
                logger.error('[LLM API] ❌ Erreur de sauvegarde (2e passe) du message assistant final:', persistError);
              }
              return NextResponse.json({ success: true, completed: true, response: acc2 });
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Erreur inconnue';
              const fb = `❌ Erreur pendant l'enchaînement des actions: ${msg}`;
              await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId: context.sessionId, fullResponse: fb } });
              return NextResponse.json({ success: true, completed: true, response: fb, error: true });
            }
          }

          await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId: context.sessionId, fullResponse: finalAccumulatedGroq } });
          // ✅ Persister le message assistant final (1re relance)
          try {
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const css = ChatSessionService.getInstance();
            await css.addMessageWithToken(context.sessionId, {
              role: 'assistant',
              content: finalAccumulatedGroq,
              timestamp: new Date().toISOString()
            } as any, userToken);
            logger.dev('[LLM API] 💾 Assistant final (1re relance) sauvegardé');
          } catch (persistError) {
            logger.error('[LLM API] ❌ Erreur de sauvegarde (1re relance) du message assistant final:', persistError);
          }
          return NextResponse.json({ success: true, completed: true, response: finalAccumulatedGroq });
        }

        // Broadcast de completion avec le contenu accumulé
        await channel.send({
          type: 'broadcast',
          event: 'llm-complete',
          payload: {
            sessionId: context.sessionId,
            fullResponse: accumulatedContent
          }
        });

        logger.dev("[LLM API] ✅ Streaming Groq terminé, contenu accumulé:", accumulatedContent.substring(0, 100) + "...");

        // Retourner du JSON pur pour éviter l'erreur parsing
        return NextResponse.json({ 
          success: true, 
          completed: true,
          response: accumulatedContent 
        });
      } else {
        // Pour les autres providers (Synesia, etc.)
        const response = await currentProvider.call(message, appContext, sessionHistory);
        return NextResponse.json({ success: true, response });
      }
    }

  } catch (error) {
    logger.error("[LLM API] ❌ Erreur générale:", error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}