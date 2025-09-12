#!/usr/bin/env node

/**
 * Script de test pour l'endpoint agentExecution avec image
 * Teste les corrections apportées au système de traitement d'images
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_IMAGE_URL = 'https://via.placeholder.com/300x200/0066CC/FFFFFF?text=Test+Image';

async function testAgentExecutionWithImage() {
  console.log('🧪 Test de l\'endpoint agentExecution avec image...\n');

  try {
    // 1. Lister les agents disponibles
    console.log('1️⃣ Récupération des agents spécialisés...');
    const agentsResponse = await fetch(`${API_BASE}/api/v2/agents`, {
      headers: {
        'Authorization': 'Bearer test-user-id', // Token de test
        'Content-Type': 'application/json'
      }
    });

    if (!agentsResponse.ok) {
      throw new Error(`Erreur récupération agents: ${agentsResponse.status} ${agentsResponse.statusText}`);
    }

    const agentsData = await agentsResponse.json();
    console.log(`✅ ${agentsData.agents?.length || 0} agents trouvés`);

    if (!agentsData.agents || agentsData.agents.length === 0) {
      console.log('❌ Aucun agent disponible pour le test');
      return;
    }

    // Prendre le premier agent disponible
    const testAgent = agentsData.agents[0];
    console.log(`🎯 Test avec l'agent: ${testAgent.slug || testAgent.id} (${testAgent.display_name})`);
    console.log(`📋 Modèle: ${testAgent.model}`);
    console.log(`🖼️ Support multimodal: ${testAgent.model.includes('llama') || testAgent.model.includes('vision') ? 'Oui' : 'Non'}\n`);

    // 2. Tester l'exécution avec image
    console.log('2️⃣ Test d\'exécution avec image...');
    
    const testPayload = {
      text: "Analyse cette image et décris ce que tu vois",
      imageUrl: TEST_IMAGE_URL,
      prompt: "Décris l'image en détail"
    };

    console.log('📤 Payload envoyé:', JSON.stringify(testPayload, null, 2));

    const executionResponse = await fetch(`${API_BASE}/api/v2/agents/${testAgent.slug || testAgent.id}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-user-id',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (!executionResponse.ok) {
      const errorText = await executionResponse.text();
      throw new Error(`Erreur exécution agent: ${executionResponse.status} ${executionResponse.statusText}\n${errorText}`);
    }

    const executionData = await executionResponse.json();
    console.log('📥 Réponse reçue:', JSON.stringify(executionData, null, 2));

    // 3. Analyser la réponse
    console.log('\n3️⃣ Analyse de la réponse...');
    
    if (executionData.success) {
      const response = executionData.response || executionData.data?.response || executionData.result?.response;
      
      if (response && response !== 'Réponse générée' && response !== 'Aucune réponse générée') {
        console.log('✅ SUCCÈS: L\'agent a traité l\'image correctement');
        console.log(`📝 Réponse: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
      } else {
        console.log('❌ ÉCHEC: L\'agent n\'a pas traité l\'image correctement');
        console.log(`🔍 Réponse reçue: "${response}"`);
        console.log('💡 Problème possible: Détection multimodale défaillante ou exécution directe non utilisée');
      }
    } else {
      console.log('❌ ÉCHEC: L\'exécution a échoué');
      console.log(`🔍 Erreur: ${executionData.error}`);
    }

    // 4. Test avec différents formats d'image
    console.log('\n4️⃣ Test avec différents formats d\'image...');
    
    const imageFormats = [
      { key: 'image', value: TEST_IMAGE_URL },
      { key: 'imageUrl', value: TEST_IMAGE_URL },
      { key: 'image_url', value: TEST_IMAGE_URL }
    ];

    for (const format of imageFormats) {
      console.log(`\n🔍 Test avec format: ${format.key}`);
      
      const formatPayload = {
        text: "Analyse cette image",
        [format.key]: format.value
      };

      try {
        const formatResponse = await fetch(`${API_BASE}/api/v2/agents/${testAgent.slug || testAgent.id}`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-user-id',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formatPayload)
        });

        if (formatResponse.ok) {
          const formatData = await formatResponse.json();
          const response = formatData.response || formatData.data?.response || formatData.result?.response;
          
          if (response && response !== 'Réponse générée' && response !== 'Aucune réponse générée') {
            console.log(`✅ Format ${format.key}: SUCCÈS`);
          } else {
            console.log(`❌ Format ${format.key}: ÉCHEC - "${response}"`);
          }
        } else {
          console.log(`❌ Format ${format.key}: Erreur HTTP ${formatResponse.status}`);
        }
      } catch (error) {
        console.log(`❌ Format ${format.key}: Erreur - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testAgentExecutionWithImage()
    .then(() => {
      console.log('\n🎉 Test terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test échoué:', error.message);
      process.exit(1);
    });
}

module.exports = { testAgentExecutionWithImage };
