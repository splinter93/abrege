import { getAuthenticatedUser } from '@/utils/authUtils';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { logApi } from '@/utils/logger';
import { mergeNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_merge',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_merge', `🚀 Début fusion note v2 ${ref}`, context);

  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi(context.operation, `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const sourceNoteId = resolveResult.id;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(mergeNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_merge', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { targetNoteId, mergeStrategy } = validationResult.data;

    // Vérifier que la note source existe
    const { data: sourceNote, error: sourceError } = await supabase
      .from('articles')
      .select('id, markdown_content, source_title, user_id')
      .eq('id', sourceNoteId)
      .single();

    if (sourceError || !sourceNote) {
      logApi('v2_note_merge', `❌ Note source non trouvée: ${sourceNoteId}`, context);
      return NextResponse.json(
        { error: 'Note source non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que la note cible existe
    const { data: targetNote, error: targetError } = await supabase
      .from('articles')
      .select('id, markdown_content, source_title, user_id')
      .eq('id', targetNoteId)
      .single();

    if (targetError || !targetNote) {
      logApi('v2_note_merge', `❌ Note cible non trouvée: ${targetNoteId}`, context);
      return NextResponse.json(
        { error: 'Note cible non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que les notes appartiennent au même utilisateur
    if (sourceNote.user_id !== targetNote.user_id) {
      logApi('v2_note_merge', '❌ Notes appartiennent à des utilisateurs différents', context);
      return NextResponse.json(
        { error: 'Impossible de fusionner des notes de différents utilisateurs' },
        { status: 403 }
      );
    }

    // Préparer le contenu fusionné selon la stratégie
    let mergedContent = '';
    const sourceContent = sourceNote.markdown_content || '';
    const targetContent = targetNote.markdown_content || '';

    switch (mergeStrategy) {
      case 'append':
        mergedContent = targetContent + (targetContent && sourceContent ? '\n\n' : '') + sourceContent;
        break;
      case 'prepend':
        mergedContent = sourceContent + (sourceContent && targetContent ? '\n\n' : '') + targetContent;
        break;
      case 'replace':
        mergedContent = sourceContent;
        break;
      default:
        logApi('v2_note_merge', `❌ Stratégie de fusion invalide: ${mergeStrategy}`, context);
        return NextResponse.json(
          { error: 'Stratégie de fusion invalide' },
          { status: 400 }
        );
    }

    // Mettre à jour la note cible avec le contenu fusionné
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: mergedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetNoteId);

    if (updateError) {
      logApi('v2_note_merge', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la fusion' },
        { status: 500 }
      );
    }

    // Mettre à jour l'insight de la note cible
    await updateArticleInsight(targetNoteId);

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerArticlesPolling('UPDATE');

    // Supprimer la note source
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', sourceNoteId);

    if (deleteError) {
      logApi('v2_note_merge', `❌ Erreur suppression note source: ${deleteError.message}`, context);
      // On continue même si la suppression échoue
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_note_merge', `✅ Note fusionnée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note fusionnée avec succès',
      sourceNoteId,
      targetNoteId
    });

  } catch (error) {
    logApi('v2_note_merge', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 