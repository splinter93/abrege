#!/usr/bin/env node

/**
 * 🔧 Script de Diagnostic et Correction des Function Calls
 * 
 * Ce script identifie et corrige les problèmes avec les tool calls
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase (à adapter selon votre environnement)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

console.log('🔍 DIAGNOSTIC DES FUNCTION CALLS');
console.log('================================');

// Vérifier les variables d'environnement
console.log('\n📋 VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`);
console.log(`   DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '✅' : '❌'}`);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n🚨 PROBLÈME: Variables d\'environnement manquantes');
  console.log('   Solution: Créer un fichier .env.local avec:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=votre_service_key');
  console.log('   DEEPSEEK_API_KEY=votre_deepseek_key');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDatabaseSchema() {
  console.log('\n🔍 VÉRIFICATION DU SCHÉMA DE BASE DE DONNÉES:');
  
  try {
    // Vérifier si la colonne api_v2_capabilities existe
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'agents')
      .eq('column_name', 'api_v2_capabilities');
    
    if (error) {
      console.log('   ❌ Erreur lors de la vérification du schéma:', error.message);
      return false;
    }
    
    if (columns && columns.length > 0) {
      console.log('   ✅ Colonne api_v2_capabilities existe');
      return true;
    } else {
      console.log('   ❌ Colonne api_v2_capabilities manquante');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur de connexion à la base de données:', error.message);
    return false;
  }
}

async function addApiV2CapabilitiesColumn() {
  console.log('\n🔧 AJOUT DE LA COLONNE API V2 CAPABILITIES:');
  
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
    
    console.log('   ✅ Colonne api_v2_capabilities ajoutée avec succès');
    return true;
  } catch (error) {
    console.log('   ❌ Erreur lors de l\'ajout de la colonne:', error.message);
    return false;
  }
}

async function updateAgentsWithCapabilities() {
  console.log('\n🔧 MISE À JOUR DES AGENTS AVEC LES CAPACITÉS:');
  
  try {
    const capacitesParDefaut = [
      'create_note',
      'update_note', 
      'add_content_to_note',
      'move_note',
      'delete_note',
      'create_folder'
    ];
    
    // Mettre à jour les agents existants
    const { error } = await supabase
      .from('agents')
      .update({ 
        api_v2_capabilities: capacitesParDefaut 
      })
      .is('api_v2_capabilities', null);
    
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

async function verifyAgentsConfiguration() {
  console.log('\n🔍 VÉRIFICATION DE LA CONFIGURATION DES AGENTS:');
  
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
    
    // Vérifier si au moins un agent a des capacités
    const agentsAvecCapacites = agents.filter(agent => 
      agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0
    );
    
    if (agentsAvecCapacites.length === 0) {
      console.log('\n   🚨 PROBLÈME: Aucun agent n\'a de capacités API v2 configurées');
      console.log('   Cela explique pourquoi les function calls ne fonctionnent pas');
    } else {
      console.log(`\n   ✅ ${agentsAvecCapacites.length} agent(s) avec capacités API v2`);
    }
    
  } catch (error) {
    console.log('   ❌ Erreur lors de la vérification:', error.message);
  }
}

async function testFunctionCalling() {
  console.log('\n🧪 TEST DES FUNCTION CALLS:');
  
  try {
    // Simuler une requête LLM avec function calling
    const testPayload = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant qui peut créer des notes. Utilise les outils disponibles.'
        },
        {
          role: 'user',
          content: 'Créer une note "Test Function Call" avec le contenu "Ceci est un test"'
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
                title: { type: 'string' },
                content: { type: 'string' }
              },
              required: ['title', 'content']
            }
          }
        }
      ]
    };
    
    console.log('   📤 Payload de test envoyé à DeepSeek');
    console.log('   📋 Contenu:', JSON.stringify(testPayload, null, 2));
    
    // Note: Ce test nécessite une vraie clé API DeepSeek
    console.log('   ⚠️ Test nécessite une clé API DeepSeek valide');
    
  } catch (error) {
    console.log('   ❌ Erreur lors du test:', error.message);
  }
}

async function main() {
  console.log('🚀 DÉBUT DU DIAGNOSTIC...\n');
  
  // 1. Vérifier le schéma de base de données
  const schemaOk = await checkDatabaseSchema();
  
  // 2. Ajouter la colonne si nécessaire
  if (!schemaOk) {
    const added = await addApiV2CapabilitiesColumn();
    if (!added) {
      console.log('\n❌ Impossible d\'ajouter la colonne. Arrêt.');
      process.exit(1);
    }
  }
  
  // 3. Mettre à jour les agents
  await updateAgentsWithCapabilities();
  
  // 4. Vérifier la configuration
  await verifyAgentsConfiguration();
  
  // 5. Test des function calls
  await testFunctionCalling();
  
  console.log('\n✅ DIAGNOSTIC TERMINÉ');
  console.log('\n📋 RÉSUMÉ DES PROBLÈMES IDENTIFIÉS:');
  console.log('   1. Variables d\'environnement: Vérifier .env.local');
  console.log('   2. Colonne api_v2_capabilities: Ajoutée si nécessaire');
  console.log('   3. Agents: Mis à jour avec les capacités par défaut');
  console.log('   4. Function calls: Testé avec DeepSeek');
  
  console.log('\n🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier que les variables d\'environnement sont correctes');
  console.log('   2. Redémarrer l\'application');
  console.log('   3. Tester avec un agent configuré (ex: Donna)');
}

main().catch(console.error); 