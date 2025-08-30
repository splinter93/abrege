import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { addContentV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { updateArticleInsight } from '@/utils/insightUpdater';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_add_content',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début ajout contenu note v2 ${ref}`, context);

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
  
  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createAuthenticatedSupabaseClient(authResult);

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const noteId = resolveResult.id;

  try {
    const body = await request.json();

    // Validation du payload
    const validationResult = validatePayload(addContentV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult);
    }

    const { content } = validationResult.data;

    // Vérifier que l'utilisateur est propriétaire de la note
    const { data: currentNote, error: checkError } = await supabase
      .from('articles')
      .select('id, markdown_content')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (checkError || !currentNote) {
      logApi.info(`❌ Note non trouvée ou accès refusé: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée ou accès refusé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ajouter le nouveau contenu
    const newContent = currentNote.markdown_content + '\n\n' + content;

    // Mettre à jour la note
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      logApi.error(`❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour l'insight
    try {
      await updateArticleInsight(noteId);
    } catch (insightError) {
      logApi.warn('⚠️ Erreur lors de la mise à jour de l\'insight', context);
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Contenu ajouté en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note: updatedNote
    }, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 