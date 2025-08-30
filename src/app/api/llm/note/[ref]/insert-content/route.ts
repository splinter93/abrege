import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { z } from 'zod';
import { updateArticleInsight } from '@/utils/insightUpdater';

// Schéma de validation basé sur la spec OpenAPI
const addContentSchema = z.object({
  content: z.string().optional(), // Optionnel pour erase
  target_section: z.string().optional(),
  position: z.enum(['start', 'end', 'replace', 'erase']).default('end')
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'llm_note_insert_content',
    component: 'API_LLM',
    ref,
    clientType
  };

  logApi.info(`🚀 Début insertion contenu note LLM ${ref}`, context);

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
    // Résoudre la référence (UUID ou slug)
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;

    // Récupérer et valider le body
    const body = await request.json();
    const validationResult = addContentSchema.safeParse(body);
    
    if (!validationResult.success) {
      logApi.info('❌ Validation échouée', context);
      return NextResponse.json(
        { error: 'Paramètres invalides', details: validationResult.error.errors.map(e => e.message) },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { content, target_section, position } = validationResult.data;

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
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let newContent = currentNote.markdown_content;

    // Logique d'insertion selon la position et la cible
    if (target_section) {
      // Opération sur une section spécifique
      newContent = await handleSectionOperation(currentNote.markdown_content, target_section, content, position);
    } else {
      // Opération sur la note entière
      newContent = handleGlobalOperation(currentNote.markdown_content, content, position);
    }

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
    logApi.info(`✅ Contenu inséré en ${apiTime}ms (position: ${position}, section: ${target_section || 'note entière'})`, context);

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

/**
 * Gère les opérations sur une section spécifique
 */
async function handleSectionOperation(
  currentContent: string, 
  targetSection: string, 
  newContent: string | undefined, 
  position: 'start' | 'end' | 'replace' | 'erase'
): Promise<string> {
  const sectionRegex = new RegExp(`(^|\\n)(#+\\s+${escapeRegExp(targetSection)})([\\s\\S]*?)(?=\\n#+\\s|$)`, 'i');
  const match = currentContent.match(sectionRegex);

  if (!match) {
    // Section non trouvée, créer une nouvelle section à la fin
    return currentContent + `\n\n## ${targetSection}\n${newContent || ''}`;
  }

  const [fullMatch, before, header, sectionContent] = match;
  const beforeSection = currentContent.substring(0, currentContent.indexOf(fullMatch));
  const afterSection = currentContent.substring(currentContent.indexOf(fullMatch) + fullMatch.length);

  let newSectionContent = '';
  switch (position) {
    case 'start':
      newSectionContent = `${header}\n${newContent || ''}\n${sectionContent}`;
      break;
    case 'end':
      newSectionContent = `${header}${sectionContent}\n\n${newContent || ''}`;
      break;
    case 'replace':
      newSectionContent = `${header}\n${newContent || ''}`;
      break;
    case 'erase':
      newSectionContent = `${header}\n`;
      break;
  }

  return beforeSection + newSectionContent + afterSection;
}

/**
 * Gère les opérations sur la note entière
 */
function handleGlobalOperation(
  currentContent: string, 
  newContent: string | undefined, 
  position: 'start' | 'end' | 'replace' | 'erase'
): string {
  switch (position) {
    case 'start':
      return `${newContent || ''}\n\n${currentContent}`;
    case 'end':
      return currentContent + `\n\n${newContent || ''}`;
    case 'replace':
      return newContent || '';
    case 'erase':
      return '';
    default:
      return currentContent;
  }
}

/**
 * Échappe les caractères spéciaux pour les regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
