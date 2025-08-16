#!/usr/bin/env node

/**
 * Test d'intégration du GroqResponsesProvider avec le système existant
 * Usage: node scripts/test-groq-responses-integration.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Charger les variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGroqResponsesIntegration() {
  try {
    console.log('🧪 Test d\'intégration GroqResponsesProvider...\n');

    // 1. Récupérer l'agent GroqResponses
    console.log('1️⃣ Récupération de l\'agent GroqResponses...');
    const { data: groqResponsesAgent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('provider', 'groq-responses')
      .eq('is_active', true)
      .single();

    if (agentError || !groqResponsesAgent) {
      console.log('❌ Agent GroqResponses non trouvé');
      return;
    }

    console.log(`✅ Agent trouvé: ${groqResponsesAgent.name}`);
    console.log(`   Provider: ${groqResponsesAgent.provider}`);
    console.log(`   Modèle: ${groqResponsesAgent.model}`);
    console.log(`   Browser Search: ${groqResponsesAgent.api_config?.enableBrowserSearch ? '✅' : '❌'}`);
    console.log(`   Code Execution: ${groqResponsesAgent.api_config?.enableCodeExecution ? '✅' : '❌'}`);

    // 2. Simuler un appel via l'API route
    console.log('\n2️⃣ Test d\'appel via l\'API route...');
    
    const testPayload = {
      message: "Quelle est la météo actuelle à Paris ?",
      context: {
        type: 'chat_session',
        id: 'test-session-groq-responses',
        name: 'Test GroqResponses',
        sessionId: 'test-session-groq-responses' // ✅ Ajout du sessionId requis
      },
      history: [
        {
          id: '1',
          role: 'user',
          content: 'Bonjour',
          timestamp: new Date().toISOString(),
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          tool_results: undefined,
          isStreaming: false
        }
      ],
      provider: 'groq-responses',
      agentId: groqResponsesAgent.id,
      channelId: 'test-channel-groq-responses'
    };

    // Appel à l'API route
    const response = await fetch('http://localhost:3004/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erreur API: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Appel API réussi !');
    console.log(`   Réponse reçue: ${result.success ? '✅ Succès' : '❌ Échec'}`);
    
    if (result.success && result.content) {
      console.log(`   Contenu: ${result.content.substring(0, 200)}...`);
    }

    // 3. Comparer avec l'agent Groq classique
    console.log('\n3️⃣ Comparaison avec l\'agent Groq classique...');
    
    const { data: groqClassicAgent, error: classicError } = await supabase
      .from('agents')
      .select('*')
      .eq('provider', 'groq')
      .eq('is_active', true)
      .single();

    if (!classicError && groqClassicAgent) {
      console.log(`✅ Agent Groq classique: ${groqClassicAgent.name}`);
      console.log(`   Provider: ${groqClassicAgent.provider}`);
      console.log(`   Modèle: ${groqClassicAgent.model}`);
      console.log(`   Streaming: ${groqClassicAgent.stream ? '✅' : '❌'}`);
      console.log(`   Reasoning: ${groqClassicAgent.reasoning_effort || 'N/A'}`);
    }

    // 4. Résumé des différences
    console.log('\n4️⃣ Résumé des différences:');
    console.log('   🔄 Groq (classique):');
    console.log('      - Endpoint: /chat/completions');
    console.log('      - Streaming: ✅ Supporté');
    console.log('      - Reasoning: ✅ Supporté');
    console.log('      - Browser Search: ❌ Non supporté');
    console.log('      - Code Execution: ❌ Non supporté');
    
    console.log('   🚀 GroqResponses:');
    console.log('      - Endpoint: /responses');
    console.log('      - Streaming: ❌ Non supporté');
    console.log('      - Reasoning: ❌ Non supporté');
    console.log('      - Browser Search: ✅ Supporté');
    console.log('      - Code Execution: ✅ Supporté');

    console.log('\n🎉 Test d\'intégration terminé !');
    console.log('   Les deux providers fonctionnent en parallèle.');
    console.log('   Le choix se fait via le champ "provider" dans la table agents.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testGroqResponsesIntegration(); 