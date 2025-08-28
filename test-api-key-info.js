// Script pour vérifier et créer des API keys de test
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkAndCreateApiKey() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Variables d\'environnement manquantes');
      return;
    }
    
    console.log('🔍 Connexion à Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Vérifier les API keys existantes
    console.log('🧪 Vérification API keys existantes...');
    const { data: existingKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('*');
    
    if (keysError) {
      console.log('❌ Erreur récupération API keys:', keysError.message);
      return;
    }
    
    console.log('📊 API keys existantes:', existingKeys.length);
    existingKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key.api_key_name} - User: ${key.user_id} - Active: ${key.is_active}`);
    });
    
    // Si aucune API key n'est active, en créer une de test
    const activeKeys = existingKeys.filter(key => key.is_active);
    if (activeKeys.length === 0) {
      console.log('\n⚠️  Aucune API key active trouvée. Création d\'une clé de test...');
      
      // Créer une API key de test
      const { ApiKeyService } = require('./src/services/apiKeyService');
      const testApiKey = await ApiKeyService.createApiKey({
        user_id: existingKeys[0]?.user_id || 'test-user',
        api_key_name: 'Test API Key',
        scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write']
      });
      
      console.log('✅ API key de test créée:');
      console.log('🔑 Clé:', testApiKey.apiKey);
      console.log('📋 Info:', testApiKey.info);
      
      // Sauvegarder la clé dans un fichier pour les tests
      const fs = require('fs');
      fs.writeFileSync('test-api-key.txt', testApiKey.apiKey);
      console.log('💾 Clé sauvegardée dans test-api-key.txt');
      
    } else {
      console.log('\n✅ Des API keys actives existent déjà');
      console.log('🔑 Utilisez l\'une d\'elles pour tester l\'API');
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

checkAndCreateApiKey();
