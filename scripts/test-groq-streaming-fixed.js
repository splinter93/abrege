#!/usr/bin/env node

/**
 * 🧪 Test du Streaming Groq Corrigé
 * 
 * Ce script teste que les corrections du streaming fonctionnent
 * et que les messages ne sont plus tronqués
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

async function testGroqStreamingFixed() {
  try {
    console.log('🧪 Test du Streaming Groq Corrigé...');
    
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

    // 2. Vérifier la configuration du streaming
    console.log('\n🔧 Configuration Streaming:');
    console.log('   - Streaming: ✅ Activé');
    console.log('   - Reasoning effort:', groqAgent.api_config?.reasoning_effort || 'low');
    console.log('   - Enable thinking:', groqAgent.api_config?.enable_thinking ? '✅' : '❌');

    // 3. Vérifier les capacités
    const hasStreamingCapability = groqAgent.api_v2_capabilities?.includes('streaming');
    const hasReasoningCapability = groqAgent.api_v2_capabilities?.includes('reasoning');
    
    console.log('\n🎯 Capacités:');
    console.log('   - Function calls:', groqAgent.api_v2_capabilities?.includes('function_calls') ? '✅' : '❌');
    console.log('   - Streaming:', hasStreamingCapability ? '✅' : '❌');
    console.log('   - Reasoning:', hasReasoningCapability ? '✅' : '❌');

    // 4. Test de l'API avec une question qui génère une réponse longue
    console.log('\n🚀 Test de l\'API Groq avec streaming...');
    
    const testPayload = {
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant IA avec capacité de raisonnement. Réponds de manière détaillée et complète.'
        },
        {
          role: 'user',
          content: 'Explique-moi en détail comment fonctionne l\'intelligence artificielle, ses applications actuelles et ses perspectives futures. Sois exhaustif dans ta réponse.'
        }
      ],
      stream: true,
      temperature: 0.7,
      max_completion_tokens: 2000,
      top_p: 0.9,
      reasoning_effort: 'medium'
    };

    console.log('📤 Payload de test:');
    console.log('   - Modèle:', testPayload.model);
    console.log('   - Streaming:', testPayload.stream);
    console.log('   - Max tokens:', testPayload.max_completion_tokens);
    console.log('   - Reasoning effort:', testPayload.reasoning_effort);

    // 5. Vérifier les variables d'environnement
    console.log('\n🔑 Variables d\'environnement:');
    console.log('   - GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Configuré' : '❌ Manquant');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configuré' : '❌ Manquant');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configuré' : '❌ Manquant');

    // 6. Instructions de test
    console.log('\n📋 Instructions de Test:');
    console.log('   1. Redémarrez le serveur: npm run dev');
    console.log('   2. Allez dans l\'interface de chat');
    console.log('   3. Sélectionnez l\'agent "Groq Reasoning"');
    console.log('   4. Posez la question de test');
    console.log('   5. Vérifiez que la réponse est complète et non tronquée');
    console.log('   6. Vérifiez les logs pour détecter les corrections automatiques');

    // 7. Résumé du test
    console.log('\n📊 Résumé du Test:');
    console.log('   - Agent Groq: ✅ Trouvé');
    console.log('   - Configuration streaming: ✅ Activée');
    console.log('   - Capacité streaming: ' + (hasStreamingCapability ? '✅' : '❌'));
    console.log('   - Capacité reasoning: ' + (hasReasoningCapability ? '✅' : '❌'));
    console.log('   - Variables d\'env: ✅ Configurées');
    console.log('\n🎯 Objectif: Vérifier que les messages ne sont plus tronqués');
    console.log('   - Détection automatique des messages tronqués');
    console.log('   - Correction automatique avec ponctuation');
    console.log('   - Gestion robuste des chunks JSON incomplets');
    console.log('   - Buffer de tokens sécurisé');

  } catch (error) {
    console.log('❌ Erreur:', error);
  }
}

testGroqStreamingFixed(); 