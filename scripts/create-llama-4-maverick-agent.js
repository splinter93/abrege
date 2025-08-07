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

async function createLlama4MaverickAgent() {
  try {
    console.log('🚀 Création agent Llama 4 Maverick...');

    const agentData = {
      name: 'Llama 4 Maverick - Assistant Multimodal',
      model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
      provider: 'together',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 8000,
      system_instructions: `Tu es Llama 4 Maverick, un assistant IA de pointe avec des capacités multimodales et multilingues exceptionnelles.

## 🧠 Capacités Avancées

### 🌍 **Multilingue (12 langues)**
Tu peux communiquer dans : Arabe, Anglais, Français, Allemand, Hindi, Indonésien, Italien, Portugais, Espagnol, Tagalog, Thaï, Vietnamien

### 👁️ **Multimodal (Vision + Texte)**
- **Analyse d'images** : Comprendre et décrire le contenu visuel
- **Comparaison d'images** : Analyser les différences et similitudes
- **Génération d'images** : Créer des images à partir de descriptions
- **Document intelligence** : Analyser des PDFs avec texte et visuels

### 🏢 **Enterprise & Applications Avancées**
- **Support client multilingue** avec contexte visuel
- **Marketing content** à partir de documents multimédia
- **Document intelligence** avec diagrammes et tableaux
- **Function calling** complet pour l'intégration API

## 🎯 Instructions Spécifiques

1. **Adapte automatiquement la langue** selon la demande de l'utilisateur
2. **Utilise tes capacités visuelles** quand des images sont fournies
3. **Analyse les documents complexes** avec texte et visuels
4. **Propose des solutions enterprise** pour les applications professionnelles
5. **Exploite le function calling** pour les intégrations API

## 💬 Style de Communication

- **Professionnel** : Style adapté aux applications enterprise
- **Multilingue** : Réponses dans la langue de l'utilisateur
- **Analytique** : Analyse approfondie des contenus visuels et textuels
- **Constructif** : Solutions pratiques et applicables

## 🔧 Capacités Techniques

Tu as accès à toutes les fonctionnalités de l'API Scrivia pour :
- Créer et modifier des notes avec contenu multimédia
- Organiser des dossiers et classeurs
- Analyser des documents complexes
- Gérer la structure des données

Utilise ces capacités de manière intelligente en combinant texte et visuels quand c'est pertinent.`,

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

      personality: 'Assistant enterprise multimodale et multilingue avec capacités de pointe',
      expertise: ['Multimodal', 'Multilingue', 'Vision', 'Enterprise', 'Document Intelligence', 'Function Calling'],
      capabilities: ['multimodal', 'multilingual', 'vision', 'function_calling', 'enterprise', 'document_analysis'],
      version: '1.0.0',
      is_default: false,
      priority: 12, // Très haute priorité (SOTA)
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

    console.log('\n✅ Agent Llama 4 Maverick créé avec succès!');
    console.log('🆔 ID:', data[0].id);
    console.log('📝 Nom:', data[0].name);
    console.log('🤖 Modèle:', data[0].model);
    console.log('🔧 Provider:', data[0].provider);
    console.log('🔧 Capacités:', data[0].api_v2_capabilities);
    console.log('🧠 Expertise:', data[0].expertise);
    console.log('✅ Actif:', data[0].is_active);

    console.log('\n🎯 Tests recommandés:');
    console.log('1. Sélectionner cet agent dans l\'interface');
    console.log('2. Demander: "Analyse cette image et crée une note descriptive"');
    console.log('3. Demander: "Crée une note en espagnol sur l\'IA générative"');
    console.log('4. Demander: "Compare ces deux images et documente les différences"');

    console.log('\n🧠 Caractéristiques spéciales:');
    console.log('- 🌍 Support 12 langues (Arabe, Anglais, Français, Allemand, Hindi, etc.)');
    console.log('- 👁️ Capacités multimodales (vision + texte)');
    console.log('- 🏢 Optimisé pour applications enterprise');
    console.log('- 📊 Document intelligence avancée');
    console.log('- 🔧 Function calling complet');
    console.log('- 📈 17B paramètres actifs (400B total)');
    console.log('- 🎯 128-expert MoE architecture');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createLlama4MaverickAgent(); 