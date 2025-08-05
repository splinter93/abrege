// Charger les variables d'environnement
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

// Configuration des modèles disponibles
const TOGETHER_MODELS = {
  'gpt-oss-120b': {
    name: 'GPT-OSS-120B',
    model: 'openai/gpt-oss-120b',
    description: 'Modèle open-source GPT-OSS-120B d\'OpenAI avec raisonnement avancé',
    capabilities: ['reasoning', 'analysis', 'content_generation']
  },
  'llama-3.1-405b': {
    name: 'Llama 3.1-405B',
    model: 'meta-llama/Llama-3.1-405B-Instruct',
    description: 'Modèle Llama 3.1 avec 405B paramètres pour la génération de texte',
    capabilities: ['text_generation', 'content_creation', 'analysis']
  },
  'qwen3-235b': {
    name: 'Qwen3 235B A22B FP8',
    model: 'Qwen/Qwen3-235B-A22B-fp8-tput',
    description: 'Modèle hybride instruct + reasoning (232Bx22B MoE) optimisé pour high-throughput',
    capabilities: ['hybrid_reasoning', 'high_throughput', 'cost_efficient', 'analysis']
  },
  'deepseek-coder': {
    name: 'DeepSeek Coder',
    model: 'deepseek-ai/deepseek-coder-33b-instruct',
    description: 'Modèle spécialisé dans le code et la programmation',
    capabilities: ['coding', 'programming', 'debugging']
  },
  'qwen-2.5': {
    name: 'Qwen 2.5',
    model: 'qwen/Qwen2.5-72B-Instruct',
    description: 'Modèle Qwen 2.5 avec 72B paramètres pour la conversation',
    capabilities: ['chat', 'conversation', 'analysis']
  },
  'mixtral-8x7b': {
    name: 'Mixtral 8x7B',
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    description: 'Modèle Mixtral 8x7B pour des tâches générales',
    capabilities: ['general', 'chat', 'analysis']
  }
};

async function createTogetherAgent(modelKey) {
  try {
    const modelConfig = TOGETHER_MODELS[modelKey];
    
    if (!modelConfig) {
      console.error('❌ Modèle non reconnu. Modèles disponibles:');
      Object.keys(TOGETHER_MODELS).forEach(key => {
        console.log(`   - ${key}: ${TOGETHER_MODELS[key].name}`);
      });
      return;
    }

    console.log(`🚀 Création de l'agent Together AI - ${modelConfig.name}...`);

    const agentData = {
      name: `Together AI - ${modelConfig.name}`,
      provider: 'together',
      model: modelConfig.model,
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      system_instructions: `Tu es un assistant IA basé sur le modèle ${modelConfig.name}, déployé via Together AI.

🎯 **Capacités principales :**
${modelConfig.description}
- Support multilingue (FR/EN)
- Réponses naturelles et engageantes

🔧 **Contexte d'utilisation :**
Tu interagis dans l'application Abrège pour aider les utilisateurs avec :
- La gestion de notes et dossiers
- L'organisation de classeurs
- La rédaction et l'édition de contenu
- L'analyse et la synthèse d'informations

📝 **Directives :**
- Réponds de manière claire et structurée
- Utilise le contexte fourni pour personnaliser tes réponses
- Sois utile, précis et bienveillant
- Privilégie les slugs pour les références (plus lisibles)
- Reste naturel et direct dans tes interactions

💡 **Spécialités :**
- Modèle ${modelConfig.name}
- Capacités: ${modelConfig.capabilities.join(', ')}
- Optimisé pour les tâches de l'application Abrège`,
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      api_config: {
        baseUrl: 'https://api.together.xyz/v1',
        endpoint: '/chat/completions'
      },
      personality: `Assistant IA basé sur ${modelConfig.name}`,
      expertise: ['IA', ...modelConfig.capabilities],
      capabilities: modelConfig.capabilities,
      version: '1.0.0',
      is_default: false,
      priority: 5,
      is_active: true
    };

    const { data, error } = await supabase
      .from('agents')
      .insert([agentData])
      .select();

    if (error) {
      console.error('❌ Erreur lors de la création de l\'agent:', error);
      return;
    }

    console.log('✅ Agent créé avec succès !');
    console.log('📋 Détails de l\'agent:');
    console.log(`   - ID: ${data[0].id}`);
    console.log(`   - Nom: ${data[0].name}`);
    console.log(`   - Provider: ${data[0].provider}`);
    console.log(`   - Modèle: ${data[0].model}`);
    console.log(`   - Temperature: ${data[0].temperature}`);
    console.log(`   - Max tokens: ${data[0].max_tokens}`);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Récupérer le modèle depuis les arguments
const modelKey = process.argv[2];

if (!modelKey) {
  console.log('📋 Usage: node scripts/create-together-agent-generic.js <model-key>');
  console.log('🎯 Modèles disponibles:');
  Object.keys(TOGETHER_MODELS).forEach(key => {
    console.log(`   - ${key}: ${TOGETHER_MODELS[key].name}`);
  });
  console.log('');
  console.log('💡 Exemple: node scripts/create-together-agent-generic.js llama-3.1-405b');
  process.exit(1);
}

// Exécution
createTogetherAgent(modelKey)
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  }); 