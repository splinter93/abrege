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

async function createTogetherLlamaAgent() {
  try {
    console.log('🚀 Création de l\'agent Together AI - Llama...');

    const agentData = {
      name: 'Together AI - Llama',
      provider: 'together',
      model: 'meta-llama/Llama-3.1-405B-Instruct',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      system_instructions: `Tu es un assistant IA basé sur le modèle Llama-3.1-405B-Instruct, déployé via Together AI.

🎯 **Capacités principales :**
- Modèle Llama 3.1 avec 405B paramètres
- Génération de texte créatif et informatif
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
- Modèle Llama 3.1 avec 405B paramètres
- Architecture optimisée pour la génération de texte
- Contexte étendu pour des conversations longues
- Capacités de raisonnement avancées`,
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      api_config: {
        baseUrl: 'https://api.together.xyz/v1',
        endpoint: '/chat/completions'
      },
      personality: 'Assistant IA créatif et informatif basé sur Llama 3.1',
      expertise: ['IA', 'Génération de texte', 'Créativité', 'Analyse'],
      capabilities: ['chat', 'text_generation', 'content_creation', 'analysis'],
      version: '1.0.0',
      is_default: false,
      priority: 4,
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

    console.log('✅ Agent Together AI - Llama créé avec succès !');
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

// Exécution
createTogetherLlamaAgent()
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  }); 