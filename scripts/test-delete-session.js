#!/usr/bin/env node

/**
 * Script de test pour l'endpoint de suppression de session
 * Usage: node scripts/test-delete-session.js
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

// Test de suppression avec un ID fictif
async function testDeleteSession() {
  console.log('🧪 TEST DE SUPPRESSION DE SESSION');
  console.log('==================================');

  // Test avec un ID fictif (pour tester la structure de l'endpoint)
  const sessionId = 'test-session-id';
  
  console.log('\n🗑️ Test: Supprimer une session');
  const deleteResult = await makeRequest(`/api/ui/chat-sessions/${sessionId}`, {
    method: 'DELETE'
  });

  if (deleteResult.success) {
    console.log('✅ Endpoint de suppression fonctionne');
  } else {
    console.log('❌ Endpoint de suppression a un problème');
    console.log('💡 Note: L\'erreur 401 est normale car pas de token d\'auth');
  }
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Exécuter les tests
testDeleteSession().catch(console.error); 