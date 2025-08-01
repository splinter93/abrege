import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { logApi } from '@/utils/logger';
import { mergeNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_merge',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_merge', `🚀 Début fusion note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_merge', `❌ Authentification échouée: ${authResult.error}`, context);
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

  const noteId = resolveResult.id;

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(noteId, 'article', 'editor', userId, context);
  if (!permissionResult.success) {
    logApi('v2_note_merge', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_note_merge', `❌ Permissions insuffisantes pour note ${noteId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour fusionner cette note' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(mergeNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_merge', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Vérifier que la note source existe
    const { data: sourceNote, error: sourceError } = await supabase
      .from('articles')
      .select('id, markdown_content, source_title')
      .eq('id', noteId)
      .single();

    if (sourceError || !sourceNote) {
      logApi('v2_note_merge', `❌ Note source non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note source non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que la note cible existe
    const { data: targetNote, error: targetError } = await supabase
      .from('articles')
      .select('id, markdown_content, source_title')
      .eq('id', validatedData.targetNoteId)
      .single();

    if (targetError || !targetNote) {
      logApi('v2_note_merge', `❌ Note cible non trouvée: ${validatedData.targetNoteId}`, context);
      return NextResponse.json(
        { error: 'Note cible non trouvée' },
        { status: 404 }
      );
    }

    // Fusionner selon la stratégie
    let mergedContent = '';
    switch (validatedData.mergeStrategy) {
      case 'append':
        mergedContent = targetNote.markdown_content + '\n\n' + sourceNote.markdown_content;
        break;
      case 'prepend':
        mergedContent = sourceNote.markdown_content + '\n\n' + targetNote.markdown_content;
        break;
      case 'replace':
        mergedContent = sourceNote.markdown_content;
        break;
      default:
        return NextResponse.json(
          { error: 'Stratégie de fusion invalide' },
          { status: 400 }
        );
    }

    // Mettre à jour la note cible
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: mergedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.targetNoteId)
      .select()
      .single();

    if (updateError) {
      logApi('v2_note_merge', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la fusion' },
        { status: 500 }
      );
    }

    // Supprimer la note source
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      logApi('v2_note_merge', `❌ Erreur suppression note source: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la note source' },
        { status: 500 }
      );
    }

    // Mettre à jour l'insight de la note cible
    await updateArticleInsight(validatedData.targetNoteId);

    // Déclencher le polling côté client
    clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_merge', `✅ Notes fusionnées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Notes fusionnées avec succès',
      mergedNote: updatedNote,
      deletedNoteId: noteId
    });

  } catch (error) {
    logApi('v2_note_merge', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 