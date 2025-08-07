const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMinimalAgent() {
  try {
    console.log('🚀 Création agent minimaliste GPT-OSS...');

    const agentData = {
      name: 'GPT-OSS Minimal',
      model: 'openai/gpt-oss-120b',
      provider: 'together', // ✅ Ajout du provider
      system_instructions: 'Tu es un assistant.',
      api_v2_capabilities: [
        'create_note',
        'update_note', 
        'add_content_to_note',
        'move_note',
        'delete_note',
        'create_folder',
        'get_notebooks',
        'get_note_content',
        'get_note_metadata'
      ],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 Données agent:');
    console.log('- Nom:', agentData.name);
    console.log('- Modèle:', agentData.model);
    console.log('- Provider:', agentData.provider);
    console.log('- Instructions:', agentData.system_instructions);
    console.log('- Capacités:', agentData.api_v2_capabilities.length);

    const { data, error } = await supabase
      .from('agents')
      .insert([agentData])
      .select();

    if (error) {
      console.error('❌ Erreur création agent:', error);
      return;
    }

    console.log('✅ Agent créé avec succès!');
    console.log('🆔 ID:', data[0].id);
    console.log('📝 Nom:', data[0].name);
    console.log('🤖 Modèle:', data[0].model);
    console.log('🔧 Capacités:', data[0].api_v2_capabilities);
    console.log('✅ Actif:', data[0].is_active);

    console.log('\n🎯 Test recommandé:');
    console.log('1. Sélectionner cet agent dans l\'interface');
    console.log('2. Demander: "Crée une note sur les tests"');
    console.log('3. Vérifier les logs pour voir si GPT-OSS utilise les function calls');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createMinimalAgent(); 