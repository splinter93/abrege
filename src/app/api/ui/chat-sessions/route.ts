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

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
  }
  return key;
};

const createSessionBodySchema = z.object({
  name: z.string().min(1).optional().default('Nouvelle conversation'),
  agent_id: z.string().uuid().nullable().optional().default(null),
});

// Fonction pour créer le client admin
const createSupabaseAdmin = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Endpoint pour créer une nouvelle session de chat
 * Usage: POST /api/ui/chat-sessions
 */
export async function POST(request: NextRequest) {
  try {
    logger.dev('[Chat Sessions API] 📝 Création de session...');
    
    // Vérifier la configuration Supabase
    try {
      getSupabaseConfig();
    } catch (error) {
      logger.error('[Chat Sessions API] ❌ Configuration Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }
    
    logger.dev('[Chat Sessions API] 🔧 URL:', request.url);
    logger.dev('[Chat Sessions API] 🔧 Méthode:', request.method);
    
    // Vérifier l'authentification AVANT de parser le JSON
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      logger.dev('[Chat Sessions API] 🔐 Token JWT détecté');
      
      const supabaseAdmin = createSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error('[Chat Sessions API] ❌ Erreur auth:', authError);
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      logger.dev('[Chat Sessions API] ✅ Utilisateur authentifié:', userId);
    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }
    
    let rawBody: unknown;
    try {
      rawBody = await request.json();
      logger.dev('[Chat Sessions API] 📋 Body brut reçu:', rawBody);
    } catch (error) {
      logger.error('[Chat Sessions API] ❌ Erreur parsing JSON:', error);
      return NextResponse.json(
        { error: 'Données JSON invalides' },
        { status: 400 }
      );
    }

    const parsedBody = createSessionBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Payload invalide',
          details: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const { name, agent_id } = parsedBody.data;

    logger.dev('[Chat Sessions API] 📋 Données reçues:', { name, agent_id });

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const { supabaseUrl } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, getSupabaseAnonKey(), {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Créer la session dans la base de données avec le contexte utilisateur
    logger.dev('[Chat Sessions API] 💾 Insertion en base...');
    logger.dev('[Chat Sessions API] 💾 Données à insérer:', {
      user_id: userId,
      name,
      agent_id,
      is_active: true,
      metadata: { created_via: 'api_endpoint' }
    });
    
    const { data: session, error } = await userClient
      .from('chat_sessions')
      .insert({
        user_id: userId,
        name,
        agent_id,
        is_active: true,
        is_empty: true, // 🔥 Conversation vide par défaut
        metadata: { created_via: 'api_endpoint' }
      })
      .select()
      .single();

    if (error) {
      logger.error('[Chat Sessions API] ❌ Erreur création session:', error);
      logger.error('[Chat Sessions API] ❌ Détails erreur:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session', details: error.message },
        { status: 500 }
      );
    }

    logger.dev('[Chat Sessions API] ✅ Session créée:', session.id);
    logger.dev('[Chat Sessions API] ✅ Session complète:', session);

    const response = {
      success: true,
      data: session,
      message: 'Session créée avec succès'
    };

    logger.dev('[Chat Sessions API] 📤 Réponse envoyée:', response);

    return NextResponse.json(response);

  } catch (error) {
    logger.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint pour lister les sessions de chat d'un utilisateur
 * Usage: GET /api/ui/chat-sessions
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier la configuration Supabase
    try {
      getSupabaseConfig();
    } catch (error) {
      logger.error('[Chat Sessions API] ❌ Configuration Supabase manquante');
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

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const { supabaseUrl } = getSupabaseConfig();
    const userClient = createClient(supabaseUrl, getSupabaseAnonKey(), {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Récupérer les sessions de l'utilisateur avec le contexte utilisateur
    logger.dev('[Chat Sessions API] 🔍 Récupération sessions pour utilisateur:', userId);

    const rawLimit = request.nextUrl.searchParams.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 100;
    const pageLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 100;
    const beforeDate = request.nextUrl.searchParams.get('before_date');

    // Messages chargés séparément via /api/chat/sessions/:id/messages/recent
    let query = userClient
      .from('chat_sessions')
      .select('id, name, agent_id, is_active, is_empty, created_at, updated_at, last_message_at, metadata, user_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(pageLimit + 1);

    if (beforeDate) {
      query = query.lt('last_message_at', beforeDate);
    }

    const { data: sessionsRaw, error } = await query;

    if (error) {
      logger.error('[Chat Sessions API] ❌ Erreur récupération sessions:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des sessions' },
        { status: 500 }
      );
    }

    const rows = sessionsRaw ?? [];
    const hasMore = rows.length > pageLimit;
    const sessionsMetadata = hasMore ? rows.slice(0, pageLimit) : rows;

    logger.dev('[Chat Sessions API] ✅ Sessions récupérées (métadonnées only):', {
      count: sessionsMetadata.length,
      hasMore,
    });

    return NextResponse.json({
      success: true,
      data: sessionsMetadata,
      hasMore,
      message: 'Sessions récupérées avec succès'
    });

  } catch (error) {
    logger.error('[Chat Sessions API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 