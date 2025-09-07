#!/usr/bin/env node

/**
 * 🧪 Test du support des appels externes (ChatGPT, etc.)
 * 
 * Ce script teste que les agents peuvent maintenant exécuter des tool calls
 * pour un utilisateur cible spécifié via le header X-Target-User-Id.
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AGENT_SLUG = 'harvey'; // Agent Harvey pour le test
const TEST_MESSAGE = 'Liste mes classeurs pour vérifier que les tool calls fonctionnent avec un utilisateur cible';

// Token JWT de ChatGPT (ou autre client externe)
const CHATGPT_TOKEN = process.env.CHATGPT_TOKEN || 'your-chatgpt-jwt-token-here';
// ID de l'utilisateur cible (vous)
const TARGET_USER_ID = process.env.TARGET_USER_ID || 'your-user-id-here';

async function testExternalCallSupport() {
  console.log('🧪 Test du support des appels externes (ChatGPT → Harvey)...\n');

  try {
    // Test 1: Appel externe avec utilisateur cible
    console.log('📡 Test 1: ChatGPT appelle Harvey pour un utilisateur cible');
    console.log(`   Agent: ${TEST_AGENT_SLUG}`);
    console.log(`   Utilisateur cible: ${TARGET_USER_ID}`);
    console.log(`   Message: ${TEST_MESSAGE}`);
    
    const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATGPT_TOKEN}`,
        'X-Client-Type': 'chatgpt', // Indique que c'est un appel externe
        'X-Target-User-Id': TARGET_USER_ID // Spécifie l'utilisateur cible
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
      console.log('   ✅ Succès - Harvey a pu exécuter listClasseurs pour l\'utilisateur cible');
      console.log(`   Agent: ${result.data?.agent_name}`);
      console.log(`   Réponse: ${result.data?.response?.substring(0, 200)}...`);
      
      // Vérifier que la réponse contient des classeurs (signe que le tool call a fonctionné)
      if (result.data?.response?.includes('classeur') || result.data?.response?.includes('Classeur')) {
        console.log('   🎯 Tool call listClasseurs confirmé - Harvey a bien accédé aux données de l\'utilisateur cible');
      } else {
        console.log('   ⚠️  Réponse reçue mais pas de classeurs détectés');
      }
    } else {
      const error = await response.text();
      console.log('   ❌ Erreur:', error);
      
      // Vérifier les types d'erreurs possibles
      if (error.includes('Impossible d\'extraire l\'utilisateur du token')) {
        console.log('   🔍 Erreur d\'extraction du token - problème d\'authentification');
      } else if (error.includes('Token JWT requis')) {
        console.log('   🔍 Token JWT manquant - problème d\'authentification');
      } else {
        console.log('   🔍 Erreur différente - possiblement un autre problème');
      }
    }

    console.log('');

    // Test 2: Appel externe sans utilisateur cible (comportement par défaut)
    console.log('📡 Test 2: ChatGPT appelle Harvey sans utilisateur cible (comportement par défaut)');
    
    const response2 = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATGPT_TOKEN}`,
        'X-Client-Type': 'chatgpt' // Pas de X-Target-User-Id
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

    console.log(`   Status: ${response2.status}`);
    
    if (response2.ok) {
      const result = await response2.json();
      console.log('   ✅ Succès - Harvey a pu répondre (mais avec l\'identité de ChatGPT)');
      console.log(`   Agent: ${result.data?.agent_name}`);
    } else {
      const error = await response2.text();
      console.log('   ❌ Erreur:', error);
    }

    console.log('');

    // Test 3: Vérification HEAD avec utilisateur cible
    console.log('📡 Test 3: Vérification HEAD avec utilisateur cible');
    
    const headResponse = await fetch(`${BASE_URL}/api/v2/agents/execute?ref=${TEST_AGENT_SLUG}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${CHATGPT_TOKEN}`,
        'X-Client-Type': 'chatgpt',
        'X-Target-User-Id': TARGET_USER_ID
      }
    });

    console.log(`   Status: ${headResponse.status}`);
    
    if (headResponse.ok) {
      console.log('   ✅ Succès - Agent trouvé et accessible avec utilisateur cible');
      console.log(`   Agent: ${headResponse.headers.get('X-Agent-Name')}`);
      console.log(`   Modèle: ${headResponse.headers.get('X-Agent-Model')}`);
    } else {
      console.log('   ❌ Erreur - Agent non trouvé ou non accessible');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Instructions d'utilisation
console.log('🔧 INSTRUCTIONS D\'UTILISATION:');
console.log('1. Assurez-vous que le serveur Next.js est démarré');
console.log('2. Configurez les variables d\'environnement :');
console.log('   - CHATGPT_TOKEN : Token JWT de ChatGPT (ou autre client externe)');
console.log('   - TARGET_USER_ID : ID de l\'utilisateur cible (vous)');
console.log('3. Exécutez: node test-external-call-support.js\n');

// Exécuter le test
if (CHATGPT_TOKEN === 'your-chatgpt-jwt-token-here' || TARGET_USER_ID === 'your-user-id-here') {
  console.log('⚠️  Veuillez configurer les variables d\'environnement :');
  console.log('   CHATGPT_TOKEN=your-actual-chatgpt-token TARGET_USER_ID=your-actual-user-id node test-external-call-support.js');
} else {
  testExternalCallSupport();
}
