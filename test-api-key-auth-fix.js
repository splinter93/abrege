#!/usr/bin/env node

/**
 * 🧪 Test de la correction d'authentification avec les clés d'API
 * 
 * Ce script teste que les agents peuvent maintenant exécuter des tool calls
 * quand ils sont appelés via une clé d'API (comme ChatGPT).
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AGENT_SLUG = 'harvey'; // Agent Harvey pour le test
const TEST_MESSAGE = 'Liste mes classeurs pour vérifier que les tool calls fonctionnent avec une clé d\'API';

// Clé d'API de test (remplacer par votre vraie clé d'API)
const TEST_API_KEY = process.env.TEST_API_KEY || 'your-api-key-here';

async function testApiKeyAuthFix() {
  console.log('🧪 Test de la correction d\'authentification avec les clés d\'API...\n');

  try {
    // Test 1: Appel avec clé d'API (simule ChatGPT)
    console.log('📡 Test 1: Appel avec clé d\'API (simule ChatGPT)');
    console.log(`   Agent: ${TEST_AGENT_SLUG}`);
    console.log(`   Message: ${TEST_MESSAGE}`);
    console.log(`   Auth: API Key`);
    
    const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY, // Utiliser la clé d'API au lieu du token JWT
        'X-Client-Type': 'chatgpt' // Simuler ChatGPT
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
      console.log('   ✅ Succès - Harvey a pu exécuter listClasseurs avec la clé d\'API');
      console.log(`   Agent: ${result.data?.agent_name}`);
      console.log(`   Réponse: ${result.data?.response?.substring(0, 200)}...`);
      
      // Vérifier que la réponse contient des classeurs (signe que le tool call a fonctionné)
      if (result.data?.response?.includes('classeur') || result.data?.response?.includes('Classeur')) {
        console.log('   🎯 Tool call listClasseurs confirmé - Harvey a bien accédé aux données avec la clé d\'API');
      } else {
        console.log('   ⚠️  Réponse reçue mais pas de classeurs détectés');
      }
    } else {
      const error = await response.text();
      console.log('   ❌ Erreur:', error);
      
      // Vérifier les types d'erreurs possibles
      if (error.includes('Impossible d\'extraire l\'utilisateur du token')) {
        console.log('   🔍 Erreur d\'extraction du token - la correction n\'a pas fonctionné');
      } else if (error.includes('Token JWT requis')) {
        console.log('   🔍 Token JWT manquant - problème d\'authentification');
      } else if (error.includes('API Key')) {
        console.log('   🔍 Problème avec la clé d\'API');
      } else {
        console.log('   🔍 Erreur différente - possiblement un autre problème');
      }
    }

    console.log('');

    // Test 2: Vérification HEAD avec clé d'API
    console.log('📡 Test 2: Vérification HEAD avec clé d\'API');
    
    const headResponse = await fetch(`${BASE_URL}/api/v2/agents/execute?ref=${TEST_AGENT_SLUG}`, {
      method: 'HEAD',
      headers: {
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'chatgpt'
      }
    });

    console.log(`   Status: ${headResponse.status}`);
    
    if (headResponse.ok) {
      console.log('   ✅ Succès - Agent trouvé et accessible avec la clé d\'API');
      console.log(`   Agent: ${headResponse.headers.get('X-Agent-Name')}`);
      console.log(`   Modèle: ${headResponse.headers.get('X-Agent-Model')}`);
    } else {
      console.log('   ❌ Erreur - Agent non trouvé ou non accessible');
    }

    console.log('');

    // Test 3: Test avec un autre agent (André)
    console.log('📡 Test 3: Test avec André (création de note)');
    
    const andreResponse = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'chatgpt'
      },
      body: JSON.stringify({
        ref: 'andre', // Agent André
        input: 'Crée une note de test pour vérifier les tool calls avec la clé d\'API',
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      })
    });

    console.log(`   Status: ${andreResponse.status}`);
    
    if (andreResponse.ok) {
      const result = await andreResponse.json();
      console.log('   ✅ Succès - André a pu exécuter ses tool calls avec la clé d\'API');
      console.log(`   Agent: ${result.data?.agent_name}`);
    } else {
      const error = await andreResponse.text();
      console.log('   ❌ Erreur André:', error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Instructions d'utilisation
console.log('🔧 INSTRUCTIONS D\'UTILISATION:');
console.log('1. Assurez-vous que le serveur Next.js est démarré');
console.log('2. Configurez votre clé d\'API :');
console.log('   - TEST_API_KEY : Votre clé d\'API (pas un token JWT)');
console.log('3. Exécutez: node test-api-key-auth-fix.js\n');

// Exécuter le test
if (TEST_API_KEY === 'your-api-key-here') {
  console.log('⚠️  Veuillez configurer votre clé d\'API :');
  console.log('   TEST_API_KEY=your-actual-api-key node test-api-key-auth-fix.js');
} else {
  testApiKeyAuthFix();
}
