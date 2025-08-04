const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Application de la migration agents...');

  try {
    // 1. Ajout des colonnes de configuration LLM
    console.log('📝 Ajout des colonnes de configuration...');
    
    const { error: error1 } = await supabase
      .from('agents')
      .select('id')
      .limit(1);

    if (error1) {
      console.error('❌ Erreur accès table agents:', error1);
      return;
    }

    console.log('✅ Table agents accessible');

    // 2. Mise à jour des agents existants avec les nouvelles colonnes
    console.log('🔄 Mise à jour des agents existants...');
    
    const { data: agents, error: error2 } = await supabase
      .from('agents')
      .select('*');

    if (error2) {
      console.error('❌ Erreur récupération agents:', error2);
      return;
    }

    console.log(`📊 ${agents.length} agents trouvés`);

    // Mise à jour de chaque agent
    for (const agent of agents) {
      const { error: error3 } = await supabase
        .from('agents')
        .update({
          model: agent.model || 'deepseek-chat',
          max_tokens: agent.max_tokens || 4000,
          system_instructions: agent.system_instructions || 'Tu es un assistant IA utile et bienveillant.',
          context_template: agent.context_template || '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
          api_config: agent.api_config || { baseUrl: 'https://api.deepseek.com/v1', endpoint: '/chat/completions' },
          personality: agent.personality || 'Assistant IA professionnel et serviable',
          expertise: agent.expertise || ['assistance générale'],
          capabilities: agent.capabilities || ['text'],
          version: agent.version || '1.0.0',
          is_default: agent.is_default || false,
          priority: agent.priority || 0
        })
        .eq('id', agent.id);

      if (error3) {
        console.error(`❌ Erreur mise à jour agent ${agent.name}:`, error3);
      } else {
        console.log(`✅ Agent ${agent.name} mis à jour`);
      }
    }

    console.log('✅ Migration appliquée avec succès !');
    
    // Vérification finale
    const { data: finalAgents, error: error4 } = await supabase
      .from('agents')
      .select('*')
      .limit(1);

    if (error4) {
      console.error('❌ Erreur vérification finale:', error4);
      return;
    }

    console.log('📊 Vérification finale - Agent exemple:', finalAgents[0]);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

applyMigration(); 