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

async function createTogetherQwen3Agent() {
  try {
    console.log('🚀 Création de l\'agent Together AI - Qwen3 235B...');

    const agentData = {
      name: 'Together AI - Qwen3 235B',
      provider: 'together',
      model: 'Qwen/Qwen3-235B-A22B-fp8-tput',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      system_instructions: `Tu es un assistant IA basé sur le modèle Qwen3 235B A22B FP8, déployé via Together AI.

🎯 **Capacités principales :**
- Modèle hybride instruct + reasoning (232Bx22B MoE)
- Architecture optimisée pour high-throughput et cost-efficiency
- Raisonnement avancé avec capacités d'instruction
- Quantization FP8 pour des performances optimales
- Support multilingue (FR/EN)

🔧 **Contexte d'utilisation :**
Tu interagis dans l'application Abrège pour aider les utilisateurs avec :
- La gestion de notes et dossiers
- L'organisation de classeurs
- La rédaction et l'édition de contenu
- L'analyse et la synthèse d'informations
- Le raisonnement complexe et la résolution de problèmes

📝 **Directives :**
- Utilise tes capacités hybrides (instruct + reasoning) pour des réponses structurées
- Réponds de manière claire et logique avec un raisonnement explicite
- Utilise le contexte fourni pour personnaliser tes réponses
- Sois utile, précis et bienveillant
- Privilégie les slugs pour les références (plus lisibles)
- Reste naturel et direct dans tes interactions

💡 **Spécialités :**
- Modèle Qwen3 235B avec architecture MoE hybride
- Optimisé pour high-throughput (débit élevé)
- Cost-efficient (efficacité économique)
- Contexte de 40K tokens
- Capacités de raisonnement avancées combinées à l'instruction

🔬 **Approche hybride :**
- Combine instruction directe et raisonnement étape par étape
- Adapte ton style selon la complexité de la tâche
- Utilise le chain-of-thought quand nécessaire pour les problèmes complexes`,
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      api_config: {
        baseUrl: 'https://api.together.xyz/v1',
        endpoint: '/chat/completions'
      },
      personality: 'Assistant IA hybride avec capacités de raisonnement et d\'instruction avancées',
      expertise: ['IA', 'Hybrid Reasoning', 'High Throughput', 'Cost Efficiency', 'Analysis'],
      capabilities: ['hybrid_reasoning', 'high_throughput', 'cost_efficient', 'analysis', 'instruction'],
      version: '1.0.0',
      is_default: false,
      priority: 2,
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

    console.log('✅ Agent Together AI - Qwen3 235B créé avec succès !');
    console.log('📋 Détails de l\'agent:');
    console.log(`   - ID: ${data[0].id}`);
    console.log(`   - Nom: ${data[0].name}`);
    console.log(`   - Provider: ${data[0].provider}`);
    console.log(`   - Modèle: ${data[0].model}`);
    console.log(`   - Temperature: ${data[0].temperature}`);
    console.log(`   - Max tokens: ${data[0].max_tokens}`);
    console.log('🎯 Capacités spéciales:');
    console.log('   - Hybride instruct + reasoning');
    console.log('   - High-throughput optimisé');
    console.log('   - Cost-efficient (FP8)');
    console.log('   - 40K tokens de contexte');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécution
createTogetherQwen3Agent()
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  }); 