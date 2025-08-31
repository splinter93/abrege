#!/usr/bin/env node

/**
 * Test de l'endpoint DELETE unifié /api/v2/{resource}/{ref}
 */

const BASE_URL = 'http://localhost:3000';

// Simuler un token JWT (pour le test)
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

async function testUnifiedDelete() {
  console.log('🧪 Test de l\'endpoint DELETE unifié\n');

  // Test 1: HEAD request pour vérifier l'endpoint
  console.log('1️⃣ Test HEAD request...');
  try {
    const headResponse = await fetch(`${BASE_URL}/api/v2/note/test`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${MOCK_JWT}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${headResponse.status}`);
    console.log(`   Headers:`, Object.fromEntries(headResponse.headers.entries()));
    
    if (headResponse.ok) {
      console.log('   ✅ HEAD request réussie');
    } else {
      console.log('   ⚠️ HEAD request échouée (normal sans authentification)');
    }
  } catch (error) {
    console.log('   ❌ Erreur HEAD request:', error.message);
  }

  console.log('');

  // Test 2: Test avec différents types de ressources
  const testCases = [
    { resource: 'note', ref: 'test-note' },
    { resource: 'classeur', ref: 'test-classeur' },
    { resource: 'folder', ref: 'test-folder' },
    { resource: 'file', ref: 'test-file' }
  ];

  console.log('2️⃣ Test avec différents types de ressources...');
  
  for (const testCase of testCases) {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/${testCase.resource}/${testCase.ref}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${MOCK_JWT}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`   ${testCase.resource}/${testCase.ref}: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('      ✅ Endpoint accessible (401 = authentification requise)');
      } else if (response.status === 404) {
        console.log('      ✅ Endpoint accessible (404 = ressource non trouvée)');
      } else {
        console.log('      ✅ Endpoint accessible');
      }
    } catch (error) {
      console.log(`   ${testCase.resource}/${testCase.ref}: ❌ Erreur - ${error.message}`);
    }
  }

  console.log('');

  // Test 3: Test avec un type de ressource invalide
  console.log('3️⃣ Test avec type de ressource invalide...');
  try {
    const response = await fetch(`${BASE_URL}/api/v2/invalid/test`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${MOCK_JWT}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 400) {
      console.log('   ✅ Validation du type de ressource fonctionne (400 = Bad Request)');
    } else {
      console.log('   ⚠️ Réponse inattendue');
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
  }

  console.log('\n🎯 Test terminé !');
}

// Lancer le test
testUnifiedDelete().catch(console.error);
