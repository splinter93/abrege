import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

// Configuration Supabase - Vérification différée pour éviter les erreurs de build
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configuration Supabase manquante');
  }

  return { supabaseUrl, supabaseKey };
};

// Fonction pour créer le client admin
const createSupabaseAdmin = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseKey);
};

// Schéma de validation pour mettre à jour une session
const updateSessionSchema = z.object({
  name: z.string().min(1, 'Le nom ne peut pas être vide').max(255, 'Le nom est trop long').optional(),
  history_limit: z.number().int().min(1).max(200).optional()
});

/**
 * Endpoint pour mettre à jour une session de chat
 * Usage: PUT /api/ui/chat-sessions/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.dev('[Chat Session API] 📝 Mise à jour de session:', id);
    
    // Vérifier la configuration Supabase
    try {
      getSupabaseConfig();
    } catch (error) {
      logger.error('[Chat Session API] ❌ Configuration Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      const supabaseAdmin = createSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error('[Chat Session API] ❌ Erreur auth:', authError);
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
    const validatedData = updateSessionSchema.parse(body);

    logger.dev('[Chat Session API] 📋 Données reçues:', validatedData);

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const { supabaseUrl } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Vérifier que la session existe et appartient à l'utilisateur
    const { data: existingSession, error: fetchError } = await userClient
      .from('chat_sessions')
      .select('id, name, history_limit')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.error('[Chat Session API] ❌ Session non trouvée:', sessionId);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      logger.error('[Chat Session API] ❌ Erreur récupération session:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    // Construire dynamiquement les champs à mettre à jour
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof validatedData.name === 'string' && validatedData.name.trim().length > 0) {
      updatePayload.name = validatedData.name.trim();
    }
    if (typeof validatedData.history_limit === 'number') {
      updatePayload.history_limit = validatedData.history_limit;
    }

    if (Object.keys(updatePayload).length === 1) { // uniquement updated_at
      logger.dev('[Chat Session API] ℹ️ Aucun champ pertinent à mettre à jour');
      return NextResponse.json({ success: true, data: existingSession });
    }

    // Mettre à jour la session (nom et/ou history_limit)
    const { data: updatedSession, error: updateError } = await userClient
      .from('chat_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      logger.error('[Chat Session API] ❌ Erreur mise à jour session:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    logger.dev('[Chat Session API] ✅ Session renommée avec succès');

    return NextResponse.json({
      success: true,
      data: updatedSession
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('[Chat Session API] ❌ Erreur validation:', error.errors);
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('[Chat Session API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint pour récupérer une session de chat
 * Usage: GET /api/ui/chat-sessions/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.dev('[Chat Session API] 📖 Récupération de session:', id);
    
    // Vérifier la configuration Supabase
    try {
      getSupabaseConfig();
    } catch (error) {
      logger.error('[Chat Session API] ❌ Configuration Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      const supabaseAdmin = createSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error('[Chat Session API] ❌ Erreur auth:', authError);
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

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const { supabaseUrl } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Récupérer la session avec le contexte utilisateur
    const { data: session, error } = await userClient
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.error('[Chat Session API] ❌ Session non trouvée:', sessionId);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      logger.error('[Chat Session API] ❌ Erreur récupération session:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    logger.dev('[Chat Session API] ✅ Session récupérée:', session.id);

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('[Chat Session API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint pour supprimer une session de chat
 * Usage: DELETE /api/ui/chat-sessions/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.dev('[Chat Session API] 🗑️ Suppression de session:', id);
    
    // Vérifier la configuration Supabase
    try {
      getSupabaseConfig();
    } catch (error) {
      logger.error('[Chat Session API] ❌ Configuration Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      const supabaseAdmin = createSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error('[Chat Session API] ❌ Erreur auth:', authError);
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

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const { supabaseUrl } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Vérifier que la session existe et appartient à l'utilisateur
    const { data: existingSession, error: fetchError } = await userClient
      .from('chat_sessions')
      .select('id, name')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.error('[Chat Session API] ❌ Session non trouvée:', sessionId);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      logger.error('[Chat Session API] ❌ Erreur récupération session:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    // Supprimer la session (soft delete en marquant comme inactive)
    const { error: deleteError } = await userClient
      .from('chat_sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (deleteError) {
      logger.error('[Chat Session API] ❌ Erreur suppression session:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la session' },
        { status: 500 }
      );
    }

    logger.dev('[Chat Session API] ✅ Session supprimée avec succès');

    return NextResponse.json({
      success: true,
      message: 'Session supprimée avec succès'
    });

  } catch (error) {
    logger.error('[Chat Session API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint pour ajouter un message à une session de chat
 * Usage: PATCH /api/ui/chat-sessions/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.dev('[Chat Session API] 💬 Ajout de message à la session:', id);
    
    // Vérifier la configuration Supabase
    try {
      getSupabaseConfig();
    } catch (error) {
      logger.error('[Chat Session API] ❌ Configuration Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      const supabaseAdmin = createSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error('[Chat Session API] ❌ Erreur auth:', authError);
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
    const { message } = body;

    if (!message || typeof message !== 'object') {
      return NextResponse.json(
        { error: 'Message invalide' },
        { status: 400 }
      );
    }

    logger.dev('[Chat Session API] 📋 Message reçu:', message);

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const { supabaseUrl } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Récupérer la session actuelle
    const { data: currentSession, error: fetchError } = await userClient
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.error('[Chat Session API] ❌ Session non trouvée:', sessionId);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      logger.error('[Chat Session API] ❌ Erreur récupération session:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    // Ajouter le message au thread
    const updatedThread = [...(currentSession.thread || []), message];

    // Mettre à jour la session avec le nouveau message
    const { data: updatedSession, error: updateError } = await userClient
      .from('chat_sessions')
      .update({ 
        thread: updatedThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      logger.error('[Chat Session API] ❌ Erreur mise à jour session:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    logger.dev('[Chat Session API] ✅ Message ajouté avec succès');

    return NextResponse.json({
      success: true,
      data: updatedSession
    });

  } catch (error) {
    logger.error('[Chat Session API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
} 