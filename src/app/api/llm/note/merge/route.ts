import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { z } from 'zod';

// Schéma de validation basé sur la spec
const mergeNotesSchema = z.object({
  note_ids: z.array(z.string()).min(2, 'Au moins 2 notes requises pour la fusion'),
  title: z.string().optional(),
  classeur_id: z.string().uuid('classeur_id doit être un UUID valide'),
  folder_id: z.string().uuid('folder_id doit être un UUID valide').optional()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'llm_note_merge',
    component: 'API_LLM',
    clientType
  };

  logApi.info('🚀 Début fusion de notes LLM', context);

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
  const supabase = createAuthenticatedSupabaseClient(authResult);

  try {
    // Récupérer et valider le body
    const body = await request.json();
    const validationResult = mergeNotesSchema.safeParse(body);
    
    if (!validationResult.success) {
      logApi.info('❌ Validation échouée', context);
      return NextResponse.json(
        { error: 'Paramètres invalides', details: validationResult.error.errors.map(e => e.message) },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { note_ids, title, classeur_id, folder_id } = validationResult.data;

    // Vérifier que l'utilisateur a accès au classeur
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id')
      .eq('id', classeur_id)
      .eq('user_id', userId)
      .single();

    if (classeurError || !classeur) {
      logApi.info(`❌ Classeur non trouvé ou accès refusé: ${classeur_id}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé ou accès refusé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur a accès au folder si spécifié
    if (folder_id) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folder_id)
        .eq('classeur_id', classeur_id)
        .eq('user_id', userId)
        .single();

      if (folderError || !folder) {
        logApi.info(`❌ Folder non trouvé ou accès refusé: ${folder_id}`, context);
        return NextResponse.json(
          { error: 'Folder non trouvé ou accès refusé' },
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Récupérer toutes les notes à fusionner
    const notesToMerge: any[] = [];
    for (const noteRef of note_ids) {
      const resolveResult = await V2ResourceResolver.resolveRef(noteRef, 'note', userId, context);
      if (!resolveResult.success) {
        return NextResponse.json(
          { error: `Note non trouvée: ${noteRef}` },
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data: note, error: noteError } = await supabase
        .from('articles')
        .select('id, source_title, markdown_content, created_at')
        .eq('id', resolveResult.id)
        .eq('user_id', userId)
        .single();

      if (noteError || !note) {
        return NextResponse.json(
          { error: `Note non trouvée ou accès refusé: ${noteRef}` },
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      notesToMerge.push(note);
    }

    // Générer le titre par défaut si non fourni
    const finalTitle = title || `Fusion Note - ${new Date().toLocaleDateString('fr-FR')}`;

    // Fusionner le contenu des notes dans l'ordre
    const mergedContent = notesToMerge
      .map((note, index) => {
        const separator = index === 0 ? '' : '\n\n---\n\n';
        return `${separator}## ${note.source_title}\n\n${note.markdown_content}`;
      })
      .join('');

    // Créer la nouvelle note fusionnée
    const { data: newNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: finalTitle,
        markdown_content: mergedContent,
        user_id: userId,
        classeur_id: classeur_id,
        folder_id: folder_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      logApi.error(`❌ Erreur création note fusionnée: ${createError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la note fusionnée' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${notesToMerge.length} notes fusionnées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note: newNote,
      merged_notes_count: notesToMerge.length
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
