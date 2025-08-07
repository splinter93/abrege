const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQwen3Reasoning() {
  try {
    console.log('🧪 Test de la configuration Qwen 3 avec reasoning...');

    // 1. Vérifier que l'agent Qwen 3 existe
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .ilike('model', '%Qwen%');

    if (agentsError) {
      console.error('❌ Erreur lors de la récupération des agents:', agentsError);
      return;
    }

    console.log(`📋 Agents Qwen trouvés: ${agents.length}`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (${agent.model})`);
    });

    // 2. Vérifier la configuration de l'agent Qwen 3
    const qwen3Agent = agents.find(agent => agent.model.includes('Qwen3-235B'));
    
    if (!qwen3Agent) {
      console.error('❌ Agent Qwen3 235B non trouvé');
      return;
    }

    console.log('\n🔧 Configuration de l\'agent Qwen 3:');
    console.log(`   - Nom: ${qwen3Agent.name}`);
    console.log(`   - Modèle: ${qwen3Agent.model}`);
    console.log(`   - Provider: ${qwen3Agent.provider}`);
    console.log(`   - Temperature: ${qwen3Agent.temperature}`);
    console.log(`   - Max tokens: ${qwen3Agent.max_tokens}`);

    // 3. Vérifier la configuration API
    if (qwen3Agent.api_config) {
      console.log('\n⚙️ Configuration API:');
      console.log(`   - Base URL: ${qwen3Agent.api_config.baseUrl}`);
      console.log(`   - Endpoint: ${qwen3Agent.api_config.endpoint}`);
      console.log(`   - Enable thinking: ${qwen3Agent.api_config.enable_thinking}`);
      console.log(`   - Result format: ${qwen3Agent.api_config.result_format}`);
    }

    // 4. Vérifier les instructions système
    console.log('\n📝 Instructions système (extrait):');
    const instructions = qwen3Agent.system_instructions || '';
    const preview = instructions.substring(0, 200) + '...';
    console.log(`   ${preview}`);

    // 5. Test de la configuration selon la documentation Alibaba Cloud
    console.log('\n✅ Vérifications selon la documentation Alibaba Cloud:');
    
    const checks = [
      {
        name: 'Modèle Qwen3 235B',
        condition: qwen3Agent.model.includes('Qwen3-235B'),
        description: 'Modèle correct pour le reasoning'
      },
      {
        name: 'Provider Together AI',
        condition: qwen3Agent.provider === 'together',
        description: 'Provider compatible avec Qwen'
      },
      {
        name: 'Enable thinking',
        condition: qwen3Agent.api_config?.enable_thinking === true,
        description: 'Reasoning activé selon la doc'
      },
      {
        name: 'Result format message',
        condition: qwen3Agent.api_config?.result_format === 'message',
        description: 'Format de réponse avec reasoning'
      },
      {
        name: 'Instructions reasoning',
        condition: instructions.includes('reasoning') || instructions.includes('thinking'),
        description: 'Instructions mentionnent le reasoning'
      }
    ];

    checks.forEach(check => {
      const status = check.condition ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${check.description}`);
    });

    const passedChecks = checks.filter(check => check.condition).length;
    const totalChecks = checks.length;

    console.log(`\n📊 Résultat: ${passedChecks}/${totalChecks} vérifications passées`);

    if (passedChecks === totalChecks) {
      console.log('🎉 Configuration Qwen 3 avec reasoning correctement configurée !');
      console.log('\n🔗 Documentation Alibaba Cloud: https://www.alibabacloud.com/help/en/model-studio/use-qwen-by-calling-api');
    } else {
      console.log('⚠️ Certaines vérifications ont échoué. Vérifiez la configuration.');
    }

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter le test
testQwen3Reasoning(); 