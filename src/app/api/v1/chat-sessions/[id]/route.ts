import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Utiliser la clé anonyme par défaut, ou la service role si disponible
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Endpoint pour mettre à jour une session de chat
 * Usage: PUT /api/v1/chat-sessions/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sessionId = id;
    const body = await request.json();
    const { thread, name, history_limit, is_active, metadata } = body;

    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
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

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (thread !== undefined) updateData.thread = thread;
    if (name !== undefined) updateData.name = name;
    if (history_limit !== undefined) updateData.history_limit = history_limit;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Mettre à jour la session dans la base de données
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      console.error('[Chat Sessions API] ❌ Erreur mise à jour session:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    console.log('[Chat Sessions API] ✅ Session mise à jour:', sessionId);

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session mise à jour avec succès'
    });

  } catch (error) {
    console.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint pour récupérer une session de chat spécifique
 * Usage: GET /api/v1/chat-sessions/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sessionId = id;

    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
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

    // Récupérer la session depuis la base de données
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      console.error('[Chat Sessions API] ❌ Erreur récupération session:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    console.log('[Chat Sessions API] ✅ Session récupérée:', sessionId);

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 