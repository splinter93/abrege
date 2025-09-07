#!/usr/bin/env node

/**
 * Script de vérification du système de tools nettoyé
 * Vérifie que le système utilise maintenant uniquement OpenAPI et plus de tools obsolètes
 */

const { agentApiV2Tools } = require('../src/services/agentApiV2Tools.ts');

async function verifyCleanToolsSystem() {
  console.log('🧹 VÉRIFICATION DU SYSTÈME DE TOOLS NETTOYÉ');
  console.log('============================================\n');

  try {
    // Attendre que l'initialisation soit complète
    console.log('⏳ Attente de l\'initialisation OpenAPI...');
    await agentApiV2Tools.waitForInitialization();
    
    // Obtenir la liste des tools disponibles
    const availableTools = agentApiV2Tools.getAvailableTools();
    const toolsForFunctionCalling = agentApiV2Tools.getToolsForFunctionCalling();
    
    console.log('📊 RÉSULTATS DU NETTOYAGE:');
    console.log('==========================');
    console.log(`   • Tools disponibles: ${availableTools.length}`);
    console.log(`   • Tools pour function calling: ${toolsForFunctionCalling.length}`);
    
    console.log('\n🔧 TOOLS DISPONIBLES:');
    console.log('=====================');
    if (availableTools.length > 0) {
      availableTools.forEach((toolName, index) => {
        console.log(`   ${index + 1}. ${toolName}`);
      });
    } else {
      console.log('   ❌ Aucun tool disponible');
    }
    
    console.log('\n🎯 TOOLS POUR FUNCTION CALLING:');
    console.log('===============================');
    if (toolsForFunctionCalling.length > 0) {
      toolsForFunctionCalling.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.function.name}`);
        console.log(`      Description: ${tool.function.description}`);
      });
    } else {
      console.log('   ❌ Aucun tool pour function calling');
    }
    
    // Vérifier qu'il n'y a plus de tools obsolètes
    const obsoleteTools = [
      'add_content_to_section',
      'clear_section', 
      'erase_section',
      'merge_note',
      'publish_note',
      'get_note_metadata',
      'get_note_insights',
      'get_note_statistics',
      'delete_folder',
      'delete_notebook',
      'generate_slug'
    ];
    
    const foundObsoleteTools = availableTools.filter(tool => obsoleteTools.includes(tool));
    
    console.log('\n🚨 VÉRIFICATION DES TOOLS OBSOLÈTES:');
    console.log('====================================');
    if (foundObsoleteTools.length === 0) {
      console.log('   ✅ Aucun tool obsolète trouvé - Nettoyage réussi !');
    } else {
      console.log('   ❌ Tools obsolètes encore présents:');
      foundObsoleteTools.forEach(tool => {
        console.log(`      • ${tool}`);
      });
    }
    
    // Vérifier que les tools sont basés sur OpenAPI
    console.log('\n🔍 VÉRIFICATION DE LA SOURCE OPENAPI:');
    console.log('=====================================');
    
    // Les tools OpenAPI ont des noms en camelCase (ex: createNote, getNote)
    const openApiTools = availableTools.filter(tool => 
      tool.match(/^[a-z][a-zA-Z0-9]*$/) && // camelCase
      !tool.includes('_') // Pas de snake_case
    );
    
    const nonOpenApiTools = availableTools.filter(tool => 
      !tool.match(/^[a-z][a-zA-Z0-9]*$/) || // Pas camelCase
      tool.includes('_') // snake_case
    );
    
    console.log(`   • Tools OpenAPI (camelCase): ${openApiTools.length}`);
    console.log(`   • Tools non-OpenAPI (snake_case): ${nonOpenApiTools.length}`);
    
    if (nonOpenApiTools.length === 0) {
      console.log('   ✅ Tous les tools sont basés sur OpenAPI !');
    } else {
      console.log('   ⚠️  Tools non-OpenAPI trouvés:');
      nonOpenApiTools.forEach(tool => {
        console.log(`      • ${tool}`);
      });
    }
    
    console.log('\n📈 RÉSUMÉ FINAL:');
    console.log('================');
    console.log(`   • Total tools: ${availableTools.length}`);
    console.log(`   • Tools obsolètes: ${foundObsoleteTools.length}`);
    console.log(`   • Tools non-OpenAPI: ${nonOpenApiTools.length}`);
    console.log(`   • Tools OpenAPI: ${openApiTools.length}`);
    
    if (foundObsoleteTools.length === 0 && nonOpenApiTools.length === 0) {
      console.log('\n🎉 SUCCÈS ! Le système de tools est maintenant propre et basé uniquement sur OpenAPI !');
    } else {
      console.log('\n⚠️  ATTENTION ! Le nettoyage n\'est pas complet.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter la vérification
verifyCleanToolsSystem().catch(console.error);
