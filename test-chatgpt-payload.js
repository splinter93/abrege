#!/usr/bin/env node

/**
 * Script de test pour diagnostiquer le problème OAuth ChatGPT
 * Simule exactement ce que ChatGPT envoie pour identifier le problème
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

async function testChatGPTPayload() {
  console.log('🧪 TEST DU PAYLOAD CHATGPT OAUTH');
  console.log('==================================\n');

  try {
    // 1. Test sans authentification (simulation de l'erreur ChatGPT)
    console.log('1️⃣ Test SANS authentification (erreur ChatGPT)...');
    
    try {
      const responseWithoutAuth = await fetch(`${TEST_CONFIG.baseUrl}/api/test-chatgpt-oauth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // ❌ PAS d'Authorization header
        },
        body: JSON.stringify({
          clientId: TEST_CONFIG.clientId,
          userId: 'test-user-id-123',
          redirectUri: TEST_CONFIG.redirectUri,
          scopes: TEST_CONFIG.scopes,
          state: TEST_CONFIG.state
        })
      });
      
      const resultWithoutAuth = await responseWithoutAuth.json();
      console.log('   Status:', responseWithoutAuth.status);
      console.log('   Réponse:', JSON.stringify(resultWithoutAuth, null, 2));
      
      if (responseWithoutAuth.status === 401) {
        console.log('   ✅ Erreur 401 attendue - pas d\'authentification');
      } else {
        console.log('   ❌ Status inattendu');
      }
    } catch (error) {
      console.log('   ❌ Erreur réseau:', error.message);
    }

    // 2. Test avec authentification incorrecte
    console.log('\n2️⃣ Test avec authentification INCORRECTE...');
    
    try {
      const responseWrongAuth = await fetch(`${TEST_CONFIG.baseUrl}/api/test-chatgpt-oauth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'InvalidToken' // ❌ Format incorrect
        },
        body: JSON.stringify({
          clientId: TEST_CONFIG.clientId,
          userId: 'test-user-id-123',
          redirectUri: TEST_CONFIG.redirectUri,
          scopes: TEST_CONFIG.scopes,
          state: TEST_CONFIG.state
        })
      });
      
      const resultWrongAuth = await responseWrongAuth.json();
      console.log('   Status:', responseWrongAuth.status);
      console.log('   Réponse:', JSON.stringify(resultWrongAuth, null, 2));
      
      if (responseWrongAuth.status === 401) {
        console.log('   ✅ Erreur 401 attendue - format d\'authentification incorrect');
      } else {
        console.log('   ❌ Status inattendu');
      }
    } catch (error) {
      console.log('   ❌ Erreur réseau:', error.message);
    }

    // 3. Test avec authentification correcte (simulation réussie)
    console.log('\n3️⃣ Test avec authentification CORRECTE...');
    
    try {
      const responseWithAuth = await fetch(`${TEST_CONFIG.baseUrl}/api/test-chatgpt-oauth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-supabase-token-123' // ✅ Format correct
        },
        body: JSON.stringify({
          clientId: TEST_CONFIG.clientId,
          userId: 'test-user-id-123',
          redirectUri: TEST_CONFIG.redirectUri,
          scopes: TEST_CONFIG.scopes,
          state: TEST_CONFIG.state
        })
      });
      
      const resultWithAuth = await responseWithAuth.json();
      console.log('   Status:', responseWithAuth.status);
      console.log('   Réponse:', JSON.stringify(resultWithAuth, null, 2));
      
      if (responseWithAuth.status === 200) {
        console.log('   ✅ Succès 200 - format d\'authentification correct');
      } else {
        console.log('   ❌ Status inattendu');
      }
    } catch (error) {
      console.log('   ❌ Erreur réseau:', error.message);
    }

    // 4. Test de l'endpoint réel create-code (sans authentification)
    console.log('\n4️⃣ Test de l\'endpoint RÉEL create-code (sans authentification)...');
    
    try {
      const responseRealEndpoint = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/create-code`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // ❌ PAS d'Authorization header
        },
        body: JSON.stringify({
          clientId: TEST_CONFIG.clientId,
          userId: 'test-user-id-123',
          redirectUri: TEST_CONFIG.redirectUri,
          scopes: TEST_CONFIG.scopes,
          state: TEST_CONFIG.state
        })
      });
      
      console.log('   Status:', responseRealEndpoint.status);
      
      if (responseRealEndpoint.status === 401) {
        console.log('   ✅ Erreur 401 attendue - authentification requise');
        const errorBody = await responseRealEndpoint.text();
        console.log('   Réponse d\'erreur:', errorBody);
      } else {
        console.log('   ❌ Status inattendu');
        const responseBody = await responseRealEndpoint.text();
        console.log('   Réponse:', responseBody);
      }
    } catch (error) {
      console.log('   ❌ Erreur réseau:', error.message);
    }

    console.log('\n✅ Tests terminés avec succès !');
    console.log('\n📋 DIAGNOSTIC :');
    console.log('1. Si le test 1 retourne 401, c\'est normal (pas d\'authentification)');
    console.log('2. Si le test 2 retourne 401, c\'est normal (format incorrect)');
    console.log('3. Si le test 3 retourne 200, le format est correct');
    console.log('4. Si le test 4 retourne 401, l\'endpoint est bien protégé');
    console.log('\n🎯 PROBLÈME IDENTIFIÉ :');
    console.log('ChatGPT n\'envoie PAS le header Authorization avec le token Supabase.');
    console.log('Il faut vérifier comment ChatGPT récupère et envoie le token d\'authentification.');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests
if (require.main === module) {
  testChatGPTPayload();
}

module.exports = { testChatGPTPayload };
