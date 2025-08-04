import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { llmManager } from '@/services/llm';
import { DeepSeekProvider } from '@/services/llm/providers';
import type { AppContext, ChatMessage } from '@/services/llm/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userToken = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
      
      if (authError || !user) {
        console.log("[LLM API] ❌ Token invalide ou expiré");
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      console.log("[LLM API] ✅ Utilisateur authentifié:", userId);
    } else {
      console.log("[LLM API] ❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const { message, context, history, provider, channelId: incomingChannelId } = await request.json();
    
    console.log("[LLM API] 🚀 Début de la requête");
    console.log("[LLM API] 👤 Utilisateur:", userId);
    console.log("[LLM API] 📦 Body reçu:", { message, context, provider });

    // Changer de provider si spécifié
    if (provider && provider !== llmManager.getCurrentProviderId()) {
      llmManager.setProvider(provider);
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

    // Vérifier si c'est DeepSeek pour le streaming
    if (currentProvider.id === 'deepseek') {
      console.log("[LLM API] 🚀 Streaming avec DeepSeek");
      
      // Créer un canal unique pour le streaming
      const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log("[LLM API] 📡 Canal utilisé:", channelId);
      
      // Préparer les messages pour DeepSeek
      const deepseekProvider = new DeepSeekProvider();
      const messages = [
        {
          role: 'system' as const,
          content: deepseekProvider.formatContext(appContext)
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

      // Appeler DeepSeek avec streaming
      const payload = {
        model: 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      };

      console.log("[LLM API] 📤 Appel DeepSeek avec streaming");

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

      console.log("[LLM API] 📝 Début du streaming...");

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
                await supabase.channel(channelId).send({
                  type: 'broadcast',
                  event: 'llm-token',
                  payload: { 
                    token, 
                    sessionId,
                    fullResponse 
                  }
                });
                
                console.log("[LLM API] 📝 Token broadcasté:", token);
              } else if (data.choices && data.choices[0]?.finish_reason) {
                console.log("[LLM API] ✅ Streaming terminé");
                
                // Broadcaster la fin du stream
                const sessionId = context?.sessionId || appContext.id;
                await supabase.channel(channelId).send({
                  type: 'broadcast',
                  event: 'llm-complete',
                  payload: { 
                    sessionId,
                    fullResponse 
                  }
                });
                
                break;
              }
            } catch (e) {
              console.warn("[LLM API] ⚠️ Erreur parsing SSE:", e);
            }
          }
        }
      }

      console.log("[LLM API] ✅ Streaming terminé, réponse complète:", fullResponse);

      return NextResponse.json({
        channelId,
        success: true,
        provider: llmManager.getCurrentProviderId(),
        message: "Streaming démarré, écoutez le canal pour les tokens"
      });

    } else {
      // Fallback pour les autres providers (Synesia)
      console.log("[LLM API] 🚀 Appel non-streaming avec", currentProvider.name);
      
      const response = await currentProvider.call(message, appContext, history);
      
      return NextResponse.json({
        response,
        success: true,
        provider: llmManager.getCurrentProviderId()
      });
    }

  } catch (error) {
    console.error("[LLM API] ❌ Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 