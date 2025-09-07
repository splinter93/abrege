#!/usr/bin/env node

/**
 * 🧪 Test de la correction de l'extraction du token JWT
 * 
 * Ce script teste que la méthode getUserIdFromToken fonctionne maintenant
 * correctement avec l'anon key au lieu du service role key.
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AGENT_SLUG = 'harvey'; // Agent Harvey pour le test
const TEST_MESSAGE = 'Liste mes classeurs pour vérifier que les tool calls fonctionnent maintenant';

// Token JWT de test (à remplacer par un token valide)
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-jwt-token-here';

async function testTokenExtractionFix() {
  console.log('🧪 Test de la correction de l\'extraction du token JWT...\n');

  try {
    // Test avec Harvey (agent qui utilise listClasseurs)
    console.log('📡 Test avec Harvey - Tool call listClasseurs');
    
    const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        ref: TEST_AGENT_SLUG,
        input: TEST_MESSAGE,
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      })
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('   ✅ Succès - Harvey a pu exécuter listClasseurs');
      console.log(`   Agent: ${result.data?.agent_name}`);
      console.log(`   Réponse: ${result.data?.response?.substring(0, 200)}...`);
      
      // Vérifier que la réponse contient des classeurs (signe que le tool call a fonctionné)
      if (result.data?.response?.includes('classeur') || result.data?.response?.includes('Classeur')) {
        console.log('   🎯 Tool call listClasseurs confirmé - Harvey a bien accédé aux données');
      } else {
        console.log('   ⚠️  Réponse reçue mais pas de classeurs détectés');
      }
    } else {
      const error = await response.text();
      console.log('   ❌ Erreur:', error);
      
      // Vérifier si c'est encore l'erreur d'extraction du token
      if (error.includes('Impossible d\'extraire l\'utilisateur du token')) {
        console.log('   🔍 L\'erreur d\'extraction du token persiste - la correction n\'a pas fonctionné');
      } else {
        console.log('   🔍 Erreur différente - possiblement un autre problème');
      }
    }

    console.log('');

    // Test avec un autre agent si disponible
    console.log('📡 Test avec un autre agent (si disponible)');
    
    const otherAgentResponse = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        ref: 'andre', // Agent André
        input: 'Crée une note de test pour vérifier les tool calls',
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      })
    });

    console.log(`   Status: ${otherAgentResponse.status}`);
    
    if (otherAgentResponse.ok) {
      const result = await otherAgentResponse.json();
      console.log('   ✅ Succès - André a pu exécuter ses tool calls');
      console.log(`   Agent: ${result.data?.agent_name}`);
    } else {
      const error = await otherAgentResponse.text();
      console.log('   ❌ Erreur André:', error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Instructions d'utilisation
console.log('🔧 INSTRUCTIONS D\'UTILISATION:');
console.log('1. Assurez-vous que le serveur Next.js est démarré');
console.log('2. Remplacez TEST_JWT_TOKEN par un token JWT valide');
console.log('3. Vérifiez que Harvey et André sont disponibles');
console.log('4. Exécutez: node test-token-extraction-fix.js\n');

// Exécuter le test
if (TEST_JWT_TOKEN === 'your-jwt-token-here') {
  console.log('⚠️  Veuillez configurer TEST_JWT_TOKEN avec un token JWT valide');
  console.log('   Exemple: TEST_JWT_TOKEN=your-actual-jwt-token node test-token-extraction-fix.js');
} else {
  testTokenExtractionFix();
}
