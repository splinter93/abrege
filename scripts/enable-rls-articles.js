require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableRLSForArticles() {
  try {
    console.log('🔧 Réactivation RLS pour articles...');
    
    // Test d'accès actuel
    console.log('🧪 Test d\'accès actuel aux articles...');
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erreur accès articles:', testError.message);
    } else {
      console.log('✅ Accès articles OK, données:', testData?.length || 0);
    }
    
    // Vérifier l'authentification
    console.log('🔐 Vérification authentification...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Erreur authentification:', authError.message);
    } else if (user) {
      console.log('✅ Utilisateur authentifié:', user.id);
    } else {
      console.log('⚠️ Aucun utilisateur authentifié');
    }
    
    // Test de création d'une note
    console.log('📝 Test création note...');
    const { data: newNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test RLS',
        markdown_content: '# Test',
        user_id: user?.id || '3223651c-5580-4471-affb-b3f4456bd729'
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
    
    console.log('🎯 Diagnostic terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

enableRLSForArticles(); 