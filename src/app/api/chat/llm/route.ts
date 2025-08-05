import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LLMProviderManager } from '@/services/llm/providerManager';
import { DeepSeekProvider } from '@/services/llm/providers';
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

    // Récupérer la configuration de l'agent si spécifiée
    let agentConfig = null;
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
      llmManager.setProvider(targetProvider);
      logger.dev("[LLM API] 🔄 Provider changé vers:", targetProvider);
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
      
      const config = deepseekProvider['mergeConfigWithAgent'](agentConfig || undefined);
      logger.dev("[LLM API] 🔧 Configuration après merge:", {
        model: config.model,
        temperature: config.temperature,
        instructions: config.system_instructions?.substring(0, 100) + '...'
      });
      
      // Préparer les messages avec la configuration dynamique
      const systemContent = deepseekProvider['formatContext'](appContext, config);
      logger.dev("[LLM API] 📝 Contenu système préparé:", systemContent.substring(0, 200) + '...');
      
      const messages = [
        {
          role: 'system' as const,
          content: systemContent
        },
        ...history.map((msg: ChatMessage) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: message
        }
      ];

      // 🔧 ANTI-BUG: Forcer les outils pour test
      // Temporairement désactivé pour résoudre le problème de build Vercel
        const tools = agentApiV2Tools.getToolsForFunctionCalling();

      logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
              logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);

      // Appeler DeepSeek avec streaming et configuration dynamique
      const payload = {
        model: config.model,
        messages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        ...(tools && { tools })
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

      // Gestion du streaming avec function calling
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Impossible de lire le stream de réponse');
      }

      let accumulatedContent = '';
      let functionCallData: any = null;

      // Créer le canal pour le broadcast
      const supabase = createSupabaseAdmin();
      const channel = supabase.channel(channelId);

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
                        arguments: toolCall.function?.arguments || ''
                      };
                    } else {
                      if (toolCall.function?.name) {
                        functionCallData.name = toolCall.function.name;
                      }
                      if (toolCall.function?.arguments) {
                        functionCallData.arguments += toolCall.function.arguments;
                      }
                    }
                  }
                }
                else if (delta.content) {
                  accumulatedContent += delta.content;
                  
                  logger.dev("[LLM API] 📤 Broadcasting token:", delta.content.substring(0, 20) + '...');
                  
                  // Broadcast du token pour le streaming
                  try {
                    await channel.send({
                      type: 'broadcast',
                      event: 'llm-token',
                      payload: {
                        token: delta.content,
                        sessionId: context.sessionId
                      }
                    });
                    logger.dev("[LLM API] ✅ Token broadcasté avec succès");
                  } catch (error) {
                    logger.error("[LLM API] ❌ Erreur broadcast token:", error);
                  }
                }
              }
            } catch (error) {
              logger.error("[LLM API] ❌ Erreur parsing chunk:", error);
            }
          }
        }
      }

      // Si une fonction a été appelée, l'exécuter
      logger.dev("[LLM API] 🔍 Vérification function call:", functionCallData);
      
      // 🔧 ANTI-BOUCLE: Limiter à une seule exécution de fonction par requête
      if (functionCallData && functionCallData.name) {
        logger.dev("[LLM API] 🎯 ON ENTRE DANS LE BLOC FUNCTION CALL !");
        try {
          logger.dev("[LLM API] 🔧 Function call détectée:", functionCallData);
          
          const functionArgs = JSON.parse(functionCallData.arguments);
          
          // Utiliser le token JWT de l'utilisateur pour l'authentification API
          logger.dev("[LLM API] 🔑 Token JWT utilisé pour tool call:", userToken.substring(0, 20) + "...");
          
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

          logger.dev("[LLM API] ✅ Résultat de la fonction:", result);

          // 🔧 CORRECTION: Injecter le message tool et relancer le LLM
          logger.dev("[LLM API] 🔧 Injection du message tool et relance LLM");

          // 1. Créer le message tool avec le bon format
          const toolCallId = `call_${Date.now()}`;
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

          const toolResultMessage = {
            role: 'tool' as const,
            tool_call_id: toolCallId,
            content: JSON.stringify(result)
          };

          // 2. Ajouter les messages à l'historique
          const updatedMessages = [
            ...messages,
            toolMessage,
            toolResultMessage
          ];

          logger.dev("[LLM API] 📝 Historique mis à jour avec tool messages");

          // 3. Relancer le LLM avec l'historique complet
          const finalResponse = await currentProvider.client.chat.completions.create({
            model: agentConfig?.model || 'deepseek-chat',
            messages: updatedMessages,
            stream: true,
            temperature: agentConfig?.temperature || 0.7,
            max_tokens: agentConfig?.max_tokens || 4000,
            ...(tools && { tools })
          });

          logger.dev("[LLM API] 🔄 LLM relancé avec historique complet");

          // 4. Streamer la vraie réponse du LLM
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of finalResponse) {
                  const delta = chunk.choices[0]?.delta;
                  if (delta?.content) {
                    const token = delta.content;
                    
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
                }

                // Broadcast de completion
                await channel.send({
                  type: 'broadcast',
                  event: 'llm-complete',
                  payload: {
                    sessionId: context.sessionId,
                    fullResponse: "Réponse générée par le LLM après traitement des données"
                  }
                });

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
          logger.error("[LLM API] ❌ Erreur exécution fonction:", error);
          
          const errorMessage = `Erreur lors de l'exécution de l'action: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          
          // Broadcast d'erreur
          await channel.send({
            type: 'broadcast',
            event: 'llm-error',
            payload: {
              sessionId: context.sessionId,
              error: errorMessage
            }
          });
          
          return NextResponse.json({ 
            success: false, 
            error: errorMessage
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
        
        return NextResponse.json({ success: true, response: accumulatedContent });
      }

    } else {
      // Pour les autres providers (Synesia, etc.)
      const response = await currentProvider.call(message, appContext, history);
      return NextResponse.json({ success: true, response });
    }

  } catch (error) {
    logger.error("[LLM API] ❌ Erreur générale:", error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 