const { createClient } = require('@supabase/supabase-js');
const { extractTOCWithSlugs } = require('../src/utils/markdownTOC');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Met à jour l'insight d'une note avec la TOC incluse
 */
async function updateArticleInsight(noteId) {
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
      console.log(`✅ Insight mis à jour pour la note ${noteId}`);
    }
  } catch (error) {
    console.error('Erreur dans updateArticleInsight:', error);
  }
}

/**
 * Met à jour l'insight pour toutes les notes
 */
async function updateAllInsights() {
  try {
    console.log('🔄 Récupération de toutes les notes...');
    
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id, source_title')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des notes:', error);
      return;
    }

    console.log(`📝 Mise à jour de l'insight pour ${notes.length} notes...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const note of notes) {
      try {
        await updateArticleInsight(note.id);
        successCount++;
        console.log(`✅ ${successCount}/${notes.length} - ${note.source_title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur pour la note ${note.id}:`, error);
      }
    }

    console.log(`\n🎉 Mise à jour terminée !`);
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    
  } catch (error) {
    console.error('Erreur dans updateAllInsights:', error);
  }
}

// Exécuter le script
if (require.main === module) {
  updateAllInsights();
}

module.exports = { updateArticleInsight, updateAllInsights }; 