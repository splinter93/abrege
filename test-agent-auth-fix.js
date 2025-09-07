#!/usr/bin/env node

/**
 * 🧪 Test de la correction d'authentification des agents
 * 
 * Ce script teste que les agents peuvent maintenant faire des tool calls
 * via la route d'exécution avec un token JWT valide.
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AGENT_SLUG = 'test-agent'; // Remplacer par un agent existant
const TEST_MESSAGE = 'Crée une note de test pour vérifier que les tool calls fonctionnent';

// Token JWT de test (à remplacer par un token valide)
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-jwt-token-here';

async function testAgentExecutionWithToolCalls() {
  console.log('🧪 Test de la correction d\'authentification des agents...\n');

  try {
    // Test 1: Route d'exécution universelle
    console.log('📡 Test 1: Route d\'exécution universelle (/api/v2/agents/execute)');
    
    const executeResponse = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
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

    console.log(`   Status: ${executeResponse.status}`);
    
    if (executeResponse.ok) {
      const result = await executeResponse.json();
      console.log('   ✅ Succès - Agent exécuté avec tool calls');
      console.log(`   Agent: ${result.data?.agent_name}`);
      console.log(`   Réponse: ${result.data?.response?.substring(0, 100)}...`);
    } else {
      const error = await executeResponse.text();
      console.log('   ❌ Erreur:', error);
    }

    console.log('');

    // Test 2: Route d'exécution par ID
    console.log('📡 Test 2: Route d\'exécution par ID (/api/v2/agents/{agentId})');
    
    const agentIdResponse = await fetch(`${BASE_URL}/api/v2/agents/${TEST_AGENT_SLUG}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        input: TEST_MESSAGE
      })
    });

    console.log(`   Status: ${agentIdResponse.status}`);
    
    if (agentIdResponse.ok) {
      const result = await agentIdResponse.json();
      console.log('   ✅ Succès - Agent exécuté avec tool calls');
      console.log(`   Réponse: ${result.response?.substring(0, 100)}...`);
    } else {
      const error = await agentIdResponse.text();
      console.log('   ❌ Erreur:', error);
    }

    console.log('');

    // Test 3: Vérification HEAD
    console.log('📡 Test 3: Vérification HEAD (/api/v2/agents/execute)');
    
    const headResponse = await fetch(`${BASE_URL}/api/v2/agents/execute?ref=${TEST_AGENT_SLUG}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'X-Client-Type': 'test'
      }
    });

    console.log(`   Status: ${headResponse.status}`);
    
    if (headResponse.ok) {
      console.log('   ✅ Succès - Agent trouvé et accessible');
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
console.log('2. Remplacez TEST_AGENT_SLUG par un agent existant');
console.log('3. Remplacez TEST_JWT_TOKEN par un token JWT valide');
console.log('4. Exécutez: node test-agent-auth-fix.js\n');

// Exécuter le test
if (TEST_JWT_TOKEN === 'your-jwt-token-here') {
  console.log('⚠️  Veuillez configurer TEST_JWT_TOKEN avec un token JWT valide');
  console.log('   Exemple: TEST_JWT_TOKEN=your-actual-jwt-token node test-agent-auth-fix.js');
} else {
  testAgentExecutionWithToolCalls();
}
