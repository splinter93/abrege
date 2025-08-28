// Script pour tester l'API avec une clé existante
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testWithExistingKey() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Variables d\'environnement manquantes');
      return;
    }
    
    console.log('🔍 Connexion à Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Récupérer une API key active
    console.log('🧪 Récupération d\'une API key active...');
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('is_active', true)
      .limit(1);
    
    if (keysError || !apiKeys || apiKeys.length === 0) {
      console.log('❌ Aucune API key active trouvée');
      return;
    }
    
    const apiKey = apiKeys[0];
    console.log('✅ API key trouvée:', apiKey.api_key_name);
    console.log('👤 User ID:', apiKey.user_id);
    
    // Maintenant, nous devons récupérer la clé originale
    // Mais comme elle est hashée, nous ne pouvons pas la récupérer
    // Nous devons utiliser une méthode alternative
    
    console.log('\n⚠️  Impossible de récupérer la clé originale (hashée)');
    console.log('🔑 Vous devez utiliser une de vos clés API existantes');
    console.log('📋 Clés disponibles:');
    console.log('  1. Chat GPT');
    console.log('  2. Donna');
    
    // Test de l'endpoint avec un message d'erreur explicite
    console.log('\n🧪 Test de l\'endpoint POST /notes...');
    console.log('📡 URL: http://localhost:3000/api/v2/notes');
    console.log('🔑 Headers requis:');
    console.log('   X-API-Key: VOTRE_CLE_API_ICI');
    console.log('   Content-Type: application/json');
    console.log('\n📝 Body de test:');
    console.log(JSON.stringify({
      source_title: 'Note de test',
      markdown_content: '# Test\n\nContenu de test...',
      classeur_id: '552334a9-f012-41f3-a5eb-74ab9ab713ed'
    }, null, 2));
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

testWithExistingKey();
