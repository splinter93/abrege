#!/usr/bin/env node

/**
 * Script de test pour les endpoints CRUD des agents spécialisés
 * Teste GET, POST, PUT, PATCH, DELETE
 */

const BASE_URL = 'http://localhost:3001';

// Headers par défaut
const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'test-script'
};

// Token d'authentification (à remplacer par un vrai token)
const AUTH_TOKEN = 'your-auth-token-here';

async function makeRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      ...defaultHeaders,
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false
    };
  }
}

async function testEndpoints() {
  console.log('🧪 Test des endpoints CRUD des agents spécialisés\n');

  // 1. Test GET - Lister les agents
  console.log('1️⃣ Test GET /api/v2/agents');
  const listResult = await makeRequest('GET', '/api/v2/agents');
  console.log(`   Status: ${listResult.status}`);
  console.log(`   Success: ${listResult.success}`);
  console.log(`   Data:`, JSON.stringify(listResult.data, null, 2));
  console.log('');

  // 2. Test GET - Info d'un agent spécifique
  console.log('2️⃣ Test GET /api/v2/agents/johnny');
  const agentInfo = await makeRequest('GET', '/api/v2/agents/johnny');
  console.log(`   Status: ${agentInfo.status}`);
  console.log(`   Success: ${agentInfo.success}`);
  console.log(`   Data:`, JSON.stringify(agentInfo.data, null, 2));
  console.log('');

  // 3. Test POST - Exécuter un agent
  console.log('3️⃣ Test POST /api/v2/agents/johnny (exécution)');
  const executionResult = await makeRequest('POST', '/api/v2/agents/johnny', {
    input: {
      noteId: 'test-note-123',
      query: 'Analyse cette note de test',
      imageUrl: 'https://example.com/test-image.jpg'
    }
  });
  console.log(`   Status: ${executionResult.status}`);
  console.log(`   Success: ${executionResult.success}`);
  console.log(`   Data:`, JSON.stringify(executionResult.data, null, 2));
  console.log('');

  // 4. Test PUT - Mise à jour complète
  console.log('4️⃣ Test PUT /api/v2/agents/johnny (mise à jour complète)');
  const updateResult = await makeRequest('PUT', '/api/v2/agents/johnny', {
    display_name: 'Johnny Query Updated',
    description: 'Agent mis à jour pour les tests',
    temperature: 0.8,
    max_tokens: 6000
  });
  console.log(`   Status: ${updateResult.status}`);
  console.log(`   Success: ${updateResult.success}`);
  console.log(`   Data:`, JSON.stringify(updateResult.data, null, 2));
  console.log('');

  // 5. Test PATCH - Mise à jour partielle
  console.log('5️⃣ Test PATCH /api/v2/agents/johnny (mise à jour partielle)');
  const patchResult = await makeRequest('PATCH', '/api/v2/agents/johnny', {
    temperature: 0.5,
    description: 'Description mise à jour via PATCH'
  });
  console.log(`   Status: ${patchResult.status}`);
  console.log(`   Success: ${patchResult.success}`);
  console.log(`   Data:`, JSON.stringify(patchResult.data, null, 2));
  console.log('');

  // 6. Test HEAD - Vérifier existence
  console.log('6️⃣ Test HEAD /api/v2/agents/johnny (vérification existence)');
  try {
    const headResponse = await fetch(`${BASE_URL}/api/v2/agents/johnny`, {
      method: 'HEAD',
      headers: {
        ...defaultHeaders,
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    console.log(`   Status: ${headResponse.status}`);
    console.log(`   Headers:`, Object.fromEntries(headResponse.headers.entries()));
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // 7. Test DELETE - Suppression (soft delete)
  console.log('7️⃣ Test DELETE /api/v2/agents/test-agent (suppression)');
  const deleteResult = await makeRequest('DELETE', '/api/v2/agents/test-agent');
  console.log(`   Status: ${deleteResult.status}`);
  console.log(`   Success: ${deleteResult.success}`);
  console.log(`   Data:`, JSON.stringify(deleteResult.data, null, 2));
  console.log('');

  // 8. Test OpenAPI Schema
  console.log('8️⃣ Test GET /api/v2/openapi-schema');
  const schemaResult = await makeRequest('GET', '/api/v2/openapi-schema');
  console.log(`   Status: ${schemaResult.status}`);
  console.log(`   Success: ${schemaResult.success}`);
  if (schemaResult.success) {
    console.log(`   Schema paths count: ${Object.keys(schemaResult.data.paths || {}).length}`);
  } else {
    console.log(`   Data:`, JSON.stringify(schemaResult.data, null, 2));
  }
  console.log('');

  console.log('✅ Tests terminés !');
}

// Fonction pour tester la création d'un agent de test
async function createTestAgent() {
  console.log('🔧 Création d\'un agent de test...\n');
  
  const testAgent = {
    slug: 'test-agent',
    display_name: 'Test Agent',
    description: 'Agent de test pour les endpoints CRUD',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    system_instructions: 'Tu es un agent de test.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message de test' }
      },
      required: ['message']
    },
    output_schema: {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'Réponse de test' }
      }
    },
    temperature: 0.7,
    max_tokens: 1000
  };

  const result = await makeRequest('POST', '/api/ui/agents/specialized', testAgent);
  console.log(`   Status: ${result.status}`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Data:`, JSON.stringify(result.data, null, 2));
  console.log('');
}

// Exécution des tests
async function main() {
  console.log('🚀 Démarrage des tests des endpoints CRUD\n');
  
  // Vérifier que le serveur est en cours d'exécution
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      console.log('❌ Serveur non disponible. Assurez-vous que npm run dev est en cours d\'exécution.');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Impossible de se connecter au serveur. Assurez-vous que npm run dev est en cours d\'exécution.');
    process.exit(1);
  }

  // Créer un agent de test
  await createTestAgent();
  
  // Exécuter les tests
  await testEndpoints();
}

main().catch(console.error);
