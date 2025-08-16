#!/usr/bin/env node

/**
 * Diagnostic des permissions et de l'état des notes
 * Pour identifier pourquoi certaines notes ne sont pas accessibles
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🔍 Diagnostic des permissions et notes');
console.log('=====================================');
console.log(`🌐 URL Supabase: ${supabaseUrl}`);
console.log(`🔑 Clé anonyme: ${supabaseAnonKey ? '✅ Présente' : '❌ Manquante'}`);

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnosticNotes() {
  try {
    console.log('\n📊 Vérification de la base de données...');
    
    // 1. Vérifier la connexion
    const { data: testData, error: testError } = await supabase
      .from('classeurs')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erreur de connexion à Supabase:', testError.message);
      return;
    }
    
    console.log('✅ Connexion à Supabase réussie');
    
    // 2. Compter les ressources
    const [classeursCount, foldersCount, articlesCount] = await Promise.all([
      supabase.from('classeurs').select('id', { count: 'exact' }),
      supabase.from('folders').select('id', { count: 'exact' }),
      supabase.from('articles').select('id', { count: 'exact' })
    ]);
    
    console.log(`📚 Classeurs: ${classeursCount.count || 0}`);
    console.log(`📁 Dossiers: ${foldersCount.count || 0}`);
    console.log(`📝 Articles: ${articlesCount.count || 0}`);
    
    // 3. Vérifier la structure des articles
    console.log('\n🔍 Structure des articles...');
    const { data: sampleArticle, error: articleError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content, html_content, image_url, folder_id, classeur_id, user_id, visibility')
      .limit(1);
    
    if (articleError) {
      console.log('❌ Erreur récupération article:', articleError.message);
    } else if (sampleArticle && sampleArticle.length > 0) {
      const article = sampleArticle[0];
      console.log('📝 Exemple d\'article:');
      console.log(`  - ID: ${article.id}`);
      console.log(`  - Titre: ${article.source_title}`);
      console.log(`  - Markdown: ${article.markdown_content ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`  - HTML: ${article.html_content ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`  - Image: ${article.image_url ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`  - Folder ID: ${article.folder_id || 'Racine'}`);
      console.log(`  - Classeur ID: ${article.classeur_id}`);
      console.log(`  - User ID: ${article.user_id}`);
      console.log(`  - Visibilité: ${article.visibility}`);
    }
    
    // 4. Vérifier les permissions
    console.log('\n🔐 Vérification des permissions...');
    const { data: permissions, error: permError } = await supabase
      .from('article_permissions')
      .select('*')
      .limit(5);
    
    if (permError) {
      console.log('⚠️ Table permissions non trouvée ou erreur:', permError.message);
    } else {
      console.log(`✅ ${permissions?.length || 0} permissions trouvées`);
    }
    
    // 5. Vérifier la note problématique
    const problematicNoteId = '2476cb56-ad8d-4617-b6ec-9b09bb9d6a27';
    console.log(`\n🎯 Vérification de la note problématique: ${problematicNoteId}`);
    
    const { data: problematicNote, error: probError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', problematicNoteId)
      .single();
    
    if (probError) {
      console.log('❌ Note non trouvée dans la base:', probError.message);
    } else {
      console.log('✅ Note trouvée:');
      console.log(`  - Titre: ${problematicNote.source_title}`);
      console.log(`  - User ID: ${problematicNote.user_id}`);
      console.log(`  - Classeur ID: ${problematicNote.classeur_id}`);
      console.log(`  - Visibilité: ${problematicNote.visibility}`);
    }
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le diagnostic
diagnosticNotes().then(() => {
  console.log('\n🏁 Diagnostic terminé');
  console.log('\n💡 Recommandations:');
  console.log('   1. Vérifie que les variables d\'environnement sont correctes');
  console.log('   2. Vérifie que la base de données contient des données');
  console.log('   3. Vérifie que les permissions sont correctement configurées');
  console.log('   4. Teste l\'API tree dans le navigateur après connexion');
  
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 