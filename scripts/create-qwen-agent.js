require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createQwenAgent() {
  try {
    console.log('🚀 Création agent Qwen 3.1...');

    const agentData = {
      name: 'Qwen 3.1 - Assistant IA',
      model: 'Qwen/Qwen3.1-110B-Instruct',
      provider: 'together',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 8000,
      system_instructions: `Tu es Qwen 3.1, un assistant IA avancé avec des capacités hybrides (instruct + reasoning).

## 🧠 Capacités Hybrides

Tu combines :
- **Instruction directe** : Réponses claires et structurées
- **Raisonnement explicite** : Chain-of-thought pour les problèmes complexes
- **Adaptabilité** : Tu t'adaptes selon la complexité de la tâche

## 🎯 Instructions Spécifiques

1. **Analyse la complexité** de chaque demande
2. **Utilise l'approche hybride** : instruction + raisonnement
3. **Explique ton processus** pour les tâches complexes
4. **Sois direct** pour les tâches simples
5. **Propose des solutions** créatives et pratiques

## 💬 Style de Communication

- **Adaptatif** : Style qui s'ajuste à la complexité
- **Clair et concis** : Réponses bien structurées
- **Pédagogique** : Explications accessibles
- **Constructif** : Toujours proposer des améliorations

## 🔧 Capacités Techniques

Tu as accès à toutes les fonctionnalités de l'API Scrivia pour :
- Créer et modifier des notes
- Organiser des dossiers et classeurs
- Rechercher et analyser du contenu
- Gérer la structure des données

Utilise ces capacités de manière intelligente et adapte ton approche selon le contexte.`,

      api_v2_capabilities: [
        'create_note',
        'update_note', 
        'add_content_to_note',
        'move_note',
        'delete_note',
        'create_folder',
        'get_notebooks',
        'get_note_content',
        'get_note_metadata',
        'get_tree',
        'insert_content_to_note',
        'clear_section',
        'erase_section',
        'add_to_section',
        'publish_note',
        'get_table_of_contents',
        'get_note_statistics'
      ],

      personality: 'Assistant IA adaptatif avec capacités hybrides instruct + reasoning',
      expertise: ['Intelligence artificielle', 'Raisonnement hybride', 'Adaptabilité', 'Résolution de problèmes', 'Communication'],
      capabilities: ['chat', 'hybrid_reasoning', 'adaptation', 'problem_solving', 'content_generation'],
      version: '1.0.0',
      is_default: false,
      priority: 8,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 Données agent:');
    console.log('- Nom:', agentData.name);
    console.log('- Modèle:', agentData.model);
    console.log('- Provider:', agentData.provider);
    console.log('- Temperature:', agentData.temperature);
    console.log('- Max tokens:', agentData.max_tokens);
    console.log('- Capacités:', agentData.api_v2_capabilities.length);
    console.log('- Expertise:', agentData.expertise.join(', '));

    const { data, error } = await supabase
      .from('agents')
      .insert([agentData])
      .select();

    if (error) {
      console.error('❌ Erreur création agent:', error);
      return;
    }

    console.log('\n✅ Agent Qwen 3.1 créé avec succès!');
    console.log('🆔 ID:', data[0].id);
    console.log('📝 Nom:', data[0].name);
    console.log('🤖 Modèle:', data[0].model);
    console.log('🔧 Provider:', data[0].provider);
    console.log('🔧 Capacités:', data[0].api_v2_capabilities);
    console.log('🧠 Expertise:', data[0].expertise);
    console.log('✅ Actif:', data[0].is_active);

    console.log('\n🎯 Tests recommandés:');
    console.log('1. Sélectionner cet agent dans l\'interface');
    console.log('2. Demander: "Explique-moi la différence entre IA et AGI"');
    console.log('3. Demander: "Crée une note sur les tendances tech 2024"');
    console.log('4. Demander: "Analyse mes notes et propose une organisation"');

    console.log('\n🧠 Caractéristiques spéciales:');
    console.log('- Approche hybride (instruct + reasoning)');
    console.log('- Adaptabilité selon la complexité');
    console.log('- Réponses équilibrées et structurées');
    console.log('- Accès complet à l\'API Scrivia');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createQwenAgent(); 