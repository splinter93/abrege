// Test direct de la connexion Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseDirect() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Variables d\'environnement manquantes');
      return;
    }
    
    console.log('🔍 Connexion à Supabase...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Connexion simple
    console.log('\n1️⃣ Test connexion simple...');
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erreur connexion simple:', testError.message);
      console.log('❌ Code:', testError.code);
      console.log('❌ Détails:', testError.details);
    } else {
      console.log('✅ Connexion simple réussie');
      console.log('📊 Données:', testData);
    }
    
    // Test 2: Requête avec user_id (comme dans l'API)
    console.log('\n2️⃣ Test requête avec user_id...');
    const userId = '3223651c-5580-4471-affb-b3f4456bd729'; // User ID de votre clé API
    
    const { data: userData, error: userError } = await supabase
      .from('articles')
      .select('id, source_title')
      .eq('user_id', userId)
      .limit(5);
    
    if (userError) {
      console.log('❌ Erreur requête user_id:', userError.message);
      console.log('❌ Code:', userError.code);
      console.log('❌ Détails:', userError.details);
    } else {
      console.log('✅ Requête user_id réussie');
      console.log('📊 Articles trouvés:', userData?.length || 0);
      if (userData && userData.length > 0) {
        console.log('📝 Premier article:', userData[0]);
      }
    }
    
    // Test 3: Vérifier la structure de la table
    console.log('\n3️⃣ Vérification structure table...');
    const { data: structureData, error: structureError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.log('❌ Erreur structure table:', structureError.message);
    } else if (structureData && structureData.length > 0) {
      console.log('✅ Structure table OK');
      console.log('📋 Colonnes disponibles:', Object.keys(structureData[0]));
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
}

testSupabaseDirect();
