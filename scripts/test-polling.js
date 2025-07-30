require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPolling() {
  try {
    console.log('🧪 Test du système de polling...');
    
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    // Test 1: Vérifier l'accès aux tables
    console.log('\n📊 Test accès aux tables...');
    
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', USER_ID)
      .limit(5);
    
    if (articlesError) {
      console.error('❌ Erreur accès articles:', articlesError.message);
    } else {
      console.log('✅ Accès articles OK, données:', articles?.length || 0);
    }
    
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', USER_ID)
      .limit(5);
    
    if (foldersError) {
      console.error('❌ Erreur accès folders:', foldersError.message);
    } else {
      console.log('✅ Accès folders OK, données:', folders?.length || 0);
    }
    
    // Test 2: Vérifier les timestamps
    console.log('\n⏰ Test des timestamps...');
    
    if (articles && articles.length > 0) {
      const latestArticle = articles[0];
      console.log('📝 Article le plus récent:', {
        id: latestArticle.id,
        title: latestArticle.source_title,
        updated_at: latestArticle.updated_at
      });
    }
    
    if (folders && folders.length > 0) {
      const latestFolder = folders[0];
      console.log('📁 Dossier le plus récent:', {
        id: latestFolder.id,
        name: latestFolder.name,
        updated_at: latestFolder.updated_at
      });
    }
    
    // Test 3: Simuler une requête de polling
    console.log('\n🔄 Test simulation polling...');
    
    const lastTimestamp = null; // Simuler un premier polling
    const { data: recentArticles, error: recentError } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', USER_ID)
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('❌ Erreur simulation polling articles:', recentError.message);
    } else {
      console.log('✅ Simulation polling articles OK:', recentArticles?.length || 0, 'éléments');
    }
    
    console.log('\n✅ Test de polling terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de polling:', error);
  }
}

testPolling(); 