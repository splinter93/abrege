import { getAuthenticatedUser } from '@/utils/authUtils';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { moveNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_note_move',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_move', `🚀 Début déplacement note v2 ${ref}`, context);

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
    const validationResult = validatePayload(moveNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_move', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { folder_id } = validationResult.data;

    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, user_id, folder_id')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      logApi('v2_note_move', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que le dossier de destination existe (si spécifié)
    if (folder_id) {
      const { data: targetFolder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folder_id)
        .single();

      if (folderError || !targetFolder) {
        logApi('v2_note_move', `❌ Dossier de destination non trouvé: ${folder_id}`, context);
        return NextResponse.json(
          { error: 'Dossier de destination non trouvé' },
          { status: 404 }
        );
      }
    }

    // Déplacer la note
    const { error: moveError } = await supabase
      .from('articles')
      .update({ folder_id: folder_id })
      .eq('id', noteId);

    if (moveError) {
      logApi('v2_note_move', `❌ Erreur déplacement: ${moveError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors du déplacement' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_move', `✅ Note déplacée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note déplacée avec succès',
      noteId
    });

  } catch (error) {
    logApi('v2_note_move', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 