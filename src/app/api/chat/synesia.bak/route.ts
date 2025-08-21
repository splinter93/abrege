import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

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
        logger.dev("[Synesia API] ❌ Token invalide ou expiré");
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      logger.dev("[Synesia API] ✅ Utilisateur authentifié:", userId);
    } else {
      logger.dev("[Synesia API] ❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const { message, messages } = await request.json();
    
    logger.dev("[Synesia API] 🚀 Début de la requête");
    logger.dev("[Synesia API] 👤 Utilisateur:", userId);
    logger.dev("[Synesia API] 📦 Body reçu:", { message, messages });

    const apiKey = process.env.SYNESIA_API_KEY;
    const projectId = process.env.SYNESIA_PROJECT_ID;

    if (!apiKey || !projectId) {
      logger.dev("[Synesia API] ❌ Configuration manquante");
      return NextResponse.json(
        { error: "Synesia API configuration missing. Please check SYNESIA_API_KEY and SYNESIA_PROJECT_ID environment variables." },
        { status: 500 }
      );
    }
    
    logger.dev("[Synesia API] 🔑 API Key:", apiKey ? "✅ Présent" : "❌ Manquant");
    logger.dev("[Synesia API] 🆔 Project ID:", projectId ? "✅ Présent" : "❌ Manquant");

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
        history_messages: messageHistory
      }
    };
    
    logger.dev("[Synesia API] 📤 Payload envoyé:", payload);
    
    // Réponse normale
    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${apiKey}`,
        "X-Project-ID": projectId,
      },
      body: JSON.stringify(payload),
    });

    logger.dev("[Synesia API] 📡 Status de la réponse:", response.status);
    logger.dev("[Synesia API] 📡 Headers de la réponse:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[Synesia API] ❌ Erreur API:", errorText);
      return NextResponse.json(
        { error: `Synesia API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.dev("[Synesia API] ✅ Réponse reçue:", data);

    return NextResponse.json({
      response: data.result || data.response || "Désolé, je n'ai pas pu traiter votre demande.",
      success: true
    });

  } catch (error) {
    logger.error("[Synesia API] ❌ Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

 