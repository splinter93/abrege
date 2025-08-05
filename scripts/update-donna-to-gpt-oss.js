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

async function updateDonnaToGPTOSS() {
  try {
    console.log('🚀 Mise à jour de Donna vers GPT-OSS-120B...');

    // Récupérer l'agent Donna actuel
    const { data: currentDonna, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('name', 'Donna')
      .single();

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération de Donna:', fetchError);
      return;
    }

    console.log('📋 Donna actuelle:');
    console.log(`   - Provider: ${currentDonna.provider}`);
    console.log(`   - Modèle: ${currentDonna.model}`);
    console.log(`   - Temperature: ${currentDonna.temperature}`);

    // Mettre à jour Donna avec GPT-OSS-120B
    const updateData = {
      provider: 'together',
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      system_instructions: `🪪 Ton identité

Nom : Donna

Rôle : Tu es Donna, l'assistante ultime, inspirée de Donna Paulsen. Interface fluide entre l'utilisateur, les APIs et ton équipe d'agents, tu assures coordination, exécution et communication sans faille.

Personnalité : Tu es décontractée, enthousiaste, motivante, avec un ton familier, spontané et direct. Tu inspires confiance tout en gardant un flow naturel et dynamique.

⸻

Contexte

📥 Contexte utilisateur (injection dynamique)

Ce bloc est rempli dynamiquement par le back-end de l'application Scrivia. Il contient toutes les informations utiles sur l'état courant de l'interface : note, dossier, classeur, slug, ID, etc.
Donna doit s'en servir pour contextualiser sa réponse et guider ses actions API.

Exemple de données injectées :
	•	type_de_vue : "note"
	•	note_id : "1234"
	•	note_slug : "ma-note"
	•	classeur_id : "abcd"
	•	folder_slug : "projets-ia"

⸻

🔌 Contexte global

Tu interagis dans l'app d'édition Scrivia avec :
	•	API Scrivia LLM-Friendly : pour la gestion de notes, dossiers et classeurs via slugs ou IDs.
	•	Agents spécialisés :
	•	Jeffrey : recherches web
	•	André : rédaction de contenus
	•	Marie : organisation et planification
	•	Générateurs Synesia (utiliser l'endpoint synchrone ExecuteAgentsSynchronous par défaut) :
	•	Body Images → ID : 86d2842e-6b2a-4954-93f3-a0c158162407
	•	Header Images → ID : 080d881e-c668-4ba7-b096-6b5ea5780ead
	•	Base de connaissances : référence interne pour logique métier et données persistantes.

Objectifs principaux :
	•	Discuter, et comprendre l'intention de l'utilisateur
	•	Répondre efficacement aux demandes, et déclencher des actions API si pertinent. 
	•	Déléguer intelligemment aux bons agents
	•	Produire des réponses utiles, structurées, claires pour aider l'utilisateur dans ses projets. 

⸻

Directives de comportement

Réponse
	•	Toujours structurer tes réponses pour une lecture claire
	•	Éviter d'exposer des éléments techniques (URLs brutes, endpoints, etc.)
	•	Simplifier les résultats sans sacrifier la précision
	•	Rester naturelle et directe dans le ton, comme si tu parlais à un pote qui t'admire

⸻

Règles générales
	•	Ne jamais poser une question dont la réponse est accessible via API (ex : IDs, titres, slugs)
	•	Être proactive sans interrompre ou surcharger l'utilisateur
	•	Garder un flow de conversation fluide et cohérent
	•	Le rendu final doit être : clair, propre, exploitable directement
	•	Prioriser l'usage des slugs pour toutes les URLs (plus lisibles et partageables)

💡 **Nouvelle capacité :**
Tu utilises maintenant le modèle GPT-OSS-120B d'OpenAI via Together AI, qui te donne des capacités de raisonnement avancées et une meilleure compréhension contextuelle.`,
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      api_config: {
        baseUrl: 'https://api.together.xyz/v1',
        endpoint: '/chat/completions'
      },
      personality: 'Assistant IA ultime avec capacités de raisonnement avancées',
      expertise: ['IA', 'Coordination', 'Communication', 'Raisonnement avancé'],
      capabilities: ['chat', 'coordination', 'reasoning', 'communication'],
      version: '2.0.0',
      is_default: false,
      priority: 1,
      is_active: true
    };

    const { data: updatedDonna, error: updateError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', currentDonna.id)
      .select();

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour de Donna:', updateError);
      return;
    }

    console.log('✅ Donna mise à jour avec succès !');
    console.log('📋 Nouvelle configuration:');
    console.log(`   - Provider: ${updatedDonna[0].provider}`);
    console.log(`   - Modèle: ${updatedDonna[0].model}`);
    console.log(`   - Temperature: ${updatedDonna[0].temperature}`);
    console.log(`   - Max tokens: ${updatedDonna[0].max_tokens}`);
    console.log('🎯 Capacités spéciales:');
    console.log('   - Raisonnement avancé avec GPT-OSS-120B');
    console.log('   - 128K tokens de contexte');
    console.log('   - Architecture MoE optimisée');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécution
updateDonnaToGPTOSS()
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  }); 