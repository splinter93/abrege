/**
 * Test pour l'endpoint universel POST /api/v2/agents/execute
 * Teste l'exécution de différents agents avec une interface simple
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
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

async function testUniversalAgentExecute() {
  console.log('🧪 TESTING UNIVERSAL AGENT EXECUTE ENDPOINT');
  console.log('============================================');

  // 1. Test avec l'agent Johnny (slug)
  console.log('\n📝 1. Test avec l\'agent Johnny (slug)...');
  const johnnyTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Bonjour Johnny, peux-tu m\'aider à analyser une note ?',
    options: {
      temperature: 0.7,
      max_tokens: 500
    }
  });

  // 2. Test avec un agent par ID (si disponible)
  console.log('\n📝 2. Test avec un agent par ID...');
  const agentIdTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'test-agent-id', // Remplacer par un vrai ID
    input: 'Test avec ID d\'agent'
  });

  // 3. Test avec l'agent Formatter
  console.log('\n📝 3. Test avec l\'agent Formatter...');
  const formatterTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'formatter',
    input: 'Formate ce texte en markdown: # Titre\n\nParagraphe avec **gras** et *italique*.'
  });

  // 4. Test avec l'agent Vision
  console.log('\n📝 4. Test avec l\'agent Vision...');
  const visionTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'vision',
    input: 'Analyse cette image et décris-moi ce que tu vois.',
    options: {
      temperature: 0.5
    }
  });

  // 5. Test de validation d'erreur - agent inexistant
  console.log('\n📝 5. Test agent inexistant...');
  const notFoundTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'agent-inexistant',
    input: 'Test avec agent inexistant'
  });

  // 6. Test de validation d'erreur - paramètres manquants
  console.log('\n📝 6. Test paramètres manquants...');
  const validationTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny'
    // input manquant
  });

  // 7. Test HEAD pour vérifier l'existence d'un agent
  console.log('\n📝 7. Test HEAD - Vérifier existence agent...');
  const headTest = await fetch(`${BASE_URL}/api/v2/agents/execute?ref=johnny`, {
    method: 'HEAD',
    headers: {
      'X-API-Key': API_KEY
    }
  });

  console.log(`📊 HEAD Status: ${headTest.status}`);
  console.log('📋 HEAD Headers:', Object.fromEntries(headTest.headers.entries()));

  // 8. Test avec options avancées
  console.log('\n📝 8. Test avec options avancées...');
  const advancedTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Génère un résumé détaillé de cette conversation.',
    options: {
      temperature: 0.8,
      max_tokens: 1000,
      stream: false
    }
  });

  // 9. Test avec input long
  console.log('\n📝 9. Test avec input long...');
  const longInputTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Voici un texte très long pour tester la gestion des inputs volumineux. '.repeat(50),
    options: {
      temperature: 0.6
    }
  });

  // 10. Test de performance
  console.log('\n📝 10. Test de performance...');
  const startTime = Date.now();
  const perfTest = await makeRequest('/api/v2/agents/execute', 'POST', {
    ref: 'johnny',
    input: 'Test de performance rapide'
  });
  const endTime = Date.now();
  console.log(`⏱️ Temps d'exécution: ${endTime - startTime}ms`);

  console.log('\n✅ Tests terminés !');
}

// ============================================================================
// EXECUTION
// ============================================================================

if (require.main === module) {
  testUniversalAgentExecute().catch(console.error);
}

module.exports = { testUniversalAgentExecute };

