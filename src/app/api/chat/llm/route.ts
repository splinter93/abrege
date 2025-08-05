import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LLMProviderManager } from '@/services/llm/providerManager';
import { DeepSeekProvider, TogetherProvider } from '@/services/llm/providers';
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
        ...sessionHistory.map((msg: ChatMessage) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: message
        }
      ];

      // 🔧 TOOLS: Générer les outils pour function calling
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
                content: JSON.stringify(result),
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

          // 3. Relancer le LLM avec l'historique complet (SANS tools pour éviter la boucle infinie)
          const finalPayload = {
            model: config.model,
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p
            // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
          };

          logger.dev("[LLM API] 🔄 Relance LLM avec payload:", JSON.stringify(finalPayload, null, 2));

          const finalResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(finalPayload)
          });

          if (!finalResponse.ok) {
            const errorText = await finalResponse.text();
            logger.error("[LLM API] ❌ Erreur DeepSeek relance:", errorText);
            throw new Error(`DeepSeek API error: ${finalResponse.status} - ${errorText}`);
          }

          logger.dev("[LLM API] 🔄 LLM relancé avec historique complet");

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
          logger.error("[LLM API] ❌ Erreur exécution fonction:", error);
          
          const errorMessage = `Erreur lors de l'exécution de l'action: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          
          // 🔧 CORRECTION: Injecter l'erreur dans l'historique et relancer le LLM
          logger.dev("[LLM API] 🔧 Injection de l'erreur tool dans l'historique");

          // 1. Créer le message tool avec l'erreur
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
            content: JSON.stringify({ 
              error: true, 
              message: errorMessage 
            })
          };

          // 2. Ajouter les messages à l'historique
          const updatedMessages = [
            ...messages,
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
          const finalPayload = {
            model: config.model,
            messages: updatedMessages,
            stream: true,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p
            // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
          };

          logger.dev("[LLM API] 🔄 Relance LLM avec erreur tool");

          const finalResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(finalPayload)
          });

          if (!finalResponse.ok) {
            const errorText = await finalResponse.text();
            logger.error("[LLM API] ❌ Erreur DeepSeek relance:", errorText);
            throw new Error(`DeepSeek API error: ${finalResponse.status} - ${errorText}`);
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
          ...sessionHistory.map((msg: ChatMessage) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          })),
          {
            role: 'user' as const,
            content: message
          }
        ];

        // Appeler Together AI avec streaming
        const payload = {
          model: config.model,
          messages,
          stream: true,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          top_p: config.top_p
        };

        logger.dev("[LLM API] 📤 Payload complet envoyé à Together AI:");
        logger.dev(JSON.stringify(payload, null, 2));
        logger.dev("[LLM API] 📤 Appel Together AI avec streaming");

        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("[LLM API] ❌ Erreur Together AI:", errorText);
          throw new Error(`Together AI API error: ${response.status} - ${errorText}`);
        }

        // Gestion du streaming
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Impossible de lire le stream de réponse');
        }

        let accumulatedContent = '';
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
                
                if (delta?.content) {
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
              } catch (parseError) {
                logger.dev("[LLM API] ⚠️ Chunk non-JSON ignoré:", data);
              }
            }
          }
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

        logger.dev("[LLM API] ✅ Streaming Together AI terminé, contenu accumulé:", accumulatedContent.substring(0, 100) + "...");

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