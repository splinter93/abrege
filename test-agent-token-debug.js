#!/usr/bin/env node

/**
 * Test de debug pour tracer le flux de token d'authentification
 * quand un agent appelle un autre agent via executeAgent
 */

// const fetch = require('node-fetch'); // Pas nécessaire pour ce test

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testAgentTokenDebug() {
  console.log('🔍 TEST DE DEBUG: Flux de token d\'authentification\n');

  try {
    // 1. Simuler un appel d'agent à agent avec un userId
    console.log('1️⃣ Simulation d\'un appel d\'agent à agent...');
    
    const testUserId = '12345678-1234-1234-1234-123456789012'; // UUID de test
    
    const agentCallPayload = {
      ref: 'agent-cible-tool-calls', // Supposons qu'il existe
      input: 'Peux-tu lister mes classeurs et mes notes récentes ? Utilise les outils disponibles.',
      options: {
        temperature: 0.7,
        max_tokens: 1000
      }
    };

    console.log('📤 Appel à l\'endpoint d\'exécution d\'agents...');
    console.log('   - Agent cible: agent-cible-tool-calls');
    console.log('   - UserId simulé:', testUserId);
    console.log('   - Payload:', JSON.stringify(agentCallPayload, null, 2));
    
    // Headers d'impersonation (comme le ferait l'ApiV2HttpClient)
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'agent',
      'X-User-Id': testUserId,
      'X-Service-Role': 'true'
    };
    
    console.log('\n📤 Headers envoyés:');
    console.log(JSON.stringify(headers, null, 2));
    
    // Dans un vrai test, on ferait l'appel HTTP ici
    // const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
    //   method: 'POST',
    //   headers,
    //   body: JSON.stringify(agentCallPayload)
    // });

    console.log('\n✅ Test simulé terminé');
    console.log('\n📋 Points de vérification dans les logs:');
    console.log('1. [ApiV2HttpClient] 🔑 IMPERSONATION DÉTECTÉE - userId: 12345678...');
    console.log('2. [ApiV2HttpClient] 📤 Headers d\'impersonation: {...}');
    console.log('3. [AuthUtils] 🤖 IMPERSONATION D\'AGENT DÉTECTÉE - userId: 12345678...');
    console.log('4. [AuthUtils] 🔑 Headers reçus: {...}');
    console.log('5. [Agents Execute] 🔑 TOKEN D\'AUTHENTIFICATION POUR L\'AGENT APPELÉ: {...}');
    
    console.log('\n🔍 Si l\'erreur 401 persiste, vérifier:');
    console.log('- Les headers sont-ils bien envoyés ?');
    console.log('- getAuthenticatedUser() détecte-t-il l\'impersonation ?');
    console.log('- L\'agent appelé reçoit-il le bon token ?');
    console.log('- Les tool calls de l\'agent appelé utilisent-ils le bon token ?');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testAgentTokenDebug().catch(console.error);
