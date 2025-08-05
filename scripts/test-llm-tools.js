#!/usr/bin/env node

/**
 * Script de test pour vérifier tous les tools LLM
 * Vérifie que tous les endpoints v2 sont bien intégrés dans les tools
 */

const { agentApiV2Tools } = require('../src/services/agentApiV2Tools.ts');

async function testLLMTools() {
  console.log('🔧 Test des Tools LLM - API v2 Scrivia\n');

  try {
    // 1. Récupérer tous les tools disponibles
    const tools = agentApiV2Tools.getAvailableTools();
    console.log(`📋 Tools disponibles (${tools.length}):`);
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool}`);
    });

    // 2. Récupérer la structure complète pour function calling
    const toolsForFunctionCalling = agentApiV2Tools.getToolsForFunctionCalling();
    console.log(`\n🎯 Tools pour function calling (${toolsForFunctionCalling.length}):`);
    
    toolsForFunctionCalling.forEach((tool, index) => {
      console.log(`\n  ${index + 1}. ${tool.function.name}`);
      console.log(`     Description: ${tool.function.description}`);
      console.log(`     Paramètres requis: ${tool.function.parameters.required.join(', ')}`);
      
      const optionalParams = Object.keys(tool.function.parameters.properties)
        .filter(param => !tool.function.parameters.required.includes(param));
      
      if (optionalParams.length > 0) {
        console.log(`     Paramètres optionnels: ${optionalParams.join(', ')}`);
      }
    });

    // 3. Vérifier la couverture des endpoints
    const endpoints = [
      // Notes (16 endpoints)
      'create_note', 'update_note', 'delete_note', 'get_note_content', 'get_note_metadata',
      'add_content_to_note', 'insert_content_to_note', 'add_content_to_section', 
      'clear_section', 'erase_section', 'get_table_of_contents', 'get_note_statistics',
      'merge_note', 'move_note', 'publish_note', 'get_note_insights',
      
      // Dossiers (5 endpoints)
      'create_folder', 'update_folder', 'delete_folder', 'get_folder_tree', 'move_folder',
      
      // Classeurs (6 endpoints)
      'create_notebook', 'update_notebook', 'delete_notebook', 'get_tree', 
      'reorder_notebooks', 'get_notebooks',
      
      // Utilitaires (1 endpoint)
      'generate_slug'
    ];

    console.log('\n📊 Vérification de la couverture:');
    const missingTools = endpoints.filter(endpoint => !tools.includes(endpoint));
    const extraTools = tools.filter(tool => !endpoints.includes(tool));

    if (missingTools.length === 0) {
      console.log('✅ Tous les endpoints v2 sont couverts par les tools LLM');
    } else {
      console.log('❌ Endpoints manquants dans les tools LLM:');
      missingTools.forEach(tool => console.log(`  - ${tool}`));
    }

    if (extraTools.length > 0) {
      console.log('\n⚠️ Tools LLM supplémentaires (non dans la liste des endpoints):');
      extraTools.forEach(tool => console.log(`  - ${tool}`));
    }

    // 4. Statistiques finales
    console.log('\n📈 Statistiques finales:');
    console.log(`  - Endpoints v2 total: ${endpoints.length}`);
    console.log(`  - Tools LLM disponibles: ${tools.length}`);
    console.log(`  - Couverture: ${((tools.length / endpoints.length) * 100).toFixed(1)}%`);

    if (missingTools.length === 0 && extraTools.length === 0) {
      console.log('\n🎉 PARFAIT ! Tous les endpoints v2 sont parfaitement intégrés dans les tools LLM');
    } else {
      console.log('\n⚠️ Des ajustements sont nécessaires pour une couverture complète');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testLLMTools().then(() => {
  console.log('\n✅ Test terminé avec succès');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test échoué:', error);
  process.exit(1);
}); 