#!/usr/bin/env node

// Script de test OAuth ChatGPT
// Usage: node scripts/test-chatgpt-oauth.js

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatGPTOAuth() {
  console.log('🧪 TEST CONFIGURATION OAUTH CHATGPT');
  console.log('====================================\n');

  try {
    // 1. Vérifier la table oauth_clients
    console.log('1️⃣ Test de la table oauth_clients...');
    const { data: clients, error: clientsError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('is_active', true);

    if (clientsError) {
      console.error('❌ Erreur récupération clients:', clientsError.message);
      return false;
    }

    console.log(`✅ ${clients.length} client(s) OAuth trouvé(s)`);
    
    // 2. Vérifier le client ChatGPT
    const chatgptClient = clients.find(c => c.client_id === 'scrivia-custom-gpt');
    if (!chatgptClient) {
      console.error('❌ Client ChatGPT OAuth non trouvé');
      console.log('💡 Exécutez: node scripts/setup-chatgpt-oauth.js');
      return false;
    }

    console.log('✅ Client ChatGPT OAuth trouvé');
    console.log('   ID:', chatgptClient.id);
    console.log('   Nom:', chatgptClient.name);
    console.log('   Actif:', chatgptClient.is_active ? 'Oui' : 'Non');

    // 3. Vérifier les redirect_uris
    console.log('\n2️⃣ Test des redirect_uris...');
    const expectedUris = [
      'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
      'https://scrivia.app/auth/callback'
    ];

    const missingUris = expectedUris.filter(uri => 
      !chatgptClient.redirect_uris.includes(uri)
    );

    if (missingUris.length > 0) {
      console.error('❌ Redirect URIs manquants:', missingUris);
      return false;
    }

    console.log('✅ Tous les redirect_uris sont configurés');
    chatgptClient.redirect_uris.forEach(uri => {
      console.log('   -', uri);
    });

    // 4. Vérifier les scopes
    console.log('\n3️⃣ Test des scopes...');
    const expectedScopes = [
      'notes:read',
      'notes:write',
      'dossiers:read',
      'dossiers:write',
      'classeurs:read',
      'classeurs:write',
      'profile:read'
    ];

    const missingScopes = expectedScopes.filter(scope => 
      !chatgptClient.scopes.includes(scope)
    );

    if (missingScopes.length > 0) {
      console.error('❌ Scopes manquants:', missingScopes);
      return false;
    }

    console.log('✅ Tous les scopes sont configurés');
    chatgptClient.scopes.forEach(scope => {
      console.log('   -', scope);
    });

    // 5. Test de validation des redirect_uris
    console.log('\n4️⃣ Test de validation des redirect_uris...');
    const testUri = 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback';
    
    const isValid = chatgptClient.redirect_uris.some(uri => {
      if (uri.includes('*')) {
        const pattern = uri.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(testUri);
      }
      return testUri.startsWith(uri);
    });

    if (!isValid) {
      console.error('❌ Validation redirect_uri échouée pour:', testUri);
      return false;
    }

    console.log('✅ Validation redirect_uri réussie pour:', testUri);

    // 6. Résumé final
    console.log('\n🎯 RÉSUMÉ DE LA CONFIGURATION');
    console.log('================================');
    console.log('✅ Client OAuth ChatGPT configuré');
    console.log('✅ Redirect URIs valides');
    console.log('✅ Scopes configurés');
    console.log('✅ Prêt pour l\'intégration ChatGPT');
    
    console.log('\n📋 PARAMÈTRES POUR CHATGPT:');
    console.log('Client ID:', chatgptClient.client_id);
    console.log('Client Secret: scrivia-gpt-secret-2024');
    console.log('Redirect URI:', testUri);
    console.log('Scopes:', chatgptClient.scopes.join(' '));

    return true;

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    return false;
  }
}

// Exécuter le test
testChatGPTOAuth().then(success => {
  if (success) {
    console.log('\n🎉 Test réussi ! Votre configuration OAuth ChatGPT est prête.');
    process.exit(0);
  } else {
    console.log('\n❌ Test échoué. Vérifiez la configuration.');
    process.exit(1);
  }
}).catch(console.error);
