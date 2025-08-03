import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { llmManager } from '@/services/llm';
import type { AppContext } from '@/services/llm/types';

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

    const { message, context, history, provider } = await request.json();
    
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

    // Appeler le LLM via le manager
    const response = await llmManager.call(message, appContext, history);

    console.log("[LLM API] ✅ Réponse LLM reçue");

    return NextResponse.json({
      response,
      success: true,
      provider: llmManager.getCurrentProviderId()
    });

  } catch (error) {
    console.error("[LLM API] ❌ Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 