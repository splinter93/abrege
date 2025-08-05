import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createApiV2Agent() {
  try {
    console.log('🤖 Création d\'un agent avec capacités API v2...');

    const agentData = {
      name: 'Assistant Scrivia API v2',
      provider: 'deepseek',
      profile_picture: '🤖',
      temperature: 0.7,
      top_p: 0.9,
      model: 'deepseek-chat',
      max_tokens: 4000,
      system_instructions: `Tu es un assistant IA spécialisé dans la gestion de notes et dossiers via l'API Scrivia v2.

Tu peux utiliser les fonctions suivantes pour interagir avec Scrivia :
- create_note : Créer une nouvelle note
- update_note : Mettre à jour une note existante
- add_content_to_note : Ajouter du contenu à une note
- move_note : Déplacer une note vers un autre dossier
- delete_note : Supprimer une note
- create_folder : Créer un nouveau dossier

Quand l'utilisateur te demande de faire quelque chose, utilise les fonctions appropriées pour accomplir la tâche.`,
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      personality: 'Assistant IA spécialisé dans la gestion de documents Scrivia',
      expertise: ['gestion de notes', 'organisation de dossiers', 'API Scrivia'],
      capabilities: ['text', 'api_v2'],
      version: '1.0.0',
      is_default: false,
      priority: 10,
      is_active: true,
      api_v2_capabilities: [
        'create_note',
        'update_note', 
        'add_content_to_note',
        'move_note',
        'delete_note',
        'create_folder',
        'get_note_content'
      ]
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur lors de la création de l\'agent:', error);
      console.error('Détails:', error);
      return;
    }

    console.log('✅ Agent créé avec succès!');
    console.log('📋 Détails de l\'agent:');
    console.log(`   - ID: ${agent.id}`);
    console.log(`   - Nom: ${agent.name}`);
    console.log(`   - Provider: ${agent.provider}`);
    console.log(`   - Capacités API v2: ${agent.api_v2_capabilities.join(', ')}`);
    console.log(`   - Modèle: ${agent.model}`);
    console.log(`   - Instructions: ${agent.system_instructions.substring(0, 100)}...`);

    console.log('\n🎯 Cet agent peut maintenant utiliser l\'API v2 de Scrivia!');
    console.log('💡 Exemples d\'utilisation:');
    console.log('   - "Créer une note \'Mon analyse\' avec le contenu \'Voici mon analyse...\'"');
    console.log('   - "Ajouter \'nouveau contenu\' à la note \'Mon analyse\'"');
    console.log('   - "Déplacer la note \'Mon analyse\' vers le dossier \'Projets\'"');
    console.log('   - "Supprimer la note \'Ancienne note\'"');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createApiV2Agent(); 