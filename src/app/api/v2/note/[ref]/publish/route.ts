import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { publishNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_note_publish',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_publish', `🚀 Début publication note v2 ${ref}`, context);

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
    const validationResult = validatePayload(publishNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_publish', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { ispublished } = validationResult.data;

    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, user_id, slug')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      logApi('v2_note_publish', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour le statut de publication
    const { error: updateError } = await supabase
      .from('articles')
      .update({ ispublished: ispublished })
      .eq('id', noteId);

    if (updateError) {
      logApi('v2_note_publish', `❌ Erreur publication: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la publication' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_publish', `✅ Note publiée en ${apiTime}ms`, context);

    // Générer l'URL publique si publiée
    let publicUrl = null;
    if (ispublished && existingNote.slug) {
      publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${existingNote.user_id}/${existingNote.slug}`;
    }

    return NextResponse.json({
      success: true,
      message: ispublished ? 'Note publiée avec succès' : 'Note dépubliée avec succès',
      noteId,
      ispublished,
      publicUrl
    });

  } catch (error) {
    logApi('v2_note_publish', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 