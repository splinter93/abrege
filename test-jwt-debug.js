const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_API_KEY = 'scrivia_18a125ef9357757ea43e5577ec096024f2f72ef8546dd1a1e93638303e026455';

async function testJwtDebug() {
  console.log('🧪 Test de debug du JWT généré...\n');

  try {
    // Test 1: Vérifier l'endpoint de debug auth
    console.log('📡 Test 1: Debug auth avec clé d\'API');
    const authResponse = await fetch(`${BASE_URL}/api/debug/auth`, {
      method: 'GET',
      headers: {
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'test'
      }
    });

    const authResult = await authResponse.json();
    console.log('📊 Résultat auth:', authResult.authResult?.success ? '✅ Succès' : '❌ Échec');
    
    if (authResult.authResult?.success) {
      console.log(`   User ID: ${authResult.authResult.userId}`);
      console.log(`   Auth Type: ${authResult.authResult.authType}`);
    }

    // Test 2: Tester Harvey avec un message simple (sans tool calls)
    console.log('\n📡 Test 2: Harvey avec message simple');
    const harveyResponse = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        ref: 'harvey',
        input: 'Bonjour Harvey, comment ça va ?'
      })
    });

    const harveyResult = await harveyResponse.json();
    console.log('📊 Harvey simple:', harveyResponse.ok ? '✅ Succès' : '❌ Échec');
    if (harveyResponse.ok) {
      console.log(`   Réponse: ${harveyResult.data?.response?.substring(0, 100)}...`);
    }

    // Test 3: Tester Harvey avec tool call
    console.log('\n📡 Test 3: Harvey avec tool call (listClasseurs)');
    const toolCallResponse = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        ref: 'harvey',
        input: 'Liste mes classeurs'
      })
    });

    const toolCallResult = await toolCallResponse.json();
    console.log('📊 Harvey tool call:', toolCallResponse.ok ? '✅ Succès' : '❌ Échec');
    if (toolCallResponse.ok) {
      console.log(`   Réponse: ${toolCallResult.data?.response?.substring(0, 200)}...`);
      
      // Vérifier si le tool call a fonctionné
      if (toolCallResult.data?.response?.includes('classeur') || toolCallResult.data?.response?.includes('Classeur')) {
        console.log('   🎯 Tool call listClasseurs confirmé !');
      } else if (toolCallResult.data?.response?.includes('authentification') || toolCallResult.data?.response?.includes('API Key')) {
        console.log('   ❌ Tool call échoué - problème d\'authentification');
      } else {
        console.log('   ⚠️  Réponse ambiguë');
      }
    } else {
      console.log(`   Erreur: ${toolCallResult.error}`);
    }

  } catch (error) {
    console.error('\n💥 Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testJwtDebug();
