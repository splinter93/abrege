#!/usr/bin/env node

/**
 * Test du nouvel endpoint DELETE unifié
 * Route: DELETE /api/v2/delete/{resource}/{ref}
 */

const BASE_URL = 'http://localhost:3000';

async function testUnifiedDelete() {
  console.log('🧪 Test du nouvel endpoint DELETE unifié');
  console.log('📍 Route: /api/v2/delete/{resource}/{ref}');
  console.log('');

  // Test 1: HEAD request pour vérifier la documentation
  console.log('📋 Test 1: HEAD request (documentation)');
  try {
    const headResponse = await fetch(`${BASE_URL}/api/v2/delete/note/test123`, {
      method: 'HEAD'
    });
    
    console.log(`   Status: ${headResponse.status}`);
    console.log(`   Headers:`);
    headResponse.headers.forEach((value, key) => {
      if (key.startsWith('X-')) {
        console.log(`     ${key}: ${value}`);
      }
    });
    console.log('');
  } catch (error) {
    console.error('   ❌ Erreur HEAD:', error.message);
  }

  // Test 2: Validation du type de ressource
  console.log('📋 Test 2: Validation du type de ressource');
  try {
    const invalidResponse = await fetch(`${BASE_URL}/api/v2/delete/invalid/test123`, {
      method: 'DELETE'
    });
    
    console.log(`   Status: ${invalidResponse.status}`);
    const invalidResult = await invalidResponse.json();
    console.log(`   Réponse:`, invalidResult);
    console.log('');
  } catch (error) {
    console.error('   ❌ Erreur validation:', error.message);
  }

  // Test 3: Test avec un type valide (sans authentification = 401 attendu)
  console.log('📋 Test 3: Test avec type valide (sans auth = 401 attendu)');
  try {
    const validResponse = await fetch(`${BASE_URL}/api/v2/delete/note/test123`, {
      method: 'DELETE'
    });
    
    console.log(`   Status: ${validResponse.status}`);
    if (validResponse.status === 401) {
      console.log('   ✅ 401 Unauthorized (comportement attendu sans authentification)');
    } else {
      const result = await validResponse.json();
      console.log(`   Réponse:`, result);
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ Erreur test valide:', error.message);
  }

  // Test 4: Test HEAD avec type invalide
  console.log('📋 Test 4: HEAD avec type invalide (400 attendu)');
  try {
    const headInvalidResponse = await fetch(`${BASE_URL}/api/v2/delete/invalid/test123`, {
      method: 'HEAD'
    });
    
    console.log(`   Status: ${headInvalidResponse.status}`);
    if (headInvalidResponse.status === 400) {
      console.log('   ✅ 400 Bad Request (comportement attendu pour type invalide)');
      console.log(`   Header X-Error: ${headInvalidResponse.headers.get('X-Error')}`);
    } else {
      console.log('   ❌ Status inattendu');
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ Erreur HEAD invalide:', error.message);
  }

  console.log('🎯 Tests terminés !');
  console.log('');
  console.log('📝 Résumé des routes testées:');
  console.log('   HEAD /api/v2/delete/note/test123     → 200 (documentation)');
  console.log('   HEAD /api/v2/delete/invalid/test123  → 400 (type invalide)');
  console.log('   DELETE /api/v2/delete/invalid/test123 → 400 (type invalide)');
  console.log('   DELETE /api/v2/delete/note/test123   → 401 (sans auth)');
}

// Exécuter les tests
testUnifiedDelete().catch(console.error);
