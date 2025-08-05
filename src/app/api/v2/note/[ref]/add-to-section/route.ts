import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { logApi } from '@/utils/logger';
import { addToSectionV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';
import { appendToSection, extractTOCWithSlugs } from '@/utils/markdownTOC';

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
    operation: 'v2_note_add_to_section',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_add_to_section', `🚀 Début ajout contenu à section note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_add_to_section', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

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
    logApi('v2_note_add_to_section', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_note_add_to_section', `❌ Permissions insuffisantes pour note ${noteId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour modifier cette note' },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(addToSectionV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_add_to_section', '❌ Validation échouée', context);
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
      logApi('v2_note_add_to_section', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extraire la table des matières pour vérifier la section
    const toc = extractTOCWithSlugs(currentNote.markdown_content || '');
    logApi('v2_note_add_to_section', `🔍 Sections disponibles:`, toc.map(t => ({ title: t.title, slug: t.slug })), context);
    logApi('v2_note_add_to_section', `🔍 Section recherchée: "${validatedData.sectionId}"`, context);

    // Vérifier si la section existe
    const sectionExists = toc.find(t => t.title === validatedData.sectionId || t.slug === validatedData.sectionId);
    if (!sectionExists) {
      const availableSections = toc.map(t => `"${t.title}" (slug: "${t.slug}")`).join(', ');
      return NextResponse.json(
        { 
          error: `Section "${validatedData.sectionId}" non trouvée. Sections disponibles: ${availableSections}` 
        },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ajouter le contenu à la section
    const newContent = appendToSection(currentNote.markdown_content || '', validatedData.sectionId, validatedData.content, 'end');

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
      logApi('v2_note_add_to_section', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour l'insight
    await updateArticleInsight(noteId);

    // Déclencher le polling côté client
    clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_add_to_section', `✅ Contenu ajouté à la section "${validatedData.sectionId}" en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Contenu ajouté à la section avec succès',
      note: updatedNote
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_add_to_section', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 