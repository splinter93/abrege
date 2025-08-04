require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDonnaConfig() {
  try {
    console.log('🔍 Test de la configuration de l\'agent Donna...\n');

    // Récupérer l'agent Donna
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('name', 'Donna - Assistant Principal')
      .single();

    if (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return;
    }

    if (!agents) {
      console.error('❌ Agent Donna non trouvé');
      return;
    }

    console.log('✅ Agent Donna trouvé:');
    console.log('📋 Configuration complète:');
    console.log(JSON.stringify(agents, null, 2));

    // Vérifier les champs critiques
    console.log('\n🔍 Vérification des champs critiques:');
    console.log(`- ID: ${agents.id}`);
    console.log(`- Nom: ${agents.name}`);
    console.log(`- Provider: ${agents.provider}`);
    console.log(`- Model: ${agents.model}`);
    console.log(`- Temperature: ${agents.temperature}`);
    console.log(`- Max tokens: ${agents.max_tokens}`);
    console.log(`- Top p: ${agents.top_p}`);
    console.log(`- Instructions système: ${agents.system_instructions ? '✅ Présentes' : '❌ Manquantes'}`);
    console.log(`- Template de contexte: ${agents.context_template ? '✅ Présent' : '❌ Manquant'}`);
    console.log(`- API config: ${agents.api_config ? '✅ Présent' : '❌ Manquant'}`);

    if (agents.system_instructions) {
      console.log('\n📝 Instructions système (premiers 200 caractères):');
      console.log(agents.system_instructions.substring(0, 200) + '...');
    }

    if (agents.context_template) {
      console.log('\n📋 Template de contexte (premiers 200 caractères):');
      console.log(agents.context_template.substring(0, 200) + '...');
    }

    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testDonnaConfig(); 