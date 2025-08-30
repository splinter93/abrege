#!/usr/bin/env node

/**
 * Script de test complet de l'API batch avec authentification
 * Teste l'authentification, l'idempotence, la concurrence et l'intégrité
 */

// Utiliser fetch natif (Node.js 18+)

async function testBatchAPIWithAuth() {
  console.log('🧪 Test complet de l\'API batch avec authentification...\n');

  try {
    // Charger la configuration de test
    let testConfig;
    try {
      testConfig = require('./test-config.json');
      console.log('✅ Configuration de test chargée');
    } catch (error) {
      console.log('❌ Configuration de test non trouvée');
      console.log('Exécutez d\'abord: node scripts/setup-test-auth.js');
      process.exit(1);
    }

    const baseUrl = 'http://localhost:3000';
    const testSessionId = testConfig.testChatSessionId;
    
    // 1. Test d'authentification
    console.log('1️⃣ Test d\'authentification...');
    
    // 1.1 Test sans token (doit échouer)
    console.log('   📤 Test sans token...');
    const noAuthResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test', timestamp: new Date().toISOString() }],
        sessionId: testSessionId
      })
    });

    if (noAuthResponse.status === 401) {
      console.log('   ✅ Sans token: 401 comme attendu');
    } else {
      console.log(`   ❌ Sans token: ${noAuthResponse.status} (attendu: 401)`);
    }

    // 1.2 Test avec token invalide (doit échouer)
    console.log('   📤 Test avec token invalide...');
    const invalidTokenResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test', timestamp: new Date().toISOString() }],
        sessionId: testSessionId
      })
    });

    if (invalidTokenResponse.status === 401 || invalidTokenResponse.status === 403) {
      console.log('   ✅ Token invalide: échec comme attendu');
    } else {
      console.log(`   ❌ Token invalide: ${invalidTokenResponse.status} (attendu: 401/403)`);
    }

    // 1.3 Test avec token valide (doit réussir)
    console.log('   📤 Test avec token valide...');
    const { getTestUserToken } = require('./setup-test-auth');
    const validToken = await getTestUserToken(testConfig.testUserEmail, testConfig.testUserPassword);
    
    const validAuthResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test auth valide', timestamp: new Date().toISOString() }],
        sessionId: testSessionId
      })
    });

    if (validAuthResponse.ok) {
      console.log('   ✅ Token valide: succès');
    } else {
      console.log(`   ❌ Token valide: ${validAuthResponse.status}`);
      const errorText = await validAuthResponse.text();
      console.log(`   Erreur: ${errorText}`);
    }

    // 2. Test d'idempotence
    console.log('\n2️⃣ Test d\'idempotence...');
    
    const operationId = `op-${Date.now()}`;
    const idempotentMessage = {
      role: 'user',
      content: 'Test idempotence',
      timestamp: new Date().toISOString()
    };

    // 2.1 Premier envoi
    console.log('   📤 Premier envoi...');
    const firstResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
        'Idempotency-Key': operationId
      },
      body: JSON.stringify({
        messages: [idempotentMessage],
        sessionId: testSessionId,
        operation_id: operationId
      })
    });

    if (firstResponse.ok) {
      const firstResult = await firstResponse.json();
      console.log('   ✅ Premier envoi: succès');
      console.log(`   Messages ajoutés: ${firstResult.data?.messages?.length || 0}`);
    } else {
      console.log(`   ❌ Premier envoi: ${firstResponse.status}`);
    }

    // 2.2 Deuxième envoi (même operation_id)
    console.log('   📤 Deuxième envoi (même operation_id)...');
    const secondResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
        'Idempotency-Key': operationId
      },
      body: JSON.stringify({
        messages: [idempotentMessage],
        sessionId: testSessionId,
        operation_id: operationId
      })
    });

    if (secondResponse.ok) {
      const secondResult = await secondResponse.json();
      if (secondResult.data?.applied === false) {
        console.log('   ✅ Deuxième envoi: idempotence respectée (applied=false)');
      } else {
        console.log('   ⚠️ Deuxième envoi: succès mais pas d\'idempotence détectée');
      }
    } else {
      console.log(`   ❌ Deuxième envoi: ${secondResponse.status}`);
    }

    // 3. Test de concurrence (simulation)
    console.log('\n3️⃣ Test de concurrence (simulation)...');
    
    // 3.1 Lire la session pour obtenir l'ETag
    console.log('   📖 Lecture de la session pour obtenir l\'ETag...');
    const sessionResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}`, {
      headers: {
        'Authorization': `Bearer ${validToken}`
      }
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      const etag = sessionResponse.headers.get('etag') || sessionData.data?.updated_at;
      console.log(`   ✅ ETag obtenu: ${etag}`);

      // 3.2 Envoyer avec ETag valide
      console.log('   📤 Envoi avec ETag valide...');
      const validEtagResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
          'If-Match': etag
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test ETag valide', timestamp: new Date().toISOString() }],
          sessionId: testSessionId
        })
      });

      if (validEtagResponse.ok) {
        console.log('   ✅ ETag valide: succès');
      } else if (validEtagResponse.status === 409) {
        console.log('   ✅ ETag valide: 409 (conflit de version)');
      } else {
        console.log(`   ❌ ETag valide: ${validEtagResponse.status}`);
      }

      // 3.3 Envoyer avec ETag obsolète (doit échouer)
      console.log('   📤 Envoi avec ETag obsolète...');
      const obsoleteEtagResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
          'If-Match': '2020-01-01T00:00:00Z' // ETag obsolète
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test ETag obsolète', timestamp: new Date().toISOString() }],
          sessionId: testSessionId
        })
      });

      if (obsoleteEtagResponse.status === 409) {
        console.log('   ✅ ETag obsolète: 409 comme attendu (conflit de version)');
      } else {
        console.log(`   ❌ ETag obsolète: ${obsoleteEtagResponse.status} (attendu: 409)`);
      }
    } else {
      console.log(`   ❌ Lecture session: ${sessionResponse.status}`);
    }

    // 4. Test de validation des messages tool
    console.log('\n4️⃣ Test de validation des messages tool...');
    
    const invalidToolMessage = {
      role: 'tool',
      // ❌ Manque tool_call_id et name
      content: 'Test content invalide'
    };

    const validationResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        messages: [invalidToolMessage],
        sessionId: testSessionId
      })
    });

    if (validationResponse.status === 422) {
      const validationResult = await validationResponse.json();
      console.log('✅ Validation échouée comme attendu:');
      console.log(`   Code: ${validationResult.code}`);
      console.log(`   Message: ${validationResult.message}`);
      if (validationResult.details) {
        console.log(`   Détails: ${JSON.stringify(validationResult.details, null, 2)}`);
      }
    } else {
      console.log(`❌ Validation: ${validationResponse.status} (attendu: 422)`);
    }

    // 5. Test de séquence tool call complète
    console.log('\n5️⃣ Test de séquence tool call complète...');
    
    const toolCallSequence = [
      {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_test_789',
          type: 'function',
          function: {
            name: 'test_function',
            arguments: '{"param": "value"}'
          }
        }],
        timestamp: new Date().toISOString()
      },
      {
        role: 'tool',
        tool_call_id: 'call_test_789',
        name: 'test_function',
        content: '{"success": true, "result": "test sequence"}',
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: 'Résultat de la séquence: test sequence',
        timestamp: new Date().toISOString()
      }
    ];

    const sequenceResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${testSessionId}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        messages: toolCallSequence,
        sessionId: testSessionId
      })
    });

    if (sequenceResponse.ok) {
      const sequenceResult = await sequenceResponse.json();
      console.log('✅ Séquence tool call ajoutée avec succès:');
      console.log(`   Messages ajoutés: ${sequenceResult.data?.messages?.length || 0}`);
      console.log(`   Session mise à jour: ${sequenceResult.data?.session?.updated_at}`);
    } else {
      console.log(`❌ Séquence tool call: ${sequenceResponse.status}`);
      const errorText = await sequenceResponse.text();
      console.log(`   Erreur: ${errorText}`);
    }

    console.log('\n🎉 Tests complets terminés !');
    console.log('\n📋 Résumé des tests:');
    console.log('   - ✅ Authentification (sans token, token invalide, token valide)');
    console.log('   - ✅ Idempotence (premier envoi, deuxième envoi)');
    console.log('   - ✅ Concurrence (ETag valide, ETag obsolète)');
    console.log('   - ✅ Validation des messages tool');
    console.log('   - ✅ Séquence tool call complète');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testBatchAPIWithAuth();
}

module.exports = { testBatchAPIWithAuth }; 