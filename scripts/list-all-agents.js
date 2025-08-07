require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllAgents() {
  try {
    console.log('📋 Liste de tous les agents disponibles:\n');

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération agents:', error);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('❌ Aucun agent trouvé');
      return;
    }

    console.log(`✅ ${agents.length} agents trouvés:\n`);

    agents.forEach((agent, index) => {
      console.log(`🔹 ${index + 1}. ${agent.name}`);
      console.log(`   🆔 ID: ${agent.id}`);
      console.log(`   🤖 Modèle: ${agent.model}`);
      console.log(`   🔧 Provider: ${agent.provider}`);
      console.log(`   🌡️ Temperature: ${agent.temperature}`);
      console.log(`   📏 Max tokens: ${agent.max_tokens}`);
      console.log(`   🎯 Priorité: ${agent.priority}`);
      console.log(`   ✅ Actif: ${agent.is_active ? 'Oui' : 'Non'}`);
      console.log(`   🧠 Expertise: ${agent.expertise?.join(', ') || 'N/A'}`);
      console.log(`   🔧 Capacités API: ${agent.api_v2_capabilities?.length || 0}`);
      console.log(`   📅 Créé: ${new Date(agent.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Statistiques
    const providers = [...new Set(agents.map(a => a.provider))];
    const activeAgents = agents.filter(a => a.is_active);
    const highPriorityAgents = agents.filter(a => a.priority >= 10);

    console.log('📊 Statistiques:');
    console.log(`   - Total: ${agents.length} agents`);
    console.log(`   - Actifs: ${activeAgents.length} agents`);
    console.log(`   - Haute priorité (≥10): ${highPriorityAgents.length} agents`);
    console.log(`   - Providers: ${providers.join(', ')}`);
    console.log('');

    // Agents par provider
    console.log('🏢 Répartition par provider:');
    providers.forEach(provider => {
      const providerAgents = agents.filter(a => a.provider === provider);
      console.log(`   - ${provider}: ${providerAgents.length} agents`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

listAllAgents(); 