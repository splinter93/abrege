const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AGENT_SLUG = 'harvey';
const TEST_MESSAGE = 'Liste mes classeurs pour vérifier que les tool calls fonctionnent';

// Test avec une clé d'API simulée
const TEST_API_KEY = 'scrivia-api-key-2024';

async function testHarveyAuthDebug() {
  console.log('🧪 Test de debug de l\'authentification Harvey...\n');

  try {
    console.log('📡 Test 1: Appel Harvey avec clé d\'API');
    console.log(`   Agent: ${TEST_AGENT_SLUG}`);
    console.log(`   Message: ${TEST_MESSAGE}`);
    console.log(`   Clé d'API: ${TEST_API_KEY}`);
    
    const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        ref: TEST_AGENT_SLUG,
        input: TEST_MESSAGE
      })
    });

    console.log(`\n📊 Réponse HTTP: ${response.status} ${response.statusText}`);
    console.log('📋 Headers de réponse:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    const responseText = await response.text();
    console.log(`\n📄 Corps de la réponse (${responseText.length} caractères):`);
    console.log(responseText);

    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('\n✅ Succès - Harvey a pu répondre');
      console.log(`   Agent: ${result.data?.agent_name}`);
      console.log(`   Réponse: ${result.data?.response?.substring(0, 200)}...`);
    } else {
      console.log('\n❌ Échec - Harvey n\'a pas pu répondre');
      console.log(`   Erreur: ${responseText}`);
    }

  } catch (error) {
    console.error('\n💥 Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testHarveyAuthDebug();
