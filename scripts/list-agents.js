// 📋 Liste des Agents Disponibles
// Ce script liste tous les agents configurés dans la base de données

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAgents() {
  try {
    console.log('📋 Liste des agents disponibles...\n');

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des agents:', error);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('❌ Aucun agent trouvé dans la base de données');
      return;
    }

    console.log(`✅ ${agents.length} agent(s) trouvé(s):\n`);

    agents.forEach((agent, index) => {
      console.log(`📋 Agent ${index + 1}:`);
      console.log(`   🆔 ID: ${agent.id}`);
      console.log(`   📝 Nom: ${agent.name}`);
      console.log(`   🤖 Modèle: ${agent.model}`);
      console.log(`   🔧 Provider: ${agent.provider}`);
      console.log(`   🌡️ Temperature: ${agent.temperature || 'N/A'}`);
      console.log(`   📏 Max Tokens: ${agent.max_tokens || 'N/A'}`);
      console.log(`   ✅ Actif: ${agent.is_active ? 'Oui' : 'Non'}`);
      console.log(`   🏆 Par défaut: ${agent.is_default ? 'Oui' : 'Non'}`);
      console.log(`   📅 Créé: ${new Date(agent.created_at).toLocaleString()}`);
      
      if (agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0) {
        console.log(`   🛠️ Capacités API v2: ${agent.api_v2_capabilities.length}`);
        agent.api_v2_capabilities.forEach(cap => {
          console.log(`      - ${cap}`);
        });
      }
      
      if (agent.expertise && agent.expertise.length > 0) {
        console.log(`   🎯 Expertise: ${agent.expertise.join(', ')}`);
      }
      
      console.log(''); // Ligne vide pour séparer
    });

    // Analyse par provider
    console.log('📊 Analyse par provider:');
    const providers = {};
    agents.forEach(agent => {
      const provider = agent.provider || 'unknown';
      if (!providers[provider]) {
        providers[provider] = [];
      }
      providers[provider].push(agent);
    });

    Object.keys(providers).forEach(provider => {
      console.log(`   🔧 ${provider}: ${providers[provider].length} agent(s)`);
      providers[provider].forEach(agent => {
        console.log(`      - ${agent.name} (${agent.model})`);
      });
    });

    // Agents actifs
    const activeAgents = agents.filter(agent => agent.is_active);
    console.log(`\n✅ Agents actifs: ${activeAgents.length}/${agents.length}`);

    // Agent par défaut
    const defaultAgent = agents.find(agent => agent.is_default);
    if (defaultAgent) {
      console.log(`🏆 Agent par défaut: ${defaultAgent.name} (${defaultAgent.provider})`);
    } else {
      console.log('⚠️ Aucun agent par défaut défini');
    }

    // Recommandations
    console.log('\n💡 Recommandations:');
    
    const groqAgents = agents.filter(agent => agent.provider === 'groq');
    if (groqAgents.length === 0) {
      console.log('   ❌ Aucun agent Groq trouvé');
      console.log('   💡 Pour créer un agent Groq: node scripts/create-groq-agent.js');
    } else {
      console.log(`   ✅ ${groqAgents.length} agent(s) Groq disponible(s)`);
    }

    const togetherAgents = agents.filter(agent => agent.provider === 'together');
    if (togetherAgents.length === 0) {
      console.log('   ❌ Aucun agent Together AI trouvé');
    } else {
      console.log(`   ✅ ${togetherAgents.length} agent(s) Together AI disponible(s)`);
    }

    const synesiaAgents = agents.filter(agent => agent.provider === 'synesia');
    if (synesiaAgents.length === 0) {
      console.log('   ❌ Aucun agent Synesia trouvé');
    } else {
      console.log(`   ✅ ${synesiaAgents.length} agent(s) Synesia disponible(s)`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

listAgents(); 