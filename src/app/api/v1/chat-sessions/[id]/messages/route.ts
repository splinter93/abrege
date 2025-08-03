import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('[Chat Messages API] 🔧 Configuration:', {
  supabaseUrl: supabaseUrl ? '✅ Configuré' : '❌ Manquant',
  supabaseKey: supabaseKey ? '✅ Configuré' : '❌ Manquant'
});

if (!supabaseUrl || !supabaseKey) {
  console.error('[Chat Messages API] ❌ Variables d\'environnement Supabase manquantes');
  throw new Error('Configuration Supabase manquante');
}

// Client avec service role pour les opérations admin
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Schéma de validation pour ajouter un message
const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Le contenu ne peut pas être vide'),
  timestamp: z.string().optional().default(() => new Date().toISOString())
});

// POST /api/v1/chat-sessions/[id]/messages - Ajouter un message à une session
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log('[Chat Messages API] 📝 Ajout de message à la session:', id);
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        console.error('[Chat Messages API] ❌ Erreur auth:', authError);
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const sessionId = id;
    const body = await request.json();
    const validatedData = addMessageSchema.parse(body);

    console.log('[Chat Messages API] 📋 Données reçues:', validatedData);

    // Créer le nouveau message
    const newMessage = {
      id: crypto.randomUUID(),
      role: validatedData.role,
      content: validatedData.content,
      timestamp: validatedData.timestamp
    };

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
    }
    
    const userClient = createClient(supabaseUrl!, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Récupérer la session actuelle avec le contexte utilisateur
    console.log('[Chat Messages API] 🔍 Recherche session:', sessionId);
    const { data: currentSession, error: fetchError } = await userClient
      .from('chat_sessions')
      .select('thread, history_limit')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.error('[Chat Messages API] ❌ Session non trouvée:', sessionId);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      console.error('[Chat Messages API] ❌ Erreur récupération session:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    // Ajouter le nouveau message au thread
    const currentThread = currentSession.thread || [];
    const updatedThread = [...currentThread, newMessage];

    // Appliquer la limite d'historique
    const historyLimit = currentSession.history_limit || 10;
    const limitedThread = updatedThread.slice(-historyLimit);

    console.log('[Chat Messages API] 💾 Mise à jour du thread...', {
      ancienThread: currentThread.length,
      nouveauThread: updatedThread.length,
      threadLimité: limitedThread.length,
      limite: historyLimit
    });

    // Mettre à jour la session avec le nouveau thread limité
    const { data: updatedSession, error: updateError } = await userClient
      .from('chat_sessions')
      .update({ 
        thread: limitedThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Chat Messages API] ❌ Erreur mise à jour session:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    console.log('[Chat Messages API] ✅ Message ajouté avec succès');

    return NextResponse.json({
      success: true,
      data: {
        session: updatedSession,
        message: newMessage
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Chat Messages API] ❌ Erreur validation:', error.errors);
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Chat Messages API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// GET /api/v1/chat-sessions/[id]/messages - Récupérer les messages d'une session
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
    }
    
    const userClient = createClient(supabaseUrl!, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    const sessionId = id;

    // Récupérer la session avec son thread
    const { data: session, error } = await userClient
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      console.error('Erreur lors de la récupération des messages:', error);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messages: session.thread || []
      }
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
} 