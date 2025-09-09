const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AGENT_SLUG = 'harvey';
const TEST_MESSAGE = 'Liste mes classeurs pour vérifier que les tool calls fonctionnent';

// Utiliser la vraie clé d'API configurée dans l'environnement
const TEST_API_KEY = 'scrivia_18a125ef9357757ea43e5577ec096024f2f72ef8546dd1a1e93638303e026455';

async function testHarveyRealKey() {
  console.log('🧪 Test de Harvey avec la vraie clé d\'API...\n');

  try {
    console.log('📡 Test 1: Appel Harvey avec la vraie clé d\'API');
    console.log(`   Agent: ${TEST_AGENT_SLUG}`);
    console.log(`   Message: ${TEST_MESSAGE}`);
    console.log(`   Clé d'API: ${TEST_API_KEY.substring(0, 20)}...`);
    
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
      
      // Vérifier que la réponse contient des classeurs (signe que le tool call a fonctionné)
      if (result.data?.response?.includes('classeur') || result.data?.response?.includes('Classeur')) {
        console.log('   🎯 Tool call listClasseurs confirmé - Harvey a bien accédé aux données');
      } else {
        console.log('   ⚠️  Réponse reçue mais pas de classeurs détectés');
      }
    } else {
      console.log('\n❌ Échec - Harvey n\'a pas pu répondre');
      console.log(`   Erreur: ${responseText}`);
    }

  } catch (error) {
    console.error('\n💥 Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testHarveyRealKey();
