#!/usr/bin/env node

/**
 * Test de l'endpoint d'exécution des agents après correction
 * Vérifie que la vraie réponse du LLM est retournée au lieu de "Réponse générée"
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const TEST_AGENT_SLUG = 'test-agent'; // Remplacez par un agent existant

async function testAgentExecute() {
  console.log('🧪 Test de l\'endpoint d\'exécution des agents...\n');

  try {
    // Test avec un agent existant
    const response = await fetch(`${API_BASE}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Remplacez par un vrai token
      },
      body: JSON.stringify({
        ref: TEST_AGENT_SLUG,
        input: 'Bonjour, peux-tu me dire bonjour en retour ?',
        options: {
          temperature: 0.7
        }
      })
    });

    const result = await response.json();
    
    console.log('📊 Résultat de l\'exécution:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    
    if (result.success && result.data) {
      console.log('Agent:', result.data.agent_name);
      console.log('Modèle:', result.data.model_used);
      console.log('Temps d\'exécution:', result.data.execution_time + 'ms');
      console.log('\n📝 Réponse reçue:');
      console.log('─'.repeat(50));
      console.log(result.data.response);
      console.log('─'.repeat(50));
      
      // Vérifier si c'est la vraie réponse ou le fallback
      if (result.data.response === 'Réponse générée') {
        console.log('\n❌ PROBLÈME: La réponse est toujours le fallback "Réponse générée"');
        console.log('🔍 Vérifiez les logs du serveur pour voir pourquoi orchestratorResult.content est vide');
      } else {
        console.log('\n✅ SUCCÈS: La vraie réponse du LLM est retournée !');
        console.log('📏 Longueur de la réponse:', result.data.response.length, 'caractères');
      }
    } else {
      console.log('❌ Erreur:', result.error || result.message);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Fonction pour lister les agents disponibles
async function listAvailableAgents() {
  console.log('📋 Récupération des agents disponibles...\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/v2/agents`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Remplacez par un vrai token
      }
    });

    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('Agents disponibles:');
      result.data.forEach(agent => {
        console.log(`- ${agent.slug} (${agent.display_name}) - ${agent.model}`);
      });
    } else {
      console.log('❌ Erreur lors de la récupération des agents:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter les tests
async function main() {
  console.log('🚀 Test de correction de l\'endpoint d\'exécution des agents\n');
  
  // D'abord lister les agents
  await listAvailableAgents();
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Puis tester l'exécution
  await testAgentExecute();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAgentExecute, listAvailableAgents };
