#!/usr/bin/env node

/**
 * Script de test pour déboguer l'authentification ChatGPT
 * Simule les requêtes ChatGPT et teste différents formats de headers
 */

const fetch = require('node-fetch');

// Configuration de test
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  debugEndpoint: '/api/debug-chatgpt',
  classeursEndpoint: '/api/v1/classeurs',
  testToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
};

async function testChatGPTAuth() {
  console.log('🧪 TEST DE L\'AUTHENTIFICATION CHATGPT');
  console.log('=====================================\n');

  try {
    // 1. Test de l'endpoint de débogage
    console.log('1️⃣ Test de l\'endpoint de débogage...');
    await testDebugEndpoint();
    
    // 2. Test avec différents formats de headers d'authentification
    console.log('\n2️⃣ Test avec différents formats de headers d\'authentification...');
    await testAuthHeaders();
    
    // 3. Test de l'endpoint classeurs avec authentification
    console.log('\n3️⃣ Test de l\'endpoint classeurs avec authentification...');
    await testClasseursEndpoint();
    
    console.log('\n✅ Tests terminés ! Vérifiez les logs du serveur pour plus de détails.');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

async function testDebugEndpoint() {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.debugEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ChatGPT/1.0 (OpenAI)',
        'X-ChatGPT-Version': '1.0.0',
        'Authorization': `Bearer ${TEST_CONFIG.testToken}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Test message' }
        ],
        model: 'gpt-4',
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'list_classeurs',
              arguments: '{}'
            }
          }
        ]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Endpoint de débogage accessible');
      console.log('   📊 Résumé:', data.debug);
    } else {
      console.log('   ❌ Endpoint de débogage inaccessible:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Erreur endpoint de débogage:', error.message);
  }
}

async function testAuthHeaders() {
  const testCases = [
    {
      name: 'Header Authorization standard',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.testToken}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Header Authorization avec espace',
      headers: {
        'Authorization': `Bearer  ${TEST_CONFIG.testToken}`, // Double espace
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Header Authorization en minuscules',
      headers: {
        'authorization': `Bearer ${TEST_CONFIG.testToken}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Header Authorization avec majuscules',
      headers: {
        'AUTHORIZATION': `Bearer ${TEST_CONFIG.testToken}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Header personnalisé ChatGPT',
      headers: {
        'X-ChatGPT-Auth': `Bearer ${TEST_CONFIG.testToken}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Header Token au lieu d\'Authorization',
      headers: {
        'Token': `Bearer ${TEST_CONFIG.testToken}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Header Bearer sans 'Authorization'',
      headers: {
        'Bearer': TEST_CONFIG.testToken,
        'Content-Type': 'application/json'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`   🔍 Test: ${testCase.name}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.debugEndpoint}`, {
        method: 'POST',
        headers: testCase.headers,
        body: JSON.stringify({ test: 'auth_header_test' })
      });
      
      if (response.ok) {
        const data = await response.json();
        const authHeaders = data.debug.authHeaders;
        console.log(`      ✅ Réponse: ${authHeaders.length} header(s) d'auth détecté(s):`, authHeaders);
      } else {
        console.log(`      ❌ Erreur: ${response.status}`);
      }
    } catch (error) {
      console.log(`      ❌ Erreur: ${error.message}`);
    }
  }
}

async function testClasseursEndpoint() {
  const testCases = [
    {
      name: 'Sans authentification',
      headers: {},
      expectedStatus: 401
    },
    {
      name: 'Avec Authorization standard',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.testToken}`,
        'Content-Type': 'application/json'
      },
      expectedStatus: 401 // Token invalide, mais devrait être reçu
    },
    {
      name: 'Avec User-Agent ChatGPT',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.testToken}`,
        'User-Agent': 'ChatGPT/1.0 (OpenAI)',
        'Content-Type': 'application/json'
      },
      expectedStatus: 401
    }
  ];

  for (const testCase of testCases) {
    console.log(`   🔍 Test: ${testCase.name}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.classeursEndpoint}`, {
        method: 'GET',
        headers: testCase.headers
      });
      
      console.log(`      📊 Status: ${response.status} (attendu: ${testCase.expectedStatus})`);
      
      if (response.status === 401) {
        try {
          const errorData = await response.json();
          console.log(`      📝 Erreur:`, errorData);
        } catch {
          console.log(`      📝 Erreur: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.log(`      ❌ Erreur: ${error.message}`);
    }
  }
}

// Exécuter les tests
if (require.main === module) {
  testChatGPTAuth();
}

module.exports = { testChatGPTAuth };
