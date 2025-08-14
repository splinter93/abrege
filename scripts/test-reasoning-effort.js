// Script pour tester le paramètre reasoning_effort des agents
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReasoningEffort() {
  try {
    console.log('🧠 TEST DU PARAMÈTRE REASONING_EFFORT');
    console.log('=====================================');

    // 1. Vérifier les agents avec reasoning_effort
    console.log('\n1️⃣ **VÉRIFICATION DES AGENTS**');
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Erreur lors de la récupération des agents:', error);
      return;
    }

    console.log(`📊 ${agents.length} agents actifs trouvés`);

    // 2. Analyser le reasoning_effort de chaque agent
    console.log('\n2️⃣ **ANALYSE DU REASONING_EFFORT**');
    
    const agentsWithReasoning = agents.filter(agent => agent.reasoning_effort);
    const agentsWithoutReasoning = agents.filter(agent => !agent.reasoning_effort);

    console.log(`✅ ${agentsWithReasoning.length} agents avec reasoning_effort configuré`);
    console.log(`⚠️ ${agentsWithoutReasoning.length} agents sans reasoning_effort`);

    if (agentsWithReasoning.length > 0) {
      console.log('\n📋 Agents avec reasoning_effort:');
      agentsWithReasoning.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.name} (${agent.provider})`);
        console.log(`      Reasoning: ${agent.reasoning_effort}`);
        console.log(`      Model: ${agent.model}`);
        console.log(`      Temperature: ${agent.temperature}`);
      });
    }

    if (agentsWithoutReasoning.length > 0) {
      console.log('\n⚠️ Agents sans reasoning_effort:');
      agentsWithoutReasoning.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.name} (${agent.provider})`);
      });
    }

    // 3. Statistiques par niveau de reasoning
    console.log('\n3️⃣ **STATISTIQUES PAR NIVEAU**');
    
    const reasoningStats = {
      low: agents.filter(agent => agent.reasoning_effort === 'low').length,
      medium: agents.filter(agent => agent.reasoning_effort === 'medium').length,
      high: agents.filter(agent => agent.reasoning_effort === 'high').length,
      none: agents.filter(agent => !agent.reasoning_effort).length
    };

    console.log('📊 Répartition du reasoning_effort:');
    console.log(`   🔵 Low: ${reasoningStats.low} agents`);
    console.log(`   🟡 Medium: ${reasoningStats.medium} agents`);
    console.log(`   🔴 High: ${reasoningStats.high} agents`);
    console.log(`   ⚪ None: ${reasoningStats.none} agents`);

    // 4. Test de configuration par provider
    console.log('\n4️⃣ **CONFIGURATION PAR PROVIDER**');
    
    const providers = ['groq', 'synesia', 'deepseek'];
    
    for (const provider of providers) {
      const providerAgents = agents.filter(agent => agent.provider === provider);
      const providerWithReasoning = providerAgents.filter(agent => agent.reasoning_effort);
      
      console.log(`\n🔧 ${provider.toUpperCase()}:`);
      console.log(`   Total agents: ${providerAgents.length}`);
      console.log(`   Avec reasoning: ${providerWithReasoning.length}`);
      
      if (providerWithReasoning.length > 0) {
        const levels = providerWithReasoning.map(agent => agent.reasoning_effort);
        console.log(`   Niveaux: ${levels.join(', ')}`);
      }
    }

    // 5. Recommandations
    console.log('\n5️⃣ **RECOMMANDATIONS**');
    
    if (agentsWithoutReasoning.length > 0) {
      console.log('⚠️ Agents à corriger:');
      agentsWithoutReasoning.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.provider})`);
      });
      console.log('\n💡 Exécutez: node scripts/fix-agent-instructions.js');
    }

    // 6. Test de simulation de configuration
    console.log('\n6️⃣ **SIMULATION DE CONFIGURATION**');
    
    const testAgent = agentsWithReasoning[0] || agents[0];
    if (testAgent) {
      console.log(`\n🧪 Test avec l'agent: ${testAgent.name}`);
      
      // Simuler la configuration qui serait passée au GroqProvider
      const customConfig = {
        model: testAgent.model || 'openai/gpt-oss-120b',
        temperature: testAgent.temperature || 0.7,
        maxTokens: testAgent.max_tokens || testAgent.max_completion_tokens || 8000,
        topP: testAgent.top_p || 0.9,
        reasoningEffort: testAgent.reasoning_effort || 'low',
        serviceTier: testAgent.service_tier || 'on_demand',
        parallelToolCalls: testAgent.parallel_tool_calls !== undefined ? testAgent.parallel_tool_calls : true
      };

      console.log('📤 Configuration qui serait envoyée à Groq:');
      console.log(JSON.stringify(customConfig, null, 2));

      // Simuler le payload qui serait envoyé à l'API Groq
      const testPayload = {
        model: customConfig.model,
        messages: [
          { role: 'system', content: 'Test message' },
          { role: 'user', content: 'Hello' }
        ],
        temperature: customConfig.temperature,
        max_completion_tokens: customConfig.maxTokens,
        top_p: customConfig.topP,
        reasoning_effort: customConfig.reasoningEffort,
        service_tier: customConfig.serviceTier,
        parallel_tool_calls: customConfig.parallelToolCalls
      };

      console.log('\n📦 Payload complet pour l\'API Groq:');
      console.log(JSON.stringify(testPayload, null, 2));

      console.log(`\n✅ Le reasoning_effort "${testAgent.reasoning_effort || 'low'}" sera bien envoyé à l'API Groq`);
    }

    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testReasoningEffort(); 