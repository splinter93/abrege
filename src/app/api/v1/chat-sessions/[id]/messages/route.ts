import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Schéma de validation pour ajouter un message
const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Le contenu ne peut pas être vide'),
  timestamp: z.string().optional().default(() => new Date().toISOString())
});

// POST /api/v1/chat-sessions/[id]/messages - Ajouter un message à une session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const sessionId = params.id;
    const body = await request.json();
    const validatedData = addMessageSchema.parse(body);

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
      .select('thread')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      console.error('Erreur lors de la récupération de la session:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    // Ajouter le nouveau message au thread
    const updatedThread = [...(currentSession.thread || []), newMessage];

    // Mettre à jour la session avec le nouveau thread
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update({ 
        thread: updatedThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur lors de la mise à jour de la session:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session: updatedSession,
        message: newMessage
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// GET /api/v1/chat-sessions/[id]/messages - Récupérer les messages d'une session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const sessionId = params.id;

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