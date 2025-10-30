/**
 * API Batch pour charger plusieurs notes en une seule requête
 * Optimisation performance : N requêtes → 1 requête
 * 
 * POST /api/v2/notes/batch
 * Body: { noteIds: ['uuid1', 'uuid2', 'uuid3'] }
 * Response: { success: true, notes: [...] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/notes/batch
 * Charge plusieurs notes en une seule requête
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_notes_batch',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début batch chargement notes v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // Parse body
    const body = await request.json();
    const { noteIds } = body;

    // Validation
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      logApi.info('❌ noteIds manquant ou invalide', context);
      return NextResponse.json(
        { error: 'noteIds requis (array non-vide)' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Limite raisonnable (éviter abus)
    if (noteIds.length > 20) {
      logApi.info(`❌ Trop de notes demandées: ${noteIds.length}`, context);
      return NextResponse.json(
        { error: 'Maximum 20 notes par requête' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`📥 Chargement batch de ${noteIds.length} note(s)`, context);

    // Client Supabase authentifié
    const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // ✅ 1 SEULE requête Supabase pour toutes les notes
    const { data: notes, error: fetchError } = await supabase
      .from('articles')
      .select('id, slug, source_title, markdown_content, updated_at, created_at')
      .in('id', noteIds)
      .eq('user_id', userId)
      .is('trashed_at', null);

    if (fetchError) {
      logApi.info(`❌ Erreur Supabase: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors du chargement des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format réponse (notes déjà au bon format)
    const formattedNotes = (notes || []).map(note => ({
      id: note.id,
      slug: note.slug,
      title: note.source_title || 'Sans titre',
      markdown_content: note.markdown_content || '',
      updated_at: note.updated_at,
      created_at: note.created_at
    }));

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${formattedNotes.length}/${noteIds.length} notes chargées en ${apiTime}ms`, context);

    // Warning si certaines notes manquantes (non trouvées ou pas accès)
    if (formattedNotes.length < noteIds.length) {
      logApi.info(`⚠️ ${noteIds.length - formattedNotes.length} note(s) non accessible(s)`, context);
    }

    return NextResponse.json({
      success: true,
      notes: formattedNotes,
      stats: {
        requested: noteIds.length,
        loaded: formattedNotes.length,
        failed: noteIds.length - formattedNotes.length
      }
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error.message}`, context);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error.message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

