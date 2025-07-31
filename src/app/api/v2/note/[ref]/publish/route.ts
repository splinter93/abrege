import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { publishNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
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
    operation: 'v2_note_publish',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_publish', `🚀 Début publication note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_publish', `❌ Authentification échouée: ${authResult.error}`, context);
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
    logApi('v2_note_publish', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_note_publish', `❌ Permissions insuffisantes pour note ${noteId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour publier cette note' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(publishNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_publish', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, user_id, visibility')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      logApi('v2_note_publish', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour la visibilité
    const newVisibility = validatedData.ispublished ? 'public' : 'private';
    
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        visibility: newVisibility,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      logApi('v2_note_publish', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la publication' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_publish', `✅ Note ${validatedData.ispublished ? 'publiée' : 'dépubliée'} en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: validatedData.ispublished ? 'Note publiée avec succès' : 'Note dépubliée avec succès',
      note: updatedNote,
      isPublished: validatedData.ispublished
    });

  } catch (error) {
    logApi('v2_note_publish', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 