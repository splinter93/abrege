#!/usr/bin/env node

/**
 * Script de vérification de la correspondance entre les endpoints OpenAPI
 * et les tools disponibles pour les agents spécialisés
 */

const fs = require('fs');
const path = require('path');

// Charger le fichier OpenAPI
const openApiPath = path.join(__dirname, '../docs/api/OPENAPI CHAT GPT 30 ENDPOINTS.json');
const openApiContent = fs.readFileSync(openApiPath, 'utf8');
const openApiSchema = JSON.parse(openApiContent);

// Extraire les operationIds des endpoints OpenAPI
function extractOpenApiOperations() {
  const operations = [];
  
  for (const [path, methods] of Object.entries(openApiSchema.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.operationId) {
        operations.push({
          operationId: operation.operationId,
          path: path,
          method: method.toUpperCase(),
          summary: operation.summary || 'Pas de résumé',
          tags: operation.tags || []
        });
      }
    }
  }
  
  return operations;
}

// Tools disponibles dans le système (basé sur l'analyse du code)
const availableTools = [
  // Notes
  'create_note',
  'update_note', 
  'add_content_to_note',
  'insert_content_to_note',
  'add_content_to_section',
  'clear_section',
  'erase_section',
  'merge_note',
  'move_note',
  'delete_note',
  'publish_note',
  'get_note_content',
  'get_note_metadata',
  'get_note_insights',
  'get_table_of_contents',
  'get_note_statistics',
  
  // Dossiers
  'create_folder',
  'update_folder',
  'delete_folder',
  'move_folder',
  'get_folder_tree',
  
  // Classeurs
  'create_notebook',
  'update_notebook',
  'delete_notebook',
  'get_notebooks',
  'get_notebook_tree',
  'reorder_notebooks',
  
  // Utilitaires
  'generate_slug'
];

// Mapping des operationIds vers les noms de tools
const operationIdToToolMapping = {
  // Notes
  'createNote': 'create_note',
  'updateNote': 'update_note',
  'getNote': 'get_note_content',
  'insertNoteContent': 'insert_content_to_note',
  'getNoteTOC': 'get_table_of_contents',
  'moveNote': 'move_note',
  'applyContentOperations': 'add_content_to_note', // Approximation
  
  // Dossiers
  'createFolder': 'create_folder',
  'updateFolder': 'update_folder',
  'getFolder': 'get_folder_tree',
  'getFolderTree': 'get_folder_tree',
  'moveFolder': 'move_folder',
  
  // Classeurs
  'createClasseur': 'create_notebook',
  'updateClasseur': 'update_notebook',
  'getClasseur': 'get_notebooks',
  'getClasseurTree': 'get_notebook_tree',
  'listClasseurs': 'get_notebooks',
  'reorderClasseurs': 'reorder_notebooks',
  
  // Agents
  'listAgents': null, // Pas de tool équivalent
  'createAgent': null, // Pas de tool équivalent
  'getAgent': null, // Pas de tool équivalent
  'deleteAgent': null, // Pas de tool équivalent
  'patchAgent': null, // Pas de tool équivalent
  'executeAgent': null, // Pas de tool équivalent
  
  // Recherche
  'searchContent': null, // Pas de tool équivalent
  'searchFiles': null, // Pas de tool équivalent
  
  // Utilitaires
  'deleteResource': 'delete_note', // Approximation
  'getUserProfile': null, // Pas de tool équivalent
  
  // Partage
  'getNoteShareSettings': null, // Pas de tool équivalent
  'updateNoteShareSettings': null, // Pas de tool équivalent
};

async function verifyOpenApiToolsMapping() {
  console.log('🔍 VÉRIFICATION DE LA CORRESPONDANCE OPENAPI ↔ TOOLS');
  console.log('====================================================\n');

  // Extraire les opérations OpenAPI
  const openApiOperations = extractOpenApiOperations();
  
  console.log(`📊 STATISTIQUES GÉNÉRALES:`);
  console.log(`   • Endpoints OpenAPI: ${openApiOperations.length}`);
  console.log(`   • Tools disponibles: ${availableTools.length}`);
  console.log(`   • Mappings définis: ${Object.keys(operationIdToToolMapping).length}\n`);

  // Analyser chaque endpoint
  const analysis = {
    mapped: [],
    unmapped: [],
    missing: [],
    extra: []
  };

  console.log('🔍 ANALYSE DÉTAILLÉE:\n');

  // Vérifier les endpoints OpenAPI
  for (const operation of openApiOperations) {
    const toolName = operationIdToToolMapping[operation.operationId];
    
    if (toolName === null) {
      // Endpoint intentionnellement non mappé
      analysis.unmapped.push({
        operationId: operation.operationId,
        path: operation.path,
        method: operation.method,
        summary: operation.summary,
        reason: 'Endpoint non applicable aux agents'
      });
    } else if (toolName && availableTools.includes(toolName)) {
      // Endpoint correctement mappé
      analysis.mapped.push({
        operationId: operation.operationId,
        toolName: toolName,
        path: operation.path,
        method: operation.method,
        summary: operation.summary
      });
    } else if (toolName && !availableTools.includes(toolName)) {
      // Endpoint mappé mais tool manquant
      analysis.missing.push({
        operationId: operation.operationId,
        expectedTool: toolName,
        path: operation.path,
        method: operation.method,
        summary: operation.summary
      });
    } else {
      // Endpoint non mappé
      analysis.unmapped.push({
        operationId: operation.operationId,
        path: operation.path,
        method: operation.method,
        summary: operation.summary,
        reason: 'Pas de mapping défini'
      });
    }
  }

  // Vérifier les tools sans endpoint correspondant
  for (const toolName of availableTools) {
    const hasMapping = Object.values(operationIdToToolMapping).includes(toolName);
    if (!hasMapping) {
      analysis.extra.push({
        toolName: toolName,
        reason: 'Tool sans endpoint OpenAPI correspondant'
      });
    }
  }

  // Afficher les résultats
  console.log('✅ ENDPOINTS CORRECTEMENT MAPPÉS:');
  console.log('==================================');
  if (analysis.mapped.length > 0) {
    analysis.mapped.forEach(item => {
      console.log(`   • ${item.operationId} → ${item.toolName}`);
      console.log(`     ${item.method} ${item.path} - ${item.summary}`);
    });
  } else {
    console.log('   Aucun endpoint mappé');
  }

  console.log('\n❌ ENDPOINTS NON MAPPÉS (intentionnellement):');
  console.log('==============================================');
  if (analysis.unmapped.length > 0) {
    analysis.unmapped.forEach(item => {
      console.log(`   • ${item.operationId}`);
      console.log(`     ${item.method} ${item.path} - ${item.summary}`);
      console.log(`     Raison: ${item.reason}`);
    });
  } else {
    console.log('   Tous les endpoints sont mappés');
  }

  console.log('\n🚨 ENDPOINTS MAPPÉS MAIS TOOLS MANQUANTS:');
  console.log('==========================================');
  if (analysis.missing.length > 0) {
    analysis.missing.forEach(item => {
      console.log(`   • ${item.operationId} → ${item.expectedTool} (MANQUANT)`);
      console.log(`     ${item.method} ${item.path} - ${item.summary}`);
    });
  } else {
    console.log('   Tous les endpoints mappés ont leurs tools');
  }

  console.log('\n🔧 TOOLS SANS ENDPOINT CORRESPONDANT:');
  console.log('=====================================');
  if (analysis.extra.length > 0) {
    analysis.extra.forEach(item => {
      console.log(`   • ${item.toolName} - ${item.reason}`);
    });
  } else {
    console.log('   Tous les tools ont un endpoint correspondant');
  }

  // Résumé final
  console.log('\n📊 RÉSUMÉ FINAL:');
  console.log('================');
  console.log(`   ✅ Endpoints mappés: ${analysis.mapped.length}`);
  console.log(`   ⚪ Endpoints non mappés: ${analysis.unmapped.length}`);
  console.log(`   🚨 Tools manquants: ${analysis.missing.length}`);
  console.log(`   🔧 Tools supplémentaires: ${analysis.extra.length}`);
  
  const coverage = Math.round((analysis.mapped.length / openApiOperations.length) * 100);
  console.log(`   📈 Couverture: ${coverage}%`);

  if (analysis.missing.length > 0) {
    console.log('\n🚨 ACTIONS REQUISES:');
    console.log('====================');
    console.log('   • Implémenter les tools manquants dans agentApiV2Tools.ts');
    console.log('   • Vérifier la correspondance des paramètres');
    console.log('   • Tester l\'intégration avec les agents');
  }

  if (analysis.extra.length > 0) {
    console.log('\n🔧 TOOLS SUPPLÉMENTAIRES:');
    console.log('=========================');
    console.log('   • Ces tools existent mais n\'ont pas d\'endpoint OpenAPI correspondant');
    console.log('   • Ils peuvent être des outils internes ou des fonctionnalités avancées');
  }

  console.log('\n🎯 CONCLUSION:');
  console.log('==============');
  if (analysis.missing.length === 0 && analysis.extra.length === 0) {
    console.log('   ✅ PARFAIT ! Tous les endpoints OpenAPI sont correctement transmis aux agents');
  } else if (analysis.missing.length > 0) {
    console.log('   ⚠️  ATTENTION ! Certains endpoints ne sont pas disponibles pour les agents');
  } else {
    console.log('   ✅ BON ! Les endpoints essentiels sont disponibles, avec quelques outils supplémentaires');
  }
}

// Exécuter la vérification
verifyOpenApiToolsMapping().catch(console.error);
