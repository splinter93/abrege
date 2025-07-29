require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasseurs() {
  try {
    console.log('🔍 Vérification des classeurs existants...');
    
    // Lister tous les classeurs
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('id, name, slug, user_id')
      .order('created_at', { ascending: false });
    
    if (classeursError) {
      console.log('❌ Erreur lecture classeurs:', classeursError.message);
      return;
    }
    
    console.log('📚 Classeurs trouvés:', classeurs?.length || 0);
    
    if (classeurs && classeurs.length > 0) {
      console.log('📋 Détails des classeurs:');
      classeurs.forEach((classeur, index) => {
        console.log(`  ${index + 1}. ID: ${classeur.id}`);
        console.log(`     Nom: ${classeur.name}`);
        console.log(`     Slug: ${classeur.slug}`);
        console.log(`     User ID: ${classeur.user_id}`);
        console.log('');
      });
      
      // Utiliser le premier classeur pour le test
      const testClasseur = classeurs[0];
      console.log(`🎯 Utilisation du classeur: ${testClasseur.name} (${testClasseur.id})`);
      
      // Test de création avec un classeur_id valide
      console.log('📝 Test création article avec classeur_id valide...');
      const testData = {
        source_title: 'Test Classeur Valide',
        markdown_content: '# Test',
        user_id: testClasseur.user_id,
        classeur_id: testClasseur.id,
        slug: 'test-classeur-valide-' + Date.now(),
        position: 0
      };
      
      console.log('📋 Données de test:', testData);
      
      const { data: createData, error: createError } = await supabase
        .from('articles')
        .insert(testData)
        .select();
      
      if (createError) {
        console.log('❌ Erreur création:', createError.message);
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
    } else {
      console.log('❌ Aucun classeur trouvé');
      console.log('💡 Créez d\'abord un classeur dans l\'interface');
    }
    
    console.log('🎯 Vérification terminée');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkClasseurs(); 