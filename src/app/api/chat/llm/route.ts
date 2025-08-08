import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LLMProviderManager } from '@/services/llm/providerManager';
import { DeepSeekProvider, TogetherProvider, GroqProvider } from '@/services/llm/providers';
// Import temporairement désactivé pour résoudre le problème de build Vercel
import { agentApiV2Tools } from '@/services/agentApiV2Tools';

import type { AppContext, ChatMessage } from '@/services/llm/types';
import { simpleLogger as logger } from '@/utils/logger';

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

// Fonction pour récupérer l'historique des messages d'une session
const getSessionHistory = async (sessionId: string, userToken: string) => {
  try {
    const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
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

export async function POST(request: NextRequest) {
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
      sessionHistory = await getSessionHistory(context.sessionId, userToken);
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

    logger.dev("[LLM API] 🚀 Provider utilisé:", currentProvider.id);

    // Vérifier si c'est DeepSeek pour le streaming
    if (currentProvider.id === 'deepseek') {
      logger.dev("[LLM API] 🚀 Streaming avec DeepSeek");
      
      // Créer un canal unique pour le streaming
      const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      logger.dev("[LLM API] 📡 Canal utilisé:", channelId);
      
      // Utiliser le provider avec configuration d'agent
      const deepseekProvider = new DeepSeekProvider();
      logger.dev("[LLM API] 🔧 Configuration avant merge:", {
        defaultModel: deepseekProvider.getDefaultConfig().model,
        defaultInstructions: deepseekProvider.getDefaultConfig().system_instructions?.substring(0, 50) + '...'
      });
      
      const config = {
        model: agentConfig?.model || deepseekProvider.getDefaultConfig().model,
        temperature: agentConfig?.temperature || deepseekProvider.getDefaultConfig().temperature,
        max_tokens: agentConfig?.max_tokens || deepseekProvider.getDefaultConfig().max_tokens,
        top_p: agentConfig?.top_p || deepseekProvider.getDefaultConfig().top_p,
        system_instructions: agentConfig?.system_instructions || deepseekProvider.getDefaultConfig().system_instructions
      };
      logger.dev("[LLM API] 🔧 Configuration après merge:", {
        model: config.model,
        temperature: config.temperature,
        instructions: config.system_instructions?.substring(0, 100) + '...'
      });
      
      // Préparer les messages avec la configuration dynamique
      const systemContent = `Assistant IA spécialisé dans l'aide et la conversation. Contexte: ${appContext.name}`;
      logger.dev("[LLM API] 📝 Contenu système préparé:", systemContent.substring(0, 200) + '...');
      
      const messages = [
        {
          role: 'system' as const,
          content: systemContent
        },
        ...sessionHistory.map((msg: ChatMessage) => {
          // 🔍 DEBUG: Tracer la transmission du name
          if ((msg as any).role === 'tool') {
            logger.dev('[LLM API] 🔍 Transmission message tool:', {
              originalName: (msg as any).name || '❌ MANQUE',
              toolCallId: (msg as any).tool_call_id,
              willIncludeName: !!(msg as any).name
            });
          }
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
      logger.dev("[LLM API] 📡 Canal utilisé:", channelId);
      
      // Utiliser le provider avec configuration d'agent
      const groqProvider = new GroqProvider();
      logger.dev("[LLM API] 🔧 Configuration avant merge:", {
        defaultModel: groqProvider.config.model,
        provider: groqProvider.id
      });
      
      const config = {
        model: agentConfig?.model || groqProvider.config.model,
        temperature: agentConfig?.temperature || groqProvider.config.temperature,
        max_tokens: agentConfig?.max_tokens || groqProvider.config.maxTokens,
        top_p: agentConfig?.top_p || groqProvider.config.topP,
        system_instructions: agentConfig?.system_instructions || 'Assistant IA spécialisé dans l\'aide et la conversation.'
      };
      logger.dev("[LLM API] 🔧 Configuration après merge:", {
        model: config.model,
        temperature: config.temperature,
        instructions: config.system_instructions?.substring(0, 100) + '...'
      });
      
      // Préparer les messages avec la configuration dynamique
      const systemContent = `Assistant IA spécialisé dans l'aide et la conversation. Contexte: ${appContext.name}`;
      logger.dev("[LLM API] 📝 Contenu système préparé:", systemContent.substring(0, 200) + '...');
      
      const messages = [
        {
          role: 'system' as const,
          content: systemContent
        },
        ...sessionHistory.map((msg: ChatMessage) => {
          // 🔍 DEBUG: Tracer la transmission du name
          if ((msg as any).role === 'tool') {
            logger.dev('[LLM API] 🔍 Transmission message tool:', {
              originalName: (msg as any).name || '❌ MANQUE',
              toolCallId: (msg as any).tool_call_id,
              willIncludeName: !!(msg as any).name
            });
          }
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
      let functionCallData: any = null;
      let tokenBuffer = '';
      let bufferSize = 0;
      const BATCH_SIZE = 5; // Envoyer par batch de 5 tokens
      const BATCH_TIMEOUT = 100; // Ou toutes les 100ms

      // Créer le canal pour le broadcast
      const supabase = createSupabaseAdmin();
      const channel = supabase.channel(channelId);

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
                    logger.dev("[LLM API] 🔧 Tool call individuel:", {
                      id: toolCall.id,
                      type: toolCall.type,
                      function: toolCall.function
                    });
                    
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
                // Gestion du tool calling (format alternatif)
                else if (delta.tool_call) {
                  logger.dev("[LLM API] 🔧 Tool call détecté (format alternatif):", JSON.stringify(delta.tool_call));
                  
                  if (!functionCallData) {
                    functionCallData = {
                      name: delta.tool_call.function?.name || '',
                      arguments: delta.tool_call.function?.arguments || '',
                      tool_call_id: delta.tool_call.id // 🔧 NOUVEAU: Stocker l'ID du tool call
                    };
                  } else {
                    if (delta.tool_call.function?.name) {
                      functionCallData.name = delta.tool_call.function.name;
                    }
                    if (delta.tool_call.function?.arguments) {
                      functionCallData.arguments += delta.tool_call.function.arguments;
                    }
                    // 🔧 NOUVEAU: Garder l'ID du tool call
                    if (delta.tool_call.id) {
                      functionCallData.tool_call_id = delta.tool_call.id;
                    }
                  }
                  
                  // 🔧 NOUVEAU: Broadcast des tool calls au frontend
                  await channel.send({
                    type: 'broadcast',
                    event: 'llm-tool-calls',
                    payload: {
                      sessionId: context.sessionId,
                      tool_calls: [delta.tool_call],
                      tool_name: functionCallData?.name || 'unknown_tool'
                    }
                  });
                }
                // Gestion spécifique Groq (format différent)
                else if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                  logger.dev("[LLM API] 🔧 Tool calls Groq détectés:", JSON.stringify(delta.tool_calls));
                  
                  for (const toolCall of delta.tool_calls) {
                    logger.dev("[LLM API] 🔧 Tool call Groq individuel:", {
                      id: toolCall.id,
                      type: toolCall.type,
                      function: toolCall.function
                    });
                    
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
                else if (delta.content) {
                  accumulatedContent += delta.content;
                  tokenBuffer += delta.content;
                  bufferSize++;
                  
                  // Log épuré pour le streaming
                  logger.dev("[LLM API] 📤 Token ajouté au buffer:", bufferSize);
                  
                  // Envoyer le buffer si on atteint la taille ou le timeout
                  if (bufferSize >= BATCH_SIZE) {
                    try {
                      await flushTokenBuffer();
                      logger.dev("[LLM API] 📦 Batch envoyé");
                    } catch (error) {
                      logger.error("[LLM API] ❌ Erreur broadcast batch:", error);
                    }
                  }
                }
              }
            } catch (error) {
              logger.error("[LLM API] ❌ Erreur parsing chunk:", error);
            }
          }
        }
      }

              // Envoyer le buffer restant
        await flushTokenBuffer();

        // Si une fonction a été appelée, l'exécuter
        logger.dev("[LLM API] 🔍 Function call détectée:", functionCallData);
        logger.dev("[LLM API] 🔍 Function call name:", functionCallData?.name);
        logger.dev("[LLM API] 🔍 Function call args:", functionCallData?.arguments);
        
        // 🔧 SÉCURITÉ: Vérifier que functionCallData est valide
        if (!functionCallData || !functionCallData.name) {
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
        if (functionCallData && functionCallData.name) {
        logger.dev("[LLM API] 🚀 Exécution tool:", functionCallData.name);
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

          logger.dev("[LLM API] ✅ Tool exécuté:", result);

          // ✅ CORRECTION: Vérifier si le tool a échoué
          const safeResult = result || { success: true, message: "Tool exécuté avec succès" };
          
          // Si le tool a échoué, informer le modèle
          if (safeResult.success === false) {
            logger.dev("[LLM API] ⚠️ Tool a échoué:", safeResult.error);
          }
          
          // 🔧 NOUVEAU: Broadcast du résultat du tool call au frontend
          await channel.send({
            type: 'broadcast',
            event: 'llm-tool-result',
            payload: {
              sessionId: context.sessionId,
              tool_name: functionCallData.name,
              result: safeResult,
              success: safeResult.success !== false
            }
          });
          
          // 🔧 CORRECTION: Injecter le message tool et relancer le LLM
          logger.dev("[LLM API] 🔧 Injection du message tool et relance LLM");

          // 1. Créer le message assistant avec le bon format (structure minimale qui DÉBLOQUE tout)
          const toolCallId = functionCallData.tool_call_id || `call_${Date.now()}`; // 🔧 CORRECTION: Utiliser l'ID réel du tool call
          const toolMessage = {
            role: 'assistant' as const,
            content: null, // 🔧 SÉCURITÉ: jamais "undefined"
            tool_calls: [{ // 🔧 SÉCURITÉ: Array [{...}], pas nombre
              id: toolCallId, // 🔧 CORRECTION: ID réel du tool call
              type: 'function',
              function: {
                name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: fallback
                arguments: functionCallData.arguments
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
            name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: même nom (fallback)
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

          // 🔧 NOUVEAU: Sauvegarder les messages tool dans la base de données
          try {
            // Utiliser directement l'API avec le token utilisateur
            const response1 = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/v1/chat-sessions/${context.sessionId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
              },
              body: JSON.stringify({
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: toolCallId,
                  type: 'function',
                  function: {
                    name: functionCallData.name,
                    arguments: functionCallData.arguments
                  }
                }],
                timestamp: new Date().toISOString()
              })
            });

            if (!response1.ok) {
              throw new Error(`Erreur sauvegarde message assistant: ${response1.status}`);
            }

            // Sauvegarder le message tool avec le résultat
            const response2 = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/v1/chat-sessions/${context.sessionId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
              },
              body: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                name: functionCallData.name,
                content: typeof result === 'string' ? result : JSON.stringify(result),
                timestamp: new Date().toISOString()
              })
            });

            if (!response2.ok) {
              throw new Error(`Erreur sauvegarde message tool: ${response2.status}`);
            }

            logger.dev("[LLM API] ✅ Messages tool sauvegardés dans l'historique");
          } catch (saveError) {
            logger.error("[LLM API] ❌ Erreur sauvegarde messages tool:", saveError);
            // Continuer même si la sauvegarde échoue
          }

          // 3. Relancer le LLM avec l'historique complet SANS tools (anti-boucle infinie)
          logger.dev("[LLM API] 🔧 Relance LLM SANS tools pour éviter la boucle infinie");
          
          const finalPayload = useGroq ? {
            // 🎯 Payload spécifique pour Groq (relance SANS tools)
            model: 'openai/gpt-oss-120b',
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_completion_tokens: config.max_tokens,
            top_p: config.top_p,
            reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium'
            // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
          } : {
            // 🎯 Payload pour Together AI (relance SANS tools)
            model: config.model,
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p
            // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
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
            logger.error(`[LLM API] ❌ Erreur ${providerName} relance:`, errorText);
            throw new Error(`${providerName} API error: ${finalResponse.status} - ${errorText}`);
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
            tool_name: functionCallData.name,
            tool_args: functionCallData.arguments,
            timestamp: new Date().toISOString()
          };
          
          logger.dev("[LLM API] 🔧 Injection de l'erreur tool dans l'historique avec feedback structuré");

          // 1. Créer le message tool avec l'erreur
          const toolCallId = functionCallData.tool_call_id || `call_${Date.now()}`; // 🔧 CORRECTION: Utiliser l'ID réel du tool call
          const toolMessage = {
            role: 'assistant' as const,
            content: null,
            tool_calls: [{
              id: toolCallId,
              type: 'function',
              function: {
                name: functionCallData.name,
                arguments: functionCallData.arguments
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
            name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: fallback
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

          // 🔧 NOUVEAU: Sauvegarder les messages tool dans la base de données
          try {
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const chatSessionService = ChatSessionService.getInstance();
            
            // Sauvegarder le message assistant avec tool call
            await chatSessionService.addMessage(context.sessionId, {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: toolCallId,
                type: 'function',
                function: {
                  name: functionCallData.name,
                  arguments: functionCallData.arguments
                }
              }],
              timestamp: new Date().toISOString()
            });

            // Sauvegarder le message tool avec le résultat
            await chatSessionService.addMessage(context.sessionId, {
              role: 'tool',
              tool_call_id: toolCallId,
              name: functionCallData.name || 'unknown_tool', // 🔧 CORRECTION: Ajouter le name
              content: JSON.stringify({ 
                error: true, 
                message: `❌ ÉCHEC : ${errorMessage}`,
                success: false,
                action: 'failed'
              }),
              timestamp: new Date().toISOString()
            });

            logger.dev("[LLM API] ✅ Messages tool sauvegardés dans l'historique");
          } catch (saveError) {
            logger.error("[LLM API] ❌ Erreur sauvegarde messages tool:", saveError);
            // Continuer même si la sauvegarde échoue
          }

          // 3. Relancer le LLM avec l'historique complet (SANS tools)
          const finalPayload = useGroq ? {
            // 🎯 Payload spécifique pour Groq (relance)
            model: 'openai/gpt-oss-120b',
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_completion_tokens: config.max_tokens, // ✅ Groq utilise max_completion_tokens
            top_p: config.top_p,
            reasoning_effort: agentConfig?.api_config?.reasoning_effort || 'medium'
            // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
          } : {
            // 🎯 Payload pour Together AI (relance)
            model: config.model,
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p
            // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
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
            logger.error(`[LLM API] ❌ Erreur ${providerName} relance:`, errorText);
            throw new Error(`${providerName} API error: ${finalResponse.status} - ${errorText}`);
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
        logger.dev("[LLM API] 📡 Canal utilisé:", channelId);
        
        // Utiliser le provider avec configuration d'agent
        const togetherProvider = new TogetherProvider();
        logger.dev("[LLM API] 🔧 Configuration avant merge:", {
          defaultModel: togetherProvider.getDefaultConfig().model,
          defaultInstructions: togetherProvider.getDefaultConfig().system_instructions?.substring(0, 50) + '...'
        });
        
        const config = togetherProvider['mergeConfigWithAgent'](agentConfig || undefined);
        logger.dev("[LLM API] 🔧 Configuration après merge:", {
          model: config.model,
          temperature: config.temperature,
          instructions: config.system_instructions?.substring(0, 100) + '...'
        });
        
        // Préparer les messages avec la configuration dynamique
        const systemContent = togetherProvider['formatContext'](appContext, config);
        logger.dev("[LLM API] 📝 Contenu système préparé:", systemContent.substring(0, 200) + '...');
        
        const messages = [
          {
            role: 'system' as const,
            content: systemContent
          },
          ...sessionHistory.map((msg: ChatMessage) => {
          // 🔍 DEBUG: Tracer la transmission du name
          if ((msg as any).role === 'tool') {
            logger.dev('[LLM API] 🔍 Transmission message tool:', {
              originalName: (msg as any).name || '❌ MANQUE',
              toolCallId: (msg as any).tool_call_id,
              willIncludeName: !!(msg as any).name
            });
          }
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
                    const token = delta.content;
                    accumulatedContent += token;
                    tokenBuffer += token;
                    bufferSize++;
                    
                    // Envoyer le buffer si on atteint la taille
                    if (bufferSize >= BATCH_SIZE) {
                      try {
                        await flushTokenBuffer();
                        logger.dev("[LLM API] 📦 Batch Together AI envoyé");
                      } catch (error) {
                        logger.error("[LLM API] ❌ Erreur broadcast batch Together AI:", error);
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
                    
                    if (delta?.content) {
                      const token = delta.content;
                      finalAccumulatedContent += token;
                      finalTokenBuffer += token;
                      finalBufferSize++;
                      finalTokenCount++;
                      
                      // Envoyer le buffer si on atteint la taille
                      if (finalBufferSize >= BATCH_SIZE) {
                        try {
                          await flushFinalTokenBuffer();
                          logger.dev("[LLM API] 📦 Batch final Together AI envoyé");
                        } catch (error) {
                          logger.error("[LLM API] ❌ Erreur broadcast batch final Together AI:", error);
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

            // 🔧 NOUVEAU: Sauvegarder les messages tool dans la base de données
            try {
              const { ChatSessionService } = await import('@/services/chatSessionService');
              const chatSessionService = ChatSessionService.getInstance();
              
              // Sauvegarder le message assistant avec tool call
              await chatSessionService.addMessage(context.sessionId, {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: toolCallId,
                  type: 'function',
                  function: {
                    name: functionCallData.name,
                    arguments: functionCallData.arguments
                  }
                }],
                timestamp: new Date().toISOString()
              });

              // Sauvegarder le message tool avec le résultat
              await chatSessionService.addMessage(context.sessionId, {
                role: 'tool',
                tool_call_id: toolCallId,
                name: functionCallData.name || 'unknown_tool', // 🔧 CORRECTION: Ajouter le name
                content: JSON.stringify({ 
                  error: true, 
                  message: `❌ ÉCHEC : ${errorMessage}`,
                  success: false,
                  action: 'failed'
                }),
                timestamp: new Date().toISOString()
              });

              logger.dev("[LLM API] ✅ Messages tool Together AI sauvegardés dans l'historique");
            } catch (saveError) {
              logger.error("[LLM API] ❌ Erreur sauvegarde messages tool Together AI:", saveError);
              // Continuer même si la sauvegarde échoue
            }

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
        logger.dev("[LLM API] 📡 Canal utilisé:", channelId);
        
        // Utiliser le provider avec configuration d'agent
        const groqProvider = new GroqProvider();
        logger.dev("[LLM API] 🔧 Configuration avant merge:", {
          defaultModel: groqProvider.config.model,
          provider: groqProvider.id
        });
        
        const config = {
          model: agentConfig?.model || groqProvider.config.model,
          temperature: agentConfig?.temperature || groqProvider.config.temperature,
          max_tokens: agentConfig?.max_tokens || groqProvider.config.maxTokens,
          top_p: agentConfig?.top_p || groqProvider.config.topP,
          system_instructions: agentConfig?.system_instructions || 'Assistant IA spécialisé dans l\'aide et la conversation.'
        };
        logger.dev("[LLM API] 🔧 Configuration après merge:", {
          model: config.model,
          temperature: config.temperature,
          instructions: config.system_instructions?.substring(0, 100) + '...'
        });
        
        // Préparer les messages avec la configuration dynamique
        const systemContent = `Assistant IA spécialisé dans l'aide et la conversation. Contexte: ${appContext.name}`;
        logger.dev("[LLM API] 📝 Contenu système préparé:", systemContent.substring(0, 200) + '...');
        
        const messages = [
          {
            role: 'system' as const,
            content: systemContent
          },
          ...sessionHistory.map((msg: ChatMessage) => {
          // 🔍 DEBUG: Tracer la transmission du name
          if ((msg as any).role === 'tool') {
            logger.dev('[LLM API] 🔍 Transmission message tool:', {
              originalName: (msg as any).name || '❌ MANQUE',
              toolCallId: (msg as any).tool_call_id,
              willIncludeName: !!(msg as any).name
            });
          }
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
                    accumulatedContent += delta.content;
                    tokenBuffer += delta.content;
                    bufferSize++;
                    
                    // Envoyer le buffer si on atteint la taille
                    if (bufferSize >= BATCH_SIZE) {
                      await flushTokenBuffer();
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