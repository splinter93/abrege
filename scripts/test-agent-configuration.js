// Script pour tester la configuration des agents
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

async function testAgentConfiguration() {
  try {
    console.log('🧪 TEST DE LA CONFIGURATION DES AGENTS');
    console.log('=====================================');

    // 1. Récupérer tous les agents
    console.log('\n1️⃣ **RÉCUPÉRATION DES AGENTS**');
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des agents:', error);
      return;
    }

    console.log(`📊 ${agents.length} agents actifs trouvés`);

    // 2. Analyser chaque agent
    console.log('\n2️⃣ **ANALYSE DES AGENTS**');
    
    agents.forEach((agent, index) => {
      console.log(`\n🤖 Agent ${index + 1}: ${agent.name}`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Provider: ${agent.provider}`);
      console.log(`   Model: ${agent.model}`);
      console.log(`   Temperature: ${agent.temperature}`);
      console.log(`   Max tokens: ${agent.max_tokens}`);
      
      // Instructions système
      const hasSystemInstructions = !!(agent.system_instructions?.trim());
      const hasLegacyInstructions = !!(agent.instructions?.trim());
      console.log(`   Instructions système: ${hasSystemInstructions ? '✅' : '❌'}`);
      if (hasSystemInstructions) {
        console.log(`   📝 Preview: ${agent.system_instructions.substring(0, 100)}...`);
      } else if (hasLegacyInstructions) {
        console.log(`   📝 Legacy: ${agent.instructions.substring(0, 100)}...`);
      }
      
      // Template contextuel
      const hasContextTemplate = !!(agent.context_template?.trim());
      console.log(`   Template contextuel: ${hasContextTemplate ? '✅' : '❌'}`);
      
      // Capacités API v2
      const hasApiV2Capabilities = Array.isArray(agent.api_v2_capabilities) && agent.api_v2_capabilities.length > 0;
      console.log(`   Capacités API v2: ${hasApiV2Capabilities ? '✅' : '❌'}`);
      if (hasApiV2Capabilities) {
        console.log(`   🔧 ${agent.api_v2_capabilities.length} capacités: ${agent.api_v2_capabilities.join(', ')}`);
      }
      
      // Personnalité et expertise
      const hasPersonality = !!(agent.personality?.trim());
      const hasExpertise = Array.isArray(agent.expertise) && agent.expertise.length > 0;
      console.log(`   Personnalité: ${hasPersonality ? '✅' : '❌'}`);
      console.log(`   Expertise: ${hasExpertise ? '✅' : '❌'}`);
      if (hasExpertise) {
        console.log(`   🎯 ${agent.expertise.join(', ')}`);
      }
      
      // Reasoning effort
      const hasReasoningEffort = !!(agent.reasoning_effort);
      console.log(`   Reasoning effort: ${hasReasoningEffort ? '✅' : '❌'}`);
      if (hasReasoningEffort) {
        console.log(`   🧠 Niveau: ${agent.reasoning_effort}`);
      }
      
      // Priorité et défaut
      console.log(`   Priorité: ${agent.priority}`);
      console.log(`   Agent par défaut: ${agent.is_default ? '✅' : '❌'}`);
    });

    // 3. Vérifier l'agent par défaut
    console.log('\n3️⃣ **AGENT PAR DÉFAUT**');
    
    const defaultAgent = agents.find(agent => agent.is_default);
    if (defaultAgent) {
      console.log(`✅ Agent par défaut: ${defaultAgent.name}`);
      console.log(`   Provider: ${defaultAgent.provider}`);
      console.log(`   Instructions: ${defaultAgent.system_instructions ? '✅' : '❌'}`);
    } else {
      console.log('⚠️ Aucun agent par défaut configuré');
    }

    // 4. Test de récupération par provider
    console.log('\n4️⃣ **TEST DE RÉCUPÉRATION PAR PROVIDER**');
    
    const providers = ['groq', 'synesia', 'deepseek'];
    
    for (const provider of providers) {
      const { data: agent, error: providerError } = await supabase
        .from('agents')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      if (providerError) {
        console.log(`   ${provider}: ❌ Aucun agent trouvé`);
      } else {
        console.log(`   ${provider}: ✅ ${agent.name}`);
        console.log(`      Instructions: ${agent.system_instructions ? '✅' : '❌'}`);
        console.log(`      Capacités: ${agent.api_v2_capabilities?.length || 0}`);
      }
    }

    // 5. Résumé des problèmes
    console.log('\n5️⃣ **RÉSUMÉ DES PROBLÈMES**');
    
    const agentsWithoutInstructions = agents.filter(agent => 
      !agent.system_instructions?.trim() && !agent.instructions?.trim()
    );
    
    const agentsWithoutCapabilities = agents.filter(agent => 
      !Array.isArray(agent.api_v2_capabilities) || agent.api_v2_capabilities.length === 0
    );
    
    if (agentsWithoutInstructions.length > 0) {
      console.log(`⚠️ ${agentsWithoutInstructions.length} agents sans instructions système:`);
      agentsWithoutInstructions.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.provider})`);
      });
    }
    
    if (agentsWithoutCapabilities.length > 0) {
      console.log(`⚠️ ${agentsWithoutCapabilities.length} agents sans capacités API v2:`);
      agentsWithoutCapabilities.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.provider})`);
      });
    }
    
    if (agentsWithoutInstructions.length === 0 && agentsWithoutCapabilities.length === 0) {
      console.log('✅ Tous les agents sont correctement configurés !');
    }

    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testAgentConfiguration(); 