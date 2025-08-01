import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Utiliser la clé anonyme par défaut, ou la service role si disponible
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Endpoint pour créer une nouvelle session de chat
 * Usage: POST /api/v1/chat-sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'Nouvelle conversation', history_limit = 10 } = body;

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

    // Créer la session dans la base de données
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        name,
        thread: [],
        history_limit,
        is_active: true,
        metadata: { created_via: 'api_endpoint' }
      })
      .select()
      .single();

    if (error) {
      console.error('[Chat Sessions API] ❌ Erreur création session:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session' },
        { status: 500 }
      );
    }

    console.log('[Chat Sessions API] ✅ Session créée:', session.id);

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session créée avec succès'
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
 * Endpoint pour lister les sessions de chat d'un utilisateur
 * Usage: GET /api/v1/chat-sessions
 */
export async function GET(request: NextRequest) {
  try {
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

    // Récupérer les sessions de l'utilisateur
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Chat Sessions API] ❌ Erreur récupération sessions:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des sessions' },
        { status: 500 }
      );
    }

    console.log('[Chat Sessions API] ✅ Sessions récupérées:', sessions.length);

    return NextResponse.json({
      success: true,
      data: sessions,
      message: 'Sessions récupérées avec succès'
    });

  } catch (error) {
    console.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 