import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { addContentV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { updateArticleInsight } from '@/utils/insightUpdater';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  // 🔐 Authentification simplifiée
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
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const noteId = resolveResult.id;

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(noteId, 'article', 'editor', userId, context);
  if (!permissionResult.success) {
    logApi.info(`❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi.info(`❌ Permissions insuffisantes pour note ${noteId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour modifier cette note' },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(addContentV2Schema, body);
    if (!validationResult.success) {
      logApi.info('❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Récupérer le contenu actuel
    const { data: currentNote, error: fetchError } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();

    if (fetchError || !currentNote) {
      logApi.info(`❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ajouter le nouveau contenu
    const newContent = currentNote.markdown_content + '\n\n' + validatedData.content;

    // Mettre à jour la note
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      logApi.info(`❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour l'insight
    await updateArticleInsight(noteId);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Contenu ajouté en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Contenu ajouté avec succès',
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