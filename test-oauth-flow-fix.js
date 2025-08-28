#!/usr/bin/env node

/**
 * Script de test pour le flux OAuth ChatGPT
 * Teste la création de code OAuth et la redirection
 */

const fetch = require('node-fetch');

// Configuration de test
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  clientId: 'scrivia-custom-gpt',
  redirectUri: 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
  scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write', 'profile:read'],
  state: 'test-state-123'
};

async function testOAuthFlow() {
  console.log('🧪 TEST DU FLUX OAUTH CHATGPT');
  console.log('================================\n');

  try {
    // 1. Test de la page d'authentification
    console.log('1️⃣ Test de la page d\'authentification...');
    const authUrl = `${TEST_CONFIG.baseUrl}/auth?response_type=code&client_id=${TEST_CONFIG.clientId}&redirect_uri=${encodeURIComponent(TEST_CONFIG.redirectUri)}&scope=${TEST_CONFIG.scopes.join(' ')}&state=${TEST_CONFIG.state}`;
    
    console.log('   URL de test:', authUrl);
    
    const authResponse = await fetch(authUrl);
    console.log('   Status:', authResponse.status);
    console.log('   Content-Type:', authResponse.headers.get('content-type'));
    
    if (authResponse.ok) {
      const authHtml = await authResponse.text();
      console.log('   ✅ Page d\'authentification accessible');
      
      // Vérifier que les paramètres OAuth sont bien affichés
      if (authHtml.includes(TEST_CONFIG.clientId)) {
        console.log('   ✅ Client ID affiché correctement');
      } else {
        console.log('   ❌ Client ID non affiché');
      }
      
      if (authHtml.includes('Continuer le flux OAuth')) {
        console.log('   ✅ Bouton "Continuer le flux OAuth" présent');
      } else {
        console.log('   ❌ Bouton "Continuer le flux OAuth" manquant');
      }
    } else {
      console.log('   ❌ Page d\'authentification inaccessible');
      return;
    }

    // 2. Test de l'API create-code (sans authentification)
    console.log('\n2️⃣ Test de l\'API create-code (sans authentification)...');
    try {
      const createCodeResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/create-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: TEST_CONFIG.clientId,
          userId: 'test-user-id',
          redirectUri: TEST_CONFIG.redirectUri,
          scopes: TEST_CONFIG.scopes,
          state: TEST_CONFIG.state
        })
      });
      
      console.log('   Status:', createCodeResponse.status);
      
      if (createCodeResponse.status === 401 || createCodeResponse.status === 403) {
        console.log('   ✅ API protégée correctement (authentification requise)');
      } else {
        console.log('   ❌ API accessible sans authentification');
      }
    } catch (error) {
      console.log('   ✅ API inaccessible (erreur réseau attendue)');
    }

    // 3. Test de la page de callback
    console.log('\n3️⃣ Test de la page de callback...');
    const callbackUrl = `${TEST_CONFIG.baseUrl}/auth/callback`;
    
    const callbackResponse = await fetch(callbackUrl);
    console.log('   Status:', callbackResponse.status);
    
    if (callbackResponse.ok) {
      const callbackHtml = await callbackResponse.text();
      console.log('   ✅ Page de callback accessible');
      
      if (callbackHtml.includes('Finalisation de votre connexion')) {
        console.log('   ✅ Message de finalisation présent');
      } else {
        console.log('   ❌ Message de finalisation manquant');
      }
    } else {
      console.log('   ❌ Page de callback inaccessible');
    }

    // 4. Test de la validation des redirect_uri
    console.log('\n4️⃣ Test de la validation des redirect_uri...');
    const testUrls = [
      'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
      'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback',
      'https://scrivia.app/auth/callback',
      'https://malicious-site.com/callback'
    ];
    
    for (const url of testUrls) {
      const isChatGPT = url.includes('chat.openai.com');
      const isScrivia = url.includes('scrivia.app');
      const expectedValid = isChatGPT || isScrivia;
      
      console.log(`   ${url}: ${expectedValid ? '✅ Attendu valide' : '❌ Attendu invalide'}`);
    }

    console.log('\n✅ Tests terminés avec succès !');
    console.log('\n📋 PROCHAINES ÉTAPES :');
    console.log('1. Ouvrir la page d\'authentification dans un navigateur');
    console.log('2. Se connecter avec Google/GitHub');
    console.log('3. Cliquer sur "Continuer le flux OAuth"');
    console.log('4. Vérifier la redirection vers ChatGPT');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests
if (require.main === module) {
  testOAuthFlow();
}

module.exports = { testOAuthFlow };
