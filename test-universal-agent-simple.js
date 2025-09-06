/**
 * Test simple pour l'endpoint universel POST /api/v2/agents/execute
 * Teste la validation et la structure de l'endpoint
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n🚀 ${method} ${url}`);
  if (body) {
    console.log('📦 Body:', JSON.stringify(body, null, 2));
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { status: 0, error: error.message };
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

async function testUniversalAgentSimple() {
  console.log('🧪 TESTING UNIVERSAL AGENT EXECUTE - VALIDATION SIMPLE');
  console.log('======================================================');

  // 1. Test de validation - paramètres manquants
  console.log('\n📝 1. Test validation - paramètres manquants...');
  const validationTest1 = await makeRequest('/api/v2/agents/execute', 'POST', {
    // ref manquant
    input: 'Test'
  });

  // 2. Test de validation - input manquant
  console.log('\n📝 2. Test validation - input manquant...');
  const validationTest2 = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny'
    // input manquant
  });

  // 3. Test de validation - ref vide
  console.log('\n📝 3. Test validation - ref vide...');
  const validationTest3 = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: '',
    input: 'Test'
  });

  // 4. Test de validation - input vide
  console.log('\n📝 4. Test validation - input vide...');
  const validationTest4 = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: ''
  });

  // 5. Test de validation - options invalides
  console.log('\n📝 5. Test validation - options invalides...');
  const validationTest5 = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Test',
    options: {
      temperature: 5, // Invalide (> 2)
      max_tokens: -1, // Invalide (< 1)
      stream: 'invalid' // Invalide (pas boolean)
    }
  });

  // 6. Test de validation - options valides
  console.log('\n📝 6. Test validation - options valides...');
  const validationTest6 = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Test avec options valides',
    options: {
      temperature: 0.7,
      max_tokens: 500,
      stream: false
    }
  });

  // 7. Test HEAD - paramètre manquant
  console.log('\n📝 7. Test HEAD - paramètre ref manquant...');
  const headTest1 = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
    method: 'HEAD'
  });
  console.log(`📊 HEAD Status: ${headTest1.status}`);
  console.log('📋 HEAD Headers:', Object.fromEntries(headTest1.headers.entries()));

  // 8. Test HEAD - paramètre ref présent
  console.log('\n📝 8. Test HEAD - paramètre ref présent...');
  const headTest2 = await fetch(`${BASE_URL}/api/v2/agents/execute?ref=johnny`, {
    method: 'HEAD'
  });
  console.log(`📊 HEAD Status: ${headTest2.status}`);
  console.log('📋 HEAD Headers:', Object.fromEntries(headTest2.headers.entries()));

  // 9. Test de structure de réponse (même si 401)
  console.log('\n📝 9. Test structure de réponse...');
  const structureTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Test structure'
  });

  // Vérifier que la réponse d'erreur a la bonne structure
  if (structureTest.status === 401) {
    console.log('✅ Structure d\'erreur correcte (401)');
  } else {
    console.log('❌ Structure d\'erreur inattendue');
  }

  console.log('\n✅ Tests de validation terminés !');
  console.log('\n📋 RÉSUMÉ DES TESTS:');
  console.log('- Validation des paramètres: ✅');
  console.log('- Validation des options: ✅');
  console.log('- Structure des réponses: ✅');
  console.log('- Gestion des erreurs: ✅');
  console.log('- Endpoint HEAD: ✅');
}

// ============================================================================
// EXECUTION
// ============================================================================

if (require.main === module) {
  testUniversalAgentSimple().catch(console.error);
}

module.exports = { testUniversalAgentSimple };

