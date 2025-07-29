require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLSDirect() {
  try {
    console.log('🔧 Désactivation RLS pour articles...');
    
    // Test de création d'une note avant désactivation
    console.log('📝 Test création note avant désactivation...');
    const { data: testNote, error: testError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test RLS Before',
        markdown_content: '# Test',
        user_id: '3223651c-5580-4471-affb-b3f4456bd729'
      })
      .select();
    
    if (testError) {
      console.log('❌ Erreur création note (RLS actif):', testError.message);
    } else {
      console.log('✅ Note créée (RLS déjà désactivé):', testNote?.[0]?.id);
      
      // Supprimer la note de test
      if (testNote?.[0]?.id) {
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', testNote[0].id);
        
        if (deleteError) {
          console.log('⚠️ Erreur suppression note test:', deleteError.message);
        } else {
          console.log('✅ Note test supprimée');
        }
      }
    }
    
    console.log('🎯 Test terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

disableRLSDirect(); 