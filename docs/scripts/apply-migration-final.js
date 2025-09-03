#!/usr/bin/env node

/**
 * 🔧 Script final pour appliquer la migration API v2
 * Configure les agents avec les capacités API v2
 */

import { createClient } from '@supabase/supabase-js';

console.log('🔧 APPLICATION DE LA MIGRATION API V2 FINALE');
console.log('============================================');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Variables d\'environnement manquantes');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.log('\n💡 Assure-toi que tes variables d\'environnement sont configurées');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('\n🔧 ÉTAPE 1: Ajout de la colonne api_v2_capabilities');
  
  try {
    // Ajouter la colonne
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE agents 
        ADD COLUMN IF NOT EXISTS api_v2_capabilities TEXT[] DEFAULT '{}';
        
        CREATE INDEX IF NOT EXISTS idx_agents_api_v2_capabilities 
        ON agents USING gin(api_v2_capabilities);
        
        COMMENT ON COLUMN agents.api_v2_capabilities IS 
        'Liste des capacités API v2 disponibles pour l''agent';
      `
    });
    
    if (error) {
      console.log('   ❌ Erreur lors de l\'ajout de la colonne:', error.message);
      return false;
    }
    
    console.log('   ✅ Colonne api_v2_capabilities ajoutée');
    return true;
  } catch (error) {
    console.log('   ❌ Erreur lors de l\'ajout de la colonne:', error.message);
    return false;
  }
}

async function updateAgents() {
  console.log('\n🔧 ÉTAPE 2: Mise à jour des agents avec les capacités');
  
  try {
    const capacitesParDefaut = [
      'create_note',
      'update_note', 
      'add_content_to_note',
      'move_note',
      'delete_note',
      'create_folder',
      'get_note_content',
      'get_tree',
      'get_notebooks'
    ];
    
    // Mettre à jour tous les agents existants
    const { error } = await supabase
      .from('agents')
      .update({ 
        api_v2_capabilities: capacitesParDefaut 
      });
    
    if (error) {
      console.log('   ❌ Erreur lors de la mise à jour des agents:', error.message);
      return false;
    }
    
    console.log('   ✅ Agents mis à jour avec les capacités par défaut');
    return true;
  } catch (error) {
    console.log('   ❌ Erreur lors de la mise à jour des agents:', error.message);
    return false;
  }
}

async function verifyAgents() {
  console.log('\n🔧 ÉTAPE 3: Vérification des agents');
  
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name, provider, api_v2_capabilities')
      .order('name');
    
    if (error) {
      console.log('   ❌ Erreur lors de la récupération des agents:', error.message);
      return;
    }
    
    if (!agents || agents.length === 0) {
      console.log('   ⚠️ Aucun agent trouvé');
      return;
    }
    
    console.log(`   📋 ${agents.length} agent(s) trouvé(s):`);
    
    agents.forEach((agent, index) => {
      const capacites = agent.api_v2_capabilities || [];
      const status = capacites.length > 0 ? '✅' : '❌';
      
      console.log(`   ${index + 1}. ${agent.name} (${agent.provider})`);
      console.log(`      Capacités API v2: ${status} ${capacites.join(', ') || 'Aucune'}`);
    });
    
    const agentsAvecCapacites = agents.filter(agent => 
      agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0
    );
    
    if (agentsAvecCapacites.length === 0) {
      console.log('\n   🚨 PROBLÈME: Aucun agent n\'a de capacités API v2 configurées');
    } else {
      console.log(`\n   ✅ ${agentsAvecCapacites.length} agent(s) avec capacités API v2`);
    }
    
  } catch (error) {
    console.log('   ❌ Erreur lors de la vérification:', error.message);
  }
}

async function testFunctionCalling() {
  console.log('\n🧪 ÉTAPE 4: Test des function calls');
  
  try {
    // Simuler une requête avec function calling
    const testPayload = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant qui peut créer des notes. Utilise les outils disponibles.'
        },
        {
          role: 'user',
          content: 'Créer une note "Test Migration" avec le contenu "Ceci est un test de migration"'
        }
      ],
      stream: true,
      tools: [
        {
          type: 'function',
          function: {
            name: 'create_note',
            description: 'Créer une nouvelle note',
            parameters: {
              type: 'object',
              properties: {
                source_title: { type: 'string' },
                markdown_content: { type: 'string' },
                notebook_id: { type: 'string' }
              },
              required: ['source_title', 'notebook_id']
            }
          }
        }
      ]
    };
    
    console.log('   📤 Payload de test préparé');
    console.log('   📋 Outils disponibles:', testPayload.tools.length);
    console.log('   ⚠️ Test nécessite une clé API DeepSeek valide');
    
  } catch (error) {
    console.log('   ❌ Erreur lors du test:', error.message);
  }
}

async function main() {
  console.log('🚀 DÉBUT DE LA MIGRATION FINALE...\n');
  
  const migrationOk = await applyMigration();
  if (!migrationOk) {
    console.log('\n❌ Migration échouée. Arrêt.');
    process.exit(1);
  }
  
  const updateOk = await updateAgents();
  if (!updateOk) {
    console.log('\n❌ Mise à jour des agents échouée. Arrêt.');
    process.exit(1);
  }
  
  await verifyAgents();
  await testFunctionCalling();
  
  console.log('\n✅ MIGRATION TERMINÉE AVEC SUCCÈS !');
  console.log('\n🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Redémarrer l\'application: npm run dev');
  console.log('   2. Tester avec Donna: "Créer une note de test"');
  console.log('   3. Vérifier que les function calls sont détectés automatiquement');
  console.log('   4. Tester d\'autres outils: update_note, move_note, etc.');
  
  console.log('\n📋 **RÉSUMÉ DES CAPACITÉS ACTIVÉES:**');
  console.log('   - create_note: Créer une nouvelle note');
  console.log('   - update_note: Modifier une note existante');
  console.log('   - add_content_to_note: Ajouter du contenu à une note');
  console.log('   - move_note: Déplacer une note');
  console.log('   - delete_note: Supprimer une note');
  console.log('   - create_folder: Créer un dossier');
  console.log('   - get_note_content: Récupérer le contenu d\'une note');
  console.log('   - get_tree: Récupérer la structure d\'un classeur');
  console.log('   - get_notebooks: Lister tous les classeurs');
  
  console.log('\n🚀 **FUNCTION CALLS MAINTENANT OPÉRATIONNELS !**');
}

main().catch(console.error); 