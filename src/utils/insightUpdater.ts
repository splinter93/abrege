import { createClient } from '@supabase/supabase-js';
import { extractTOCWithSlugs } from './markdownTOC';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Met à jour la colonne insight d'une note avec la TOC incluse
 * @param noteId - ID de la note à mettre à jour
 */
export async function updateArticleInsight(noteId: string): Promise<void> {
  try {
    // Récupérer la note complète
    const { data: note, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error || !note) {
      console.error('Erreur lors de la récupération de la note:', error);
      return;
    }

    // Extraire la TOC du markdown
    const toc = extractTOCWithSlugs(note.markdown_content || '');
    const tocText = toc.map(item => item.title).join(' ');

    // Construire l'insight avec TOC
    const insight = [
      note.source_title,
      note.description,
      note.tags?.join(' '),
      note.slug,
      note.id,
      tocText
    ].filter(Boolean).join(' ');

    // Mettre à jour la colonne insight
    const { error: updateError } = await supabase
      .from('articles')
      .update({ insight })
      .eq('id', noteId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour de insight:', updateError);
    } else {
      console.log(`Insight mis à jour pour la note ${noteId}`);
    }
  } catch (error) {
    console.error('Erreur dans updateArticleInsight:', error);
  }
}

/**
 * Met à jour l'insight pour toutes les notes d'un utilisateur
 * @param userId - ID de l'utilisateur
 */
export async function updateAllUserInsights(userId: string): Promise<void> {
  try {
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la récupération des notes:', error);
      return;
    }

    console.log(`Mise à jour de l'insight pour ${notes.length} notes...`);
    
    for (const note of notes) {
      await updateArticleInsight(note.id);
    }

    console.log('Mise à jour terminée');
  } catch (error) {
    console.error('Erreur dans updateAllUserInsights:', error);
  }
} 