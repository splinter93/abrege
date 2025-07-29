require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceDisableRLS() {
  try {
    console.log('🔧 Diagnostic RLS forcé...');
    
    // 1. Test de lecture pour vérifier les permissions
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
    
    // 2. Test de création avec plus de détails
    console.log('📝 Test création article détaillé...');
    const testData = {
      source_title: 'Test Force RLS',
      markdown_content: '# Test',
      user_id: '3223651c-5580-4471-affb-b3f4456bd729',
      classeur_id: '3223651c-5580-4471-affb-b3f4456bd729',
      slug: 'test-force-rls-' + Date.now(),
      position: 0
    };
    
    console.log('📋 Données de test:', testData);
    
    const { data: createData, error: createError } = await supabase
      .from('articles')
      .insert(testData)
      .select();
    
    if (createError) {
      console.log('❌ Erreur création détaillée:', {
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint
      });
      
      // 3. Essayer de comprendre le problème
      if (createError.code === '42501') {
        console.log('🔍 Code 42501 = Permission denied');
        console.log('💡 Solutions possibles:');
        console.log('   1. Redémarrer le serveur Next.js');
        console.log('   2. Vérifier que RLS est vraiment désactivé dans le dashboard');
        console.log('   3. Attendre quelques minutes pour la propagation');
        console.log('   4. Utiliser une service role key');
        console.log('   5. Supprimer toutes les politiques RLS manuellement');
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
    
    console.log('🎯 Diagnostic terminé');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

forceDisableRLS(); 