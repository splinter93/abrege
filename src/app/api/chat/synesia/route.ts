import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification AVANT de traiter la requête
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
      
      if (authError || !user) {
        console.log("[Synesia API] ❌ Token invalide ou expiré");
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      console.log("[Synesia API] ✅ Utilisateur authentifié:", userId);
    } else {
      console.log("[Synesia API] ❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const { message, messages, streaming = false, sessionId } = await request.json();
    
    console.log("[Synesia API] 🚀 Début de la requête");
    console.log("[Synesia API] 👤 Utilisateur:", userId);
    console.log("[Synesia API] 📦 Body reçu:", { message, messages, streaming, sessionId });

    const apiKey = process.env.SYNESIA_API_KEY;
    const projectId = process.env.SYNESIA_PROJECT_ID;

    if (!apiKey || !projectId) {
      console.log("[Synesia API] ❌ Configuration manquante");
      return NextResponse.json(
        { error: "Synesia API configuration missing. Please check SYNESIA_API_KEY and SYNESIA_PROJECT_ID environment variables." },
        { status: 500 }
      );
    }
    
    console.log("[Synesia API] 🔑 API Key:", apiKey ? "✅ Présent" : "❌ Manquant");
    console.log("[Synesia API] 🆔 Project ID:", projectId ? "✅ Présent" : "❌ Manquant");

    // Prepare message history - only last 10 messages
    const recentMessages = messages.slice(-10);
    const messageHistory = recentMessages.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the new message
    messageHistory.push({
      role: "user",
      content: message
    });

    const payload = {
      callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
      args: message,
      settings: {
        history_messages: messageHistory,
        // Activer le streaming si demandé
        ...(streaming && { stream: true })
      }
    };
    
    console.log("[Synesia API] 📤 Payload envoyé:", payload);
    
    // Si streaming activé, utiliser Server-Sent Events
    if (streaming) {
      return handleStreamingResponse(payload, apiKey, projectId, sessionId);
    }
    
    // Sinon, réponse normale
    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${apiKey}`,
        "X-Project-ID": projectId,
      },
      body: JSON.stringify(payload),
    });

    console.log("[Synesia API] 📡 Status de la réponse:", response.status);
    console.log("[Synesia API] 📡 Headers de la réponse:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Synesia API] ❌ Erreur API:", errorText);
      return NextResponse.json(
        { error: `Synesia API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Synesia API] ✅ Réponse reçue:", data);

    return NextResponse.json({
      response: data.result || data.response || "Désolé, je n'ai pas pu traiter votre demande.",
      success: true
    });

  } catch (error) {
    console.error("[Synesia API] ❌ Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * Gérer la réponse streaming via Server-Sent Events
 */
async function handleStreamingResponse(payload: any, apiKey: string, projectId: string, sessionId: string) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch("https://api.synesia.app/execution?stream=true", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `ApiKey ${apiKey}`,
            "X-Project-ID": projectId,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Synesia API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Envoyer le signal de fin
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'LLM_COMPLETE', sessionId })}\n\n`));
            break;
          }

          // Décoder et traiter chaque chunk
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  // Envoyer chaque token
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'LLM_STREAM', 
                    sessionId, 
                    token: data.token 
                  })}\n\n`));
                }
              } catch (e) {
                console.warn("[Synesia API] ⚠️ Erreur parsing chunk:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("[Synesia API] ❌ Erreur streaming:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'ERROR', 
          sessionId, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 