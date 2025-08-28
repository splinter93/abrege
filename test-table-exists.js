// Script pour vérifier l'existence de la table api_keys
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTables() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Variables d\'environnement manquantes');
      return;
    }
    
    console.log('🔍 Connexion à Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Vérifier si la table api_keys existe
    console.log('🧪 Vérification table api_keys...');
    try {
      const { data: apiKeys, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('*')
        .limit(1);
      
      if (apiKeysError) {
        console.log('❌ Table api_keys n\'existe pas ou erreur:', apiKeysError.message);
        console.log('❌ Code:', apiKeysError.code);
        console.log('❌ Détails:', apiKeysError.details);
      } else {
        console.log('✅ Table api_keys existe');
        console.log('📊 Nombre d\'API keys:', apiKeys?.length || 0);
      }
    } catch (error) {
      console.log('❌ Erreur accès table api_keys:', error.message);
    }
    
    // Vérifier la table articles
    console.log('\n🧪 Vérification table articles...');
    try {
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .limit(1);
      
      if (articlesError) {
        console.log('❌ Table articles erreur:', articlesError.message);
      } else {
        console.log('✅ Table articles accessible');
        console.log('📊 Nombre d\'articles:', articles?.length || 0);
      }
    } catch (error) {
      console.log('❌ Erreur accès table articles:', error.message);
    }
    
    // Lister toutes les tables
    console.log('\n🧪 Liste des tables disponibles...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names');
      
      if (tablesError) {
        console.log('❌ Impossible de lister les tables:', tablesError.message);
      } else {
        console.log('📋 Tables disponibles:', tables);
      }
    } catch (error) {
      console.log('❌ Erreur liste tables:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
}

checkTables();
