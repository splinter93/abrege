import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { llmManager } from '@/services/llm';
import { DeepSeekProvider } from '@/services/llm/providers';

import type { AppContext, ChatMessage } from '@/services/llm/types';
import { simpleLogger as logger } from '@/utils/logger';

// Fonction pour créer le client Supabase
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

// Fonction pour récupérer un agent
const getAgentById = async (id: string) => {
  try {
    const supabase = createSupabaseClient();
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

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userToken = authHeader.substring(7);
      const supabase = createSupabaseClient();
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

      // Appeler DeepSeek avec streaming et configuration dynamique
      const payload = {
        model: config.model,
        messages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p
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
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      // Lire le stream et broadcaster chaque token
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Pas de body de réponse pour le streaming');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      logger.dev("[LLM API] 📝 Début du streaming...");

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.choices && data.choices[0]?.delta?.content) {
                  const token = data.choices[0].delta.content;
                  fullResponse += token;
                  
                  // Broadcaster le token via Supabase Realtime
                  // Utiliser l'ID de session depuis le contexte ou un ID unique
                  const sessionId = context?.sessionId || appContext.id;
                  try {
                    const supabase = createSupabaseClient();
                    await supabase.channel(channelId).send({
                      type: 'broadcast',
                      event: 'llm-token',
                      payload: { 
                        token, 
                        sessionId,
                        fullResponse 
                      }
                    });
                    
                    logger.dev("[LLM API] 📝 Token broadcasté:", token);
                  } catch (broadcastError) {
                    logger.error("[LLM API] ❌ Erreur broadcast token:", broadcastError);
                  }
                } else if (data.choices && data.choices[0]?.finish_reason) {
                  logger.dev("[LLM API] ✅ Streaming terminé");
                  
                  // Broadcaster la fin du stream
                  const sessionId = context?.sessionId || appContext.id;
                  try {
                    const supabase = createSupabaseClient();
                    await supabase.channel(channelId).send({
                      type: 'broadcast',
                      event: 'llm-complete',
                      payload: { 
                        sessionId,
                        fullResponse 
                      }
                    });
                  } catch (broadcastError) {
                    logger.error("[LLM API] ❌ Erreur broadcast completion:", broadcastError);
                  }
                  
                  break;
                }
              } catch (e) {
                logger.warn("[LLM API] ⚠️ Erreur parsing SSE:", e);
              }
            }
          }
        }
      } catch (streamError) {
        logger.error("[LLM API] ❌ Erreur streaming:", streamError);
        
        // Essayer de broadcaster une erreur
        try {
          const sessionId = context?.sessionId || appContext.id;
          const supabase = createSupabaseClient();
          await supabase.channel(channelId).send({
            type: 'broadcast',
            event: 'llm-error',
            payload: { 
              sessionId,
              error: 'Erreur lors du streaming'
            }
          });
        } catch (broadcastError) {
          logger.error("[LLM API] ❌ Erreur broadcast error:", broadcastError);
        }
        
        throw streamError;
      }

      logger.dev("[LLM API] ✅ Streaming terminé, réponse complète:", fullResponse);

      return NextResponse.json({
        channelId,
        success: true,
        provider: llmManager.getCurrentProviderId(),
        message: "Streaming démarré, écoutez le canal pour les tokens"
      });

    } else {
      // Fallback pour les autres providers (Synesia)
      logger.dev("[LLM API] 🚀 Appel non-streaming avec", currentProvider.name);
      
      const response = await currentProvider.call(message, appContext, history);
      
      return NextResponse.json({
        response,
        success: true,
        provider: llmManager.getCurrentProviderId()
      });
    }

  } catch (error) {
    logger.error("[LLM API] ❌ Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 