#!/usr/bin/env node

/**
 * Script pour corriger le problème des tool calls multiples
 * 
 * Ce script ajoute des instructions spécifiques à tous les agents actifs
 * pour éviter qu'ils génèrent 10+ tool calls au lieu d'un seul.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOOL_CALLS_RULES = `

## 🎯 RÈGLES CRITIQUES POUR LES TOOL CALLS

**IMPORTANT :** Utilise UN SEUL tool call à la fois, sauf si absolument nécessaire.

### Règles d'or :
1. **UNE ACTION = UN TOOL CALL** : Pour créer une note, utilise SEULEMENT createNote
2. **ÉVITE LES ACTIONS MULTIPLES** : Ne crée pas plusieurs notes, classeurs ou dossiers en une fois
3. **PRIORITÉ À L'EFFICACITÉ** : Si tu peux répondre sans outils, fais-le
4. **ÉVALUATION OBLIGATOIRE** : Avant chaque tool call, demande-toi : "Est-ce vraiment nécessaire ?"

### Exemples :
- ✅ "Créer une note" → UN SEUL createNote
- ❌ "Créer une note" → createNote + createClasseur + createDossier
- ✅ "Organiser mes notes" → UN SEUL listNotes puis réponse textuelle
- ❌ "Organiser mes notes" → listNotes + createClasseur + moveNote + updateNote

**RÉSULTAT ATTENDU :** Maximum 1-2 tool calls par demande utilisateur.`;

async function fixMultipleToolCalls() {
  try {
    console.log('🔧 Début de la correction des tool calls multiples...');

    // Récupérer tous les agents actifs
    const { data: agents, error: fetchError } = await supabase
      .from('agents')
      .select('id, name, system_instructions')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération des agents: ${fetchError.message}`);
    }

    if (!agents || agents.length === 0) {
      console.log('⚠️ Aucun agent actif trouvé');
      return;
    }

    console.log(`📋 ${agents.length} agents actifs trouvés`);

    // Mettre à jour chaque agent
    for (const agent of agents) {
      const currentInstructions = agent.system_instructions || '';
      
      // Vérifier si les règles sont déjà présentes
      if (currentInstructions.includes('RÈGLES CRITIQUES POUR LES TOOL CALLS')) {
        console.log(`⏭️ Agent "${agent.name}" déjà mis à jour, ignoré`);
        continue;
      }

      // Ajouter les règles
      const updatedInstructions = currentInstructions + TOOL_CALLS_RULES;

      const { error: updateError } = await supabase
        .from('agents')
        .update({ system_instructions: updatedInstructions })
        .eq('id', agent.id);

      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour de l'agent "${agent.name}":`, updateError.message);
        continue;
      }

      console.log(`✅ Agent "${agent.name}" mis à jour avec succès`);
    }

    console.log('🎉 Correction terminée avec succès !');
    console.log('📝 Les agents utilisent maintenant des tool calls optimisés');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  fixMultipleToolCalls();
}

module.exports = { fixMultipleToolCalls };
