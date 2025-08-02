import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[Chat Messages API] ❌ Erreur auth:', authError);
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
    } else {
      // Utilisateur de test pour le développement
      userId = '00000000-0000-0000-0000-000000000001';
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

    // Récupérer la session actuelle
    const { data: currentSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('thread, history_limit')
      .eq('id', sessionId)
      .eq('user_id', userId)
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
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update({ 
        thread: limitedThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
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
    
    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const sessionId = id;

    // Récupérer la session avec son thread
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .eq('user_id', user.id)
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