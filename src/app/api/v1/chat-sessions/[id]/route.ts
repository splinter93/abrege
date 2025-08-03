import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ChatMessage } from '../../../../../types/chat';

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
    const updateData: {
      updated_at: string;
      thread?: ChatMessage[];
      name?: string;
      history_limit?: number;
      is_active?: boolean;
      metadata?: Record<string, unknown>;
    } = {
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

/**
 * Endpoint pour supprimer une session de chat
 * Usage: DELETE /api/v1/chat-sessions/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sessionId = id;
    
    console.log('[Chat Sessions API] 🗑️ Suppression de session:', sessionId);
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[Chat Sessions API] ❌ Erreur auth:', authError);
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      
      // Créer un client avec le contexte d'authentification de l'utilisateur
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
      }
      
      const userClient = createClient(supabaseUrl!, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });

      // Vérifier que la session appartient à l'utilisateur avec le contexte utilisateur
      const { data: existingSession, error: fetchError } = await userClient
        .from('chat_sessions')
        .select('id, user_id')
        .eq('id', sessionId)
        .single();

      if (fetchError || !existingSession) {
        console.error('[Chat Sessions API] ❌ Session non trouvée:', fetchError);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }

      if (existingSession.user_id !== userId) {
        console.error('[Chat Sessions API] ❌ Accès non autorisé');
        return NextResponse.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        );
      }

      // Supprimer la session avec le contexte utilisateur
      const { error: deleteError } = await userClient
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) {
        console.error('[Chat Sessions API] ❌ Erreur suppression:', deleteError);
        return NextResponse.json(
          { error: 'Erreur lors de la suppression de la session', details: deleteError.message },
          { status: 500 }
        );
      }

      console.log('[Chat Sessions API] ✅ Session supprimée:', sessionId);

      return NextResponse.json({
        success: true,
        message: 'Session supprimée avec succès'
      });

    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 

/**
 * Endpoint pour mettre à jour une session de chat
 * Usage: PATCH /api/v1/chat-sessions/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sessionId = id;
    
    console.log('[Chat Sessions API] 🔧 Mise à jour de session:', sessionId);
    const body = await request.json();
    const { history_limit } = body;
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[Chat Sessions API] ❌ Erreur auth:', authError);
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

    // Vérifier que la session appartient à l'utilisateur
    const { data: existingSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id, user_id, thread')
      .eq('id', sessionId)
      .single();

    if (fetchError || !existingSession) {
      console.error('[Chat Sessions API] ❌ Session non trouvée:', fetchError);
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    if (existingSession.user_id !== userId) {
      console.error('[Chat Sessions API] ❌ Accès non autorisé');
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (history_limit !== undefined) {
      updateData.history_limit = history_limit;
      
      // Appliquer la nouvelle limite au thread existant
      if (existingSession.thread && existingSession.thread.length > history_limit) {
        const limitedThread = existingSession.thread.slice(-history_limit);
        updateData.thread = limitedThread;
        console.log('[Chat Sessions API] 🔧 Thread limité:', {
          ancien: existingSession.thread.length,
          nouveau: limitedThread.length,
          limite: history_limit
        });
      }
    }

    // Mettre à jour la session
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[Chat Sessions API] ❌ Erreur mise à jour:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[Chat Sessions API] ✅ Session mise à jour:', sessionId);

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: 'Session mise à jour avec succès'
    });

  } catch (error) {
    console.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 