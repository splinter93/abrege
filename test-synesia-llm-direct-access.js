#!/usr/bin/env node

/**
 * Test d'accès à l'API LLM Direct de Synesia
 * Usage: node test-synesia-llm-direct-access.js
 */

// Configuration
const SYNESIA_API_KEY = process.env.SYNESIA_API_KEY || "apiKey.57.MTU5ZGRhMzAtMmU0Zi00YjMzLTgzYmItNWM3ZmI2ZDY1MzI0";
const SYNESIA_PROJECT_ID = process.env.SYNESIA_PROJECT_ID || "061565d9-8bd1-4428-b5d7-a59b4b0622ac";

/**
 * Test 1: Vérifier l'accès à l'API LLM Direct
 */
async function testLLMDirectAccess() {
  console.log('🧪 Test 1: Vérifier l\'accès à l\'API LLM Direct');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Hello, can you help me?'
      }
    ],
    model_id: 'gpt-4'
  };

  try {
    console.log('📤 Envoi de la requête à l\'API LLM Direct...');
    console.log('🔑 Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `ApiKey ${SYNESIA_API_KEY.substring(0, 20)}...`,
      'X-Project-ID': SYNESIA_PROJECT_ID
    });
    
    const response = await fetch('https://api.synesia.app/llm-exec/round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 Status:', response.status);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur:', errorText);
      return { success: false, error: errorText, status: response.status };
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Vérifier l'accès à l'API Execution (votre système actuel)
 */
async function testExecutionAPI() {
  console.log('\n🧪 Test 2: Vérifier l\'accès à l\'API Execution (système actuel)');
  
  const payload = {
    callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
    args: "Hello, can you help me?",
    settings: {
      history_messages: []
    }
  };

  try {
    console.log('📤 Envoi de la requête à l\'API Execution...');
    
    const response = await fetch('https://api.synesia.app/execution?wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 Status:', response.status);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur:', errorText);
      return { success: false, error: errorText, status: response.status };
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Vérifier les modèles disponibles
 */
async function testAvailableModels() {
  console.log('\n🧪 Test 3: Vérifier les modèles disponibles');
  
  try {
    // Test avec différents modèles
    const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'o1-preview'];
    
    for (const model of models) {
      console.log(`\n🔍 Test avec le modèle: ${model}`);
      
      const payload = {
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        model_id: model
      };

      const response = await fetch('https://api.synesia.app/llm-exec/round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
          'X-Project-ID': SYNESIA_PROJECT_ID,
        },
        body: JSON.stringify(payload)
      });

      console.log(`📡 Status pour ${model}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${model} fonctionne:`, data);
        return { success: true, workingModel: model, data };
      } else {
        const errorText = await response.text();
        console.log(`❌ ${model} ne fonctionne pas:`, errorText);
      }
    }
    
    return { success: false, error: 'Aucun modèle ne fonctionne' };
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fonction principale
 */
async function runTests() {
  console.log('🚀 Test d\'accès à l\'API Synesia');
  console.log('🔑 Configuration:', {
    hasApiKey: !!SYNESIA_API_KEY,
    hasProjectId: !!SYNESIA_PROJECT_ID,
    apiKeyPrefix: SYNESIA_API_KEY.substring(0, 20) + '...'
  });

  const results = [];

  // Test 1: API LLM Direct
  results.push(await testLLMDirectAccess());
  
  // Test 2: API Execution (système actuel)
  results.push(await testExecutionAPI());
  
  // Test 3: Modèles disponibles
  results.push(await testAvailableModels());

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS');
  console.log('====================');
  
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`✅ Tests réussis: ${successfulTests}/${totalTests}`);
  
  if (successfulTests > 0) {
    console.log('🎉 Au moins un test a réussi !');
    
    if (results[0].success) {
      console.log('💡 L\'API LLM Direct est accessible');
    }
    
    if (results[1].success) {
      console.log('💡 L\'API Execution fonctionne (votre système actuel)');
    }
    
    if (results[2].success) {
      console.log('💡 Modèle compatible trouvé:', results[2].workingModel);
    }
  } else {
    console.log('⚠️ Aucun test n\'a réussi');
    console.log('🔍 Vérifiez votre configuration Synesia');
  }

  console.log('\n📋 Recommandations:');
  console.log('1. Si l\'API LLM Direct ne fonctionne pas, utilisez votre système actuel');
  console.log('2. Contactez Synesia pour vérifier l\'accès à l\'API LLM Direct');
  console.log('3. Vérifiez que votre compte a les permissions nécessaires');
}

// Exécuter les tests
runTests().catch(console.error); 