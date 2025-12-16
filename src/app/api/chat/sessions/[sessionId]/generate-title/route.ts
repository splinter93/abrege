/**
 * API Endpoint: POST /api/chat/sessions/[sessionId]/generate-title
 * 
 * Génère automatiquement un titre pour une session de chat via LLM (Groq).
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Validation Zod stricte (0 any)
 * - Vérification auth + ownership session
 * - Gestion erreurs 3 niveaux
 * - Logs structurés
 * - Update atomique DB
 * 
 * Workflow:
 * 1. Valider body avec Zod
 * 2. Extraire et valider JWT token
 * 3. Vérifier ownership session (RLS)
 * 4. Appeler SessionTitleGenerator
 * 5. UPDATE chat_sessions atomiquement
 * 6. Retourner résultat
 * 
 * @returns {TitleGenerationResponse} - Success + titre généré
 * 
 * Codes HTTP:
 * - 200: Titre généré avec succès
 * - 400: Validation body failed
 * - 401: Token manquant/invalide
 * - 403: Ownership refusé
 * - 404: Session introuvable
 * - 500: Erreur serveur (Groq down, DB error)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { getSessionTitleGenerator } from '@/services/chat/SessionTitleGenerator';

// ✅ Validation Zod stricte
const generateTitleRequestSchema = z.object({
  userMessage: z.string().min(1, 'userMessage requis').max(5000, 'Message trop long'),
  agentName: z.string().optional()
});

type GenerateTitleRequest = z.infer<typeof generateTitleRequestSchema>;

interface TitleGenerationResponse {
  success: boolean;
  title?: string;
  error?: string;
  executionTime?: number;
}

/**
 * POST /api/chat/sessions/[sessionId]/generate-title
 * 
 * Génère un titre pour la session via Groq
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<TitleGenerationResponse>> {
  const startTime = Date.now();
  let sessionId: string | undefined;

  try {
    // 1. Extraire sessionId (Next.js 15+ requires await)
    const resolvedParams = await params;
    sessionId = resolvedParams.sessionId;

    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'sessionId requis' },
        { status: 400 }
      );
    }

    logger.info('[API /generate-title] 🎯 Requête reçue', { sessionId });

    // 2. Validation body avec Zod
    const body = await req.json();
    const validation = generateTitleRequestSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[API /generate-title] ❌ Validation failed', {
        sessionId,
        errors: validation.error.flatten().fieldErrors
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed'
        } as TitleGenerationResponse & { details?: unknown },
        { status: 400 }
      );
    }

    const { userMessage, agentName } = validation.data as GenerateTitleRequest;

    // 3. Vérification auth token
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /generate-title] ❌ Token manquant', { sessionId });
      
      return NextResponse.json(
        { success: false, error: 'Token d\'authentification manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 4. Vérifier ownership session avec RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      logger.error('[API /generate-title] ❌ Config Supabase manquante', { sessionId });
      
      return NextResponse.json(
        { success: false, error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    // Client user pour vérifier ownership (RLS activé)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Vérifier que la session existe ET appartient au user
    const { data: session, error: sessionError } = await userClient
      .from('chat_sessions')
      .select('id, user_id, name')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.warn('[API /generate-title] ❌ Session non trouvée ou accès refusé', {
        sessionId,
        error: sessionError?.message
      });

      return NextResponse.json(
        { success: false, error: 'Session non trouvée ou accès refusé' },
        { status: sessionError?.code === 'PGRST116' ? 404 : 403 }
      );
    }

    logger.dev('[API /generate-title] ✅ Ownership vérifié', {
      sessionId,
      userId: session.user_id,
      currentName: session.name
    });

    // 5. Générer le titre via service
    const generator = getSessionTitleGenerator();
    
    const result = await generator.generateTitle({
      sessionId,
      userMessage,
      agentName
    });

    if (!result.success || !result.title) {
      logger.error('[API /generate-title] ❌ Génération titre échouée', {
        sessionId,
        error: result.error,
        executionTime: result.executionTime
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Génération titre échouée',
          executionTime: result.executionTime
        },
        { status: 500 }
      );
    }

    // 6. Update session name atomiquement (avec SERVICE_ROLE pour bypass RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      logger.error('[API /generate-title] ❌ SERVICE_ROLE_KEY manquante', { sessionId });
      
      return NextResponse.json(
        { success: false, error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ✅ IMPORTANT: Utiliser userClient au lieu d'adminClient pour trigger Realtime
    // Realtime peut ne pas détecter les UPDATE avec SERVICE_ROLE (bypass RLS)
    const { error: updateError } = await userClient
      .from('chat_sessions')
      .update({
        name: result.title,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      logger.error('[API /generate-title] ❌ Erreur update DB', {
        sessionId,
        error: updateError.message,
        code: updateError.code
      });

      return NextResponse.json(
        { success: false, error: 'Erreur mise à jour session' },
        { status: 500 }
      );
    }

    const totalTime = Date.now() - startTime;

    logger.info('[API /generate-title] ✅ Titre généré et sauvegardé', {
      sessionId,
      title: result.title,
      generationTime: result.executionTime,
      totalTime,
      shouldTriggerRefresh: true
    });

    // 7. Retourner succès avec flag pour refresh côté client
    return NextResponse.json({
      success: true,
      title: result.title,
      shouldRefresh: true, // ✅ Signal pour que le client rafraîchisse la sidebar
      executionTime: totalTime
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('[API /generate-title] ❌ Erreur inattendue', {
      sessionId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: totalTime
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur interne',
        executionTime: totalTime
      },
      { status: 500 }
    );
  }
}

