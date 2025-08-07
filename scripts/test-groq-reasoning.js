#!/usr/bin/env node

/**
 * 🧠 Test du Reasoning Groq GPT-OSS
 * 
 * Ce script teste que le reasoning fonctionne correctement avec Groq
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables d\'environnement Supabase manquantes');
  console.log('   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGroqReasoning() {
  try {
    console.log('🧪 Test du Reasoning Groq GPT-OSS...');
    
    // 1. Vérifier que l'agent Groq existe
    const { data: groqAgent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('provider', 'groq')
      .eq('model', 'openai/gpt-oss-120b')
      .single();

    if (agentError || !groqAgent) {
      console.log('❌ Agent Groq non trouvé');
      console.log('   Exécutez d\'abord: node scripts/create-groq-reasoning-agent.js');
      return;
    }

    console.log('✅ Agent Groq trouvé:', groqAgent.name);
    console.log('   ID:', groqAgent.id);
    console.log('   Provider:', groqAgent.provider);
    console.log('   Modèle:', groqAgent.model);
    console.log('   Reasoning effort:', groqAgent.api_config?.reasoning_effort);

    // 2. Vérifier la configuration du reasoning
    const hasReasoningConfig = groqAgent.api_config?.reasoning_effort === 'medium';
    console.log('\n🔧 Configuration Reasoning:');
    console.log('   - Reasoning effort: medium:', hasReasoningConfig ? '✅' : '❌');
    console.log('   - Enable thinking: true:', groqAgent.api_config?.enable_thinking ? '✅' : '❌');

    // 3. Vérifier les capacités
    const hasReasoningCapability = groqAgent.api_v2_capabilities?.includes('reasoning');
    console.log('\n🎯 Capacités:');
    console.log('   - Function calls:', groqAgent.api_v2_capabilities?.includes('function_calls') ? '✅' : '❌');
    console.log('   - Streaming:', groqAgent.api_v2_capabilities?.includes('streaming') ? '✅' : '❌');
    console.log('   - Reasoning:', hasReasoningCapability ? '✅' : '❌');

    // 4. Test de l'API
    console.log('\n🚀 Test de l\'API Groq...');
    
    const testPayload = {
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant IA avec capacité de raisonnement. Montre ton processus de pensée.'
        },
        {
          role: 'user',
          content: 'Explique-moi la théorie de la relativité en détail.'
        }
      ],
      stream: true,
      temperature: 0.7,
      max_completion_tokens: 1000,
      top_p: 0.9,
      reasoning_effort: 'medium'
    };

    console.log('📤 Payload de test:');
    console.log('   - Modèle:', testPayload.model);
    console.log('   - Reasoning effort:', testPayload.reasoning_effort);
    console.log('   - Temperature:', testPayload.temperature);
    console.log('   - Max tokens:', testPayload.max_completion_tokens);

    // 5. Vérifier les variables d'environnement
    console.log('\n🔑 Variables d\'environnement:');
    console.log('   - GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Configuré' : '❌ Manquant');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configuré' : '❌ Manquant');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configuré' : '❌ Manquant');

    // 6. Résumé du test
    console.log('\n📊 Résumé du Test:');
    console.log('   - Agent Groq: ✅ Trouvé');
    console.log('   - Configuration reasoning: ' + (hasReasoningConfig ? '✅' : '❌'));
    console.log('   - Capacité reasoning: ' + (hasReasoningCapability ? '✅' : '❌'));
    console.log('   - Variables d\'environnement: ' + (process.env.GROQ_API_KEY ? '✅' : '❌'));

    if (hasReasoningConfig && hasReasoningCapability && process.env.GROQ_API_KEY) {
      console.log('\n🎉 Le reasoning Groq devrait fonctionner !');
      console.log('   Testez avec une question complexe dans l\'interface.');
    } else {
      console.log('\n⚠️ Problèmes détectés:');
      if (!hasReasoningConfig) console.log('   - Reasoning effort non configuré');
      if (!hasReasoningCapability) console.log('   - Capacité reasoning manquante');
      if (!process.env.GROQ_API_KEY) console.log('   - Clé API Groq manquante');
    }

  } catch (error) {
    console.log('❌ Erreur:', error);
  }
}

// Exécuter le test
testGroqReasoning(); 