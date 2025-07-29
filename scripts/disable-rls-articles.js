require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLSForArticles() {
  try {
    console.log('🔧 Désactivation RLS pour articles...');
    
    // Désactiver RLS sur la table articles
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.articles DISABLE ROW LEVEL SECURITY;'
    });
    
    if (error) {
      console.error('❌ Erreur désactivation RLS:', error);
      return;
    }
    
    console.log('✅ RLS désactivé sur la table articles');
    
    // Test de création d'une note
    console.log('📝 Test création note...');
    const { data: newNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test RLS Disabled',
        markdown_content: '# Test',
        user_id: '3223651c-5580-4471-affb-b3f4456bd729'
      })
      .select();
    
    if (createError) {
      console.log('❌ Erreur création note:', createError.message);
    } else {
      console.log('✅ Note créée:', newNote?.[0]?.id);
      
      // Supprimer la note de test
      if (newNote?.[0]?.id) {
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', newNote[0].id);
        
        if (deleteError) {
          console.log('⚠️ Erreur suppression note test:', deleteError.message);
        } else {
          console.log('✅ Note test supprimée');
        }
      }
    }
    
    console.log('🎯 RLS désactivé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

disableRLSForArticles(); 