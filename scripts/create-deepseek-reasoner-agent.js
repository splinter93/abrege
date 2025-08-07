#!/usr/bin/env node

/**
 * Script pour créer un agent DeepSeek Reasoner
 * DeepSeek Reasoner est spécialisé dans le raisonnement et l'analyse
 */

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

async function createDeepSeekReasonerAgent() {
  try {
    console.log('🚀 Création agent DeepSeek Reasoner...');

    const agentData = {
      name: 'DeepSeek Reasoner',
      model: 'deepseek-reasoner', // ✅ Modèle correct pour DeepSeek Reasoner
      provider: 'deepseek',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 8000,
      system_instructions: `Tu es DeepSeek Reasoner, un assistant IA spécialisé dans le raisonnement et l'analyse.

## 🧠 Capacités de Raisonnement

Tu excelles dans :
- **Analyse logique** : Décomposer les problèmes complexes
- **Raisonnement étape par étape** : Expliquer ton processus de pensée
- **Résolution de problèmes** : Trouver des solutions créatives
- **Analyse critique** : Évaluer les informations et arguments

## 🎯 Instructions Spécifiques

1. **Toujours expliquer ton raisonnement** avant de donner une réponse
2. **Décomposer les problèmes complexes** en étapes plus simples
3. **Utiliser des exemples concrets** pour illustrer tes points
4. **Questionner les hypothèses** quand c'est nécessaire
5. **Proposer plusieurs perspectives** quand c'est approprié

## 💬 Style de Communication

- **Clair et structuré** : Organise tes réponses logiquement
- **Pédagogique** : Explique les concepts complexes simplement
- **Honnête** : Reconnais les limites de tes connaissances
- **Constructif** : Propose des améliorations et alternatives

## 🔧 Capacités Techniques

Tu as accès à toutes les fonctionnalités de l'API Scrivia pour :
- Créer et modifier des notes
- Organiser des dossiers et classeurs
- Rechercher et analyser du contenu
- Gérer la structure des données

Utilise ces capacités de manière réfléchie et explique toujours pourquoi tu choisis telle ou telle action.`,

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

      personality: 'Analyste logique et pédagogue, spécialisé dans le raisonnement étape par étape',
      expertise: ['Raisonnement logique', 'Analyse critique', 'Résolution de problèmes', 'Pédagogie', 'Organisation'],
      capabilities: ['chat', 'reasoning', 'analysis', 'problem_solving', 'content_generation'],
      version: '1.0.0',
      is_default: false,
      priority: 10, // Haute priorité
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

    console.log('\n✅ Agent DeepSeek Reasoner créé avec succès!');
    console.log('🆔 ID:', data[0].id);
    console.log('📝 Nom:', data[0].name);
    console.log('🤖 Modèle:', data[0].model);
    console.log('🔧 Provider:', data[0].provider);
    console.log('🔧 Capacités:', data[0].api_v2_capabilities);
    console.log('🧠 Expertise:', data[0].expertise);
    console.log('✅ Actif:', data[0].is_active);

    console.log('\n🎯 Tests recommandés:');
    console.log('1. Sélectionner cet agent dans l\'interface');
    console.log('2. Demander: "Explique-moi la théorie de la relativité étape par étape"');
    console.log('3. Demander: "Analyse la structure de mes notes et propose une organisation optimale"');
    console.log('4. Demander: "Crée une note sur les avantages et inconvénients de l\'IA"');

    console.log('\n🧠 Caractéristiques spéciales:');
    console.log('- Raisonnement étape par étape');
    console.log('- Analyse critique et logique');
    console.log('- Explications pédagogiques');
    console.log('- Accès complet à l\'API Scrivia');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

createDeepSeekReasonerAgent(); 