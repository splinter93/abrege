#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLSFix() {
  try {
    console.log('🔍 TEST DES POLITIQUES RLS APRÈS CORRECTION');
    console.log('============================================\n');
    
    // 1. Test de base - doit fonctionner maintenant
    console.log('📊 Test 1: Accès de base aux articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, source_title, user_id, share_settings')
      .limit(3);
    
    if (articlesError) {
      console.log(`❌ Erreur accès articles: ${articlesError.message}`);
      console.log(`   Code: ${articlesError.code}`);
      console.log(`   Détails: ${articlesError.details}`);
    } else {
      console.log(`✅ Accès articles réussi: ${articles?.length || 0} articles trouvés`);
      articles?.forEach((article, index) => {
        console.log(`   ${index + 1}. ID: ${article.id} | Titre: "${article.source_title}" | User: ${article.user_id}`);
      });
    }
    
    // 2. Test des politiques SELECT
    console.log('\n🔒 Test 2: Vérification des politiques SELECT...');
    
    try {
      // Test de lecture simple
      const { data: selectTest, error: selectError } = await supabase
        .from('articles')
        .select('id, source_title')
        .limit(1);
      
      if (selectError) {
        console.log(`❌ Erreur politique SELECT: ${selectError.message}`);
      } else {
        console.log(`✅ Politique SELECT fonctionnelle: ${selectTest?.length || 0} articles lus`);
      }
    } catch (selectErr) {
      console.log(`❌ Exception politique SELECT: ${selectErr.message}`);
    }
    
    // 3. Test des autres tables
    console.log('\n📁 Test 3: Vérification des autres tables...');
    
    // Test folders
    try {
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, user_id')
        .limit(2);
      
      if (foldersError) {
        console.log(`❌ Erreur accès folders: ${foldersError.message}`);
      } else {
        console.log(`✅ Accès folders réussi: ${folders?.length || 0} dossiers trouvés`);
      }
    } catch (foldersErr) {
      console.log(`❌ Exception accès folders: ${foldersErr.message}`);
    }
    
    // Test classeurs
    try {
      const { data: classeurs, error: classeursError } = await supabase
        .from('classeurs')
        .select('id, name, user_id')
        .limit(2);
      
      if (classeursError) {
        console.log(`❌ Erreur accès classeurs: ${classeursError.message}`);
      } else {
        console.log(`✅ Accès classeurs réussi: ${classeurs?.length || 0} classeurs trouvés`);
      }
    } catch (classeursErr) {
      console.log(`❌ Exception accès classeurs: ${classeursErr.message}`);
    }
    
    // 4. Test de la fonction checkUserPermission (simulation)
    console.log('\n🧪 Test 4: Simulation de checkUserPermission...');
    
    if (articles && articles.length > 0) {
      const testArticle = articles[0];
      console.log(`📝 Test avec l'article: "${testArticle.source_title}" (${testArticle.id})`);
      
      try {
        // Simuler la requête de checkUserPermission
        const { data: permissionTest, error: permissionError } = await supabase
          .from('articles')
          .select('user_id')
          .eq('id', testArticle.id)
          .single();
        
        if (permissionError) {
          console.log(`❌ Erreur simulation checkUserPermission: ${permissionError.message}`);
        } else {
          console.log(`✅ Simulation checkUserPermission réussie: user_id = ${permissionTest.user_id}`);
        }
      } catch (permissionErr) {
        console.log(`❌ Exception simulation checkUserPermission: ${permissionErr.message}`);
      }
    }
    
    // 5. Résumé et recommandations
    console.log('\n📋 RÉSUMÉ DES TESTS RLS');
    console.log('=========================');
    
    const hasArticles = articles && articles.length > 0;
    const hasFolders = true; // À vérifier selon les résultats
    const hasClasseurs = true; // À vérifier selon les résultats
    
    if (hasArticles) {
      console.log('✅ Politiques RLS articles: FONCTIONNELLES');
    } else {
      console.log('❌ Politiques RLS articles: PROBLÉMATIQUES');
    }
    
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (hasArticles) {
      console.log('✅ Les politiques RLS semblent fonctionner');
      console.log('🔧 Testez maintenant l\'éditeur pour vérifier que l\'erreur "Article non trouvé" est résolue');
      console.log('📝 Ouvrez une note et essayez de modifier les paramètres de partage');
    } else {
      console.log('❌ Les politiques RLS ont encore des problèmes');
      console.log('🔧 Vérifiez dans Supabase Dashboard que les nouvelles politiques sont actives');
      console.log('📝 Vérifiez que les anciennes politiques ont été supprimées');
    }
    
    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Tester l\'éditeur dans l\'interface web');
    console.log('2. Vérifier que la modification du partage fonctionne');
    console.log('3. Confirmer que l\'erreur "Article non trouvé" est résolue');
    
  } catch (error) {
    console.error('❌ Erreur lors du test RLS:', error);
  }
}

// Exécuter le test
testRLSFix().catch(console.error); 