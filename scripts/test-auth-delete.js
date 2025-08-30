#!/usr/bin/env node

/**
 * Script de test pour l'authentification et suppression de session
 * Usage: node scripts/test-auth-delete.js
 */

const BASE_URL = 'http://localhost:3001';

// Fonction utilitaire pour les requêtes
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  console.log(`\n🔄 ${options.method || 'GET'} ${url}`);
  if (options.headers?.Authorization) {
    console.log('🔐 Token présent');
  }
  if (options.body) {
    console.log('📦 Body:', JSON.stringify(options.body, null, 2));
  }

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    console.log(`📡 Status: ${response.status}`);
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test de création et suppression avec authentification
async function testAuthDelete() {
  console.log('🧪 TEST AUTHENTIFICATION ET SUPPRESSION');
  console.log('========================================');

  // Test 1: Créer une session (sans auth - devrait échouer)
  console.log('\n📝 Test 1: Créer une session (sans auth)');
  const createResult = await makeRequest('/api/ui/chat-sessions', {
    method: 'POST',
    body: {
      name: 'Test Session',
      history_limit: 10
    }
  });

  if (createResult.status === 401) {
    console.log('✅ Correct: Création refusée sans authentification');
  } else {
    console.log('❌ Problème: Création autorisée sans authentification');
  }

  // Test 2: Supprimer une session (sans auth - devrait échouer)
  console.log('\n🗑️ Test 2: Supprimer une session (sans auth)');
  const deleteResult = await makeRequest('/api/ui/chat-sessions/test-id', {
    method: 'DELETE'
  });

  if (deleteResult.status === 401) {
    console.log('✅ Correct: Suppression refusée sans authentification');
  } else {
    console.log('❌ Problème: Suppression autorisée sans authentification');
  }

  console.log('\n💡 Conclusion:');
  console.log('- Les endpoints nécessitent une authentification');
  console.log('- L\'erreur 404/401 est normale sans token valide');
  console.log('- L\'interface doit gérer ces cas d\'erreur');
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Exécuter les tests
testAuthDelete().catch(console.error); 