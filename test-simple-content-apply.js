/**
 * Test simple pour l'endpoint content:apply
 * Teste les cas d'usage de base
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testSimpleContentApply() {
  console.log('🧪 TEST SIMPLE CONTENT APPLY');
  console.log('============================');

  // Test 1: Dry-run avec insertion par position
  console.log('\n📝 Test 1: Dry-run insertion par position...');
  
  const testPayload = {
    ops: [{
      id: 'test-op-1',
      action: 'insert',
      target: {
        type: 'position',
        position: {
          mode: 'start'
        }
      },
      where: 'at',
      content: '# Test Content Apply\n\nCeci est un test de l\'endpoint content:apply.\n\n'
    }],
    dry_run: true,
    return: 'diff'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/v2/note/test-note/content:apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key'
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Test réussi !');
    } else {
      console.log('❌ Test échoué');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  // Test 2: Validation d'erreur
  console.log('\n📝 Test 2: Validation d\'erreur...');
  
  const invalidPayload = {
    ops: [{
      id: 'test-op-2',
      action: 'invalid_action', // Action invalide
      target: {
        type: 'position',
        position: {
          mode: 'start'
        }
      },
      where: 'at',
      content: 'Test'
    }],
    dry_run: true
  };

  try {
    const response = await fetch(`${BASE_URL}/api/v2/note/test-note/content:apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key'
      },
      body: JSON.stringify(invalidPayload)
    });

    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 422) {
      console.log('✅ Validation d\'erreur fonctionne !');
    } else {
      console.log('❌ Validation d\'erreur échouée');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter les tests
testSimpleContentApply().catch(console.error);
