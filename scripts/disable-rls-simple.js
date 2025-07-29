require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
  try {
    console.log('🔧 Test RLS pour articles...');
    
    // Test de lecture
    console.log('📖 Test lecture articles...');
    const { data: readData, error: readError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (readError) {
      console.log('❌ Erreur lecture:', readError.message);
    } else {
      console.log('✅ Lecture OK, articles trouvés:', readData?.length || 0);
    }
    
    // Test de création
    console.log('📝 Test création article...');
    const { data: createData, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test RLS Simple',
        markdown_content: '# Test',
        user_id: '3223651c-5580-4471-affb-b3f4456bd729',
        classeur_id: '3223651c-5580-4471-affb-b3f4456bd729' // Ajout d'un classeur_id
      })
      .select();
    
    if (createError) {
      console.log('❌ Erreur création:', createError.message);
      
      // Essayer de comprendre l'erreur
      if (createError.message.includes('row-level security')) {
        console.log('🔍 Le problème est bien RLS');
        console.log('💡 Solutions possibles:');
        console.log('   1. Désactiver RLS sur la table articles');
        console.log('   2. Modifier les politiques RLS pour être plus permissives');
        console.log('   3. Utiliser une service role key');
      }
    } else {
      console.log('✅ Création OK:', createData?.[0]?.id);
      
      // Supprimer la note de test
      if (createData?.[0]?.id) {
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', createData[0].id);
        
        if (deleteError) {
          console.log('⚠️ Erreur suppression:', deleteError.message);
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

testRLS(); 