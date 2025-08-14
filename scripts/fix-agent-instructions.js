// Script pour corriger les instructions des agents
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

// Instructions par défaut selon le provider
const DEFAULT_INSTRUCTIONS = {
  groq: `Tu es un assistant IA expert basé sur le modèle GPT-OSS-120B de Groq.

🎯 **Capacités principales :**
- Modèle GPT OSS avec 120B paramètres
- Raisonnement avancé et analyse complexe
- Support multilingue (FR/EN)
- Génération de contenu créatif et technique

🔧 **Contexte d'utilisation :**
Tu interagis dans l'application Abrège pour aider les utilisateurs avec :
- La gestion de notes et dossiers
- L'organisation de classeurs
- La rédaction et l'édition de contenu
- L'analyse et la synthèse d'informations

📝 **Directives :**
- Réponds de manière claire et structurée
- Utilise les outils disponibles quand nécessaire
- Sois utile, précis et bienveillant
- Privilégie les slugs pour les références (plus lisibles)
- Explique brièvement ce que tu fais avec les outils

💡 **Spécialités :**
- Modèle open-source avec 120B paramètres
- Architecture Mixture-of-Experts (MoE)
- Contexte de 128K tokens
- Capacités de raisonnement avancées`,

  synesia: `Tu es un assistant IA professionnel basé sur le modèle Synesia.

🎯 **Capacités principales :**
- Assistant IA spécialisé et adaptatif
- Support multilingue (FR/EN)
- Réponses naturelles et engageantes
- Intégration avec l'API Scrivia

🔧 **Contexte d'utilisation :**
Tu interagis dans l'application Abrège pour aider les utilisateurs avec :
- La gestion de notes et dossiers
- L'organisation de classeurs
- La rédaction et l'édition de contenu
- L'analyse et la synthèse d'informations

📝 **Directives :**
- Réponds de manière claire et structurée
- Utilise les outils disponibles quand nécessaire
- Sois utile, précis et bienveillant
- Privilégie les slugs pour les références (plus lisibles)
- Explique brièvement ce que tu fais avec les outils

💡 **Spécialités :**
- Modèle Synesia optimisé
- Réponses naturelles et engageantes
- Support complet de l'API Scrivia
- Capacités d'intégration avancées`,

  deepseek: `Tu es un assistant IA expert basé sur le modèle DeepSeek.

🎯 **Capacités principales :**
- Modèle DeepSeek avec capacités avancées
- Raisonnement et analyse complexe
- Support multilingue (FR/EN)
- Génération de contenu de qualité

🔧 **Contexte d'utilisation :**
Tu interagis dans l'application Abrège pour aider les utilisateurs avec :
- La gestion de notes et dossiers
- L'organisation de classeurs
- La rédaction et l'édition de contenu
- L'analyse et la synthèse d'informations

📝 **Directives :**
- Réponds de manière claire et structurée
- Utilise les outils disponibles quand nécessaire
- Sois utile, précis et bienveillant
- Privilégie les slugs pour les références (plus lisibles)
- Explique brièvement ce que tu fais avec les outils

💡 **Spécialités :**
- Modèle DeepSeek optimisé
- Capacités de raisonnement avancées
- Support complet de l'API Scrivia
- Intégration native avec les outils`
};

// Template contextuel par défaut
const DEFAULT_CONTEXT_TEMPLATE = `## Contexte utilisateur
- Type: {{type}}
- Nom: {{name}}
- ID: {{id}}
{{#if content}}- Contenu: {{content}}{{/if}}

## Capacités disponibles
Tu as accès aux outils suivants pour t'aider dans tes tâches :
{{#if api_v2_capabilities}}- {{api_v2_capabilities}}{{/if}}`;

async function fixAgentInstructions() {
  try {
    console.log('🔧 CORRECTION DES INSTRUCTIONS DES AGENTS');
    console.log('========================================');

    // 1. Récupérer tous les agents sans instructions
    console.log('\n1️⃣ **RÉCUPÉRATION DES AGENTS À CORRIGER**');
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Erreur lors de la récupération des agents:', error);
      return;
    }

    const agentsToFix = agents.filter(agent => 
      !agent.system_instructions?.trim() && !agent.instructions?.trim()
    );

    console.log(`📊 ${agentsToFix.length} agents à corriger sur ${agents.length} total`);

    if (agentsToFix.length === 0) {
      console.log('✅ Tous les agents ont déjà des instructions !');
      return;
    }

    // 2. Corriger chaque agent
    console.log('\n2️⃣ **CORRECTION DES AGENTS**');
    
    for (const agent of agentsToFix) {
      console.log(`\n🔧 Correction de l'agent: ${agent.name} (${agent.provider})`);
      
      const defaultInstructions = DEFAULT_INSTRUCTIONS[agent.provider] || DEFAULT_INSTRUCTIONS.groq;
      
      const updateData = {
        system_instructions: defaultInstructions,
        context_template: agent.context_template || DEFAULT_CONTEXT_TEMPLATE,
        personality: agent.personality || 'Assistant IA professionnel et serviable',
        expertise: agent.expertise || ['assistance générale'],
        capabilities: agent.capabilities || ['text'],
        reasoning_effort: agent.reasoning_effort || 'medium', // 🧠 Ajout du reasoning_effort
        api_v2_capabilities: agent.api_v2_capabilities || [
          'create_note',
          'update_note',
          'add_content_to_note',
          'move_note',
          'delete_note',
          'create_folder',
          'get_notebooks',
          'get_note_content',
          'get_note_metadata',
          'get_tree'
        ]
      };

      const { error: updateError } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agent.id);

      if (updateError) {
        console.error(`   ❌ Erreur lors de la mise à jour:`, updateError);
      } else {
        console.log(`   ✅ Agent corrigé avec succès`);
        console.log(`   📝 Instructions ajoutées (${defaultInstructions.length} caractères)`);
        console.log(`   🔧 ${updateData.api_v2_capabilities.length} capacités API v2 configurées`);
      }
    }

    // 3. Vérification finale
    console.log('\n3️⃣ **VÉRIFICATION FINALE**');
    
    const { data: finalAgents, error: finalError } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (finalError) {
      console.error('❌ Erreur lors de la vérification finale:', finalError);
      return;
    }

    const agentsStillWithoutInstructions = finalAgents.filter(agent => 
      !agent.system_instructions?.trim() && !agent.instructions?.trim()
    );

    if (agentsStillWithoutInstructions.length === 0) {
      console.log('✅ Tous les agents ont maintenant des instructions !');
    } else {
      console.log(`⚠️ ${agentsStillWithoutInstructions.length} agents n'ont toujours pas d'instructions:`);
      agentsStillWithoutInstructions.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.provider})`);
      });
    }

    // 4. Statistiques
    console.log('\n4️⃣ **STATISTIQUES**');
    
    const agentsWithInstructions = finalAgents.filter(agent => 
      agent.system_instructions?.trim() || agent.instructions?.trim()
    );
    
    const agentsWithCapabilities = finalAgents.filter(agent => 
      Array.isArray(agent.api_v2_capabilities) && agent.api_v2_capabilities.length > 0
    );
    
    console.log(`📊 Agents avec instructions: ${agentsWithInstructions.length}/${finalAgents.length}`);
    console.log(`📊 Agents avec capacités API v2: ${agentsWithCapabilities.length}/${finalAgents.length}`);

    console.log('\n✅ Correction terminée');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

fixAgentInstructions(); 