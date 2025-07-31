import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { logApi } from '@/utils/logger';
import { updateContentV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_content_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_content_update', `🚀 Début mise à jour contenu note v2 ${ref}`, context);

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

  const noteId = resolveResult.id;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(updateContentV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_content_update', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { content } = validationResult.data;

    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, user_id')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      logApi('v2_note_content_update', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour le contenu
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId);

    if (updateError) {
      logApi('v2_note_content_update', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    // Mettre à jour l'insight
    await updateArticleInsight(noteId);

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_content_update', `✅ Contenu mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Contenu mis à jour avec succès',
      noteId
    });

  } catch (error) {
    logApi('v2_note_content_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 