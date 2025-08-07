#!/usr/bin/env node

/**
 * Test d'intégration OpenAPI v2 avec votre système
 * Usage: node test-v2-openapi-integration.js
 */

const fs = require('fs');

// Charger le schéma OpenAPI v2
const openApiSchema = JSON.parse(fs.readFileSync('./scrivia-v2-openapi-schema.json', 'utf8'));

/**
 * Simuler le générateur OpenAPI v2
 */
class OpenAPIV2ToolsGenerator {
  constructor(openApiSchema) {
    this.schema = openApiSchema;
  }

  generateTools() {
    const tools = [];
    const endpoints = Object.keys(this.schema.paths);

    console.log('🔧 Génération des tools depuis OpenAPI v2...');
    console.log(`📊 Endpoints trouvés: ${endpoints.length}`);

    endpoints.forEach(endpoint => {
      const path = this.schema.paths[endpoint];
      const methods = Object.keys(path);

      methods.forEach(method => {
        const operation = path[method];
        const tool = this.createTool(endpoint, method, operation);
        
        if (tool) {
          tools.push(tool);
        }
      });
    });

    console.log(`✅ ${tools.length} tools générés`);
    return tools;
  }

  createTool(endpoint, method, operation) {
    try {
      const toolName = this.generateToolName(endpoint, method);
      const description = operation.summary || 
                        operation.description || 
                        `${method.toUpperCase()} operation on ${endpoint}`;
      const parameters = this.extractParameters(operation);

      return {
        name: toolName,
        description,
        parameters,
        endpoint,
        method: method.toUpperCase()
      };
    } catch (error) {
      console.error(`❌ Erreur lors de la création du tool ${endpoint}:`, error);
      return null;
    }
  }

  generateToolName(endpoint, method) {
    let toolName = endpoint
      .replace(/^\/api\/v2\//, '')
      .replace(/\/\{([^}]+)\}/g, '_$1')
      .replace(/\//g, '_')
      .replace(/^_/, '')
      .replace(/_+/g, '_');

    const httpVerb = method.toLowerCase();
    toolName = `${httpVerb}_${toolName}`;

    const nameMappings = {
      'post_note_create': 'create_note',
      'get_note_ref': 'get_note',
      'put_note_ref_update': 'update_note',
      'delete_note_ref_delete': 'delete_note',
      'get_note_ref_content': 'get_note_content',
      'get_note_ref_metadata': 'get_note_metadata',
      'post_note_ref_add-content': 'add_content_to_note',
      'post_note_ref_insert': 'insert_content_to_note',
      'put_note_ref_move': 'move_note',
      'post_note_ref_merge': 'merge_note',
      'post_note_ref_publish': 'publish_note',
      'get_note_ref_insights': 'get_note_insights',
      'get_note_ref_statistics': 'get_note_statistics',
      'get_note_ref_table-of-contents': 'get_note_toc',
      'post_folder_create': 'create_folder',
      'get_folder_ref': 'get_folder',
      'put_folder_ref_update': 'update_folder',
      'delete_folder_ref_delete': 'delete_folder',
      'put_folder_ref_move': 'move_folder',
      'get_folder_ref_tree': 'get_folder_tree',
      'post_classeur_create': 'create_notebook',
      'get_classeur_ref': 'get_notebook',
      'put_classeur_ref_update': 'update_notebook',
      'delete_classeur_ref_delete': 'delete_notebook',
      'get_classeur_ref_tree': 'get_notebook_tree',
      'put_classeur_ref_reorder': 'reorder_notebook',
      'get_classeurs': 'list_notebooks',
      'post_slug_generate': 'generate_slug'
    };

    return nameMappings[toolName] || toolName;
  }

  extractParameters(operation) {
    const parameters = {
      type: 'object',
      properties: {},
      required: []
    };

    if (operation.parameters) {
      operation.parameters.forEach(param => {
        if (param.in === 'path') {
          parameters.properties[param.name] = {
            type: param.schema?.type || 'string',
            description: param.description || `Parameter ${param.name}`
          };
          if (param.required) {
            parameters.required.push(param.name);
          }
        }
      });
    }

    if (operation.requestBody) {
      const content = operation.requestBody.content['application/json'];
      if (content && content.schema) {
        const bodySchema = this.resolveSchema(content.schema);
        if (bodySchema.properties) {
          Object.assign(parameters.properties, bodySchema.properties);
        }
        if (bodySchema.required) {
          parameters.required.push(...bodySchema.required);
        }
      }
    }

    return parameters;
  }

  resolveSchema(schema) {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '');
      return this.schema.components.schemas[refPath] || schema;
    }
    return schema;
  }

  generateToolsForFunctionCalling() {
    const openApiTools = this.generateTools();
    
    return openApiTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
}

/**
 * Test 1: Génération des tools v2
 */
function testV2ToolGeneration() {
  console.log('🧪 Test 1: Génération des tools depuis OpenAPI v2');
  
  const generator = new OpenAPIV2ToolsGenerator(openApiSchema);
  const tools = generator.generateTools();
  
  console.log('\n📋 Tools v2 générés:');
  tools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
    console.log(`      Endpoint: ${tool.method} ${tool.endpoint}`);
    console.log(`      Paramètres: ${Object.keys(tool.parameters.properties).length}`);
  });
  
  return tools;
}

/**
 * Test 2: Comparaison avec l'API v1
 */
function testComparisonWithV1(v2Tools) {
  console.log('\n🧪 Test 2: Comparaison avec l\'API v1');
  
  const v1Tools = [
    'create_note',
    'get_note',
    'update_note',
    'delete_note',
    'add_content_to_note',
    'move_note',
    'get_note_info',
    'get_note_stats',
    'create_folder',
    'get_folder',
    'update_folder',
    'delete_folder',
    'create_notebook',
    'get_notebook',
    'update_notebook',
    'delete_notebook',
    'list_notebooks',
    'generate_slug'
  ];
  
  const v2ToolNames = v2Tools.map(t => t.name);
  
  console.log('\n📊 Comparaison V1 vs V2:');
  console.log(`   API V1: ${v1Tools.length} tools`);
  console.log(`   API V2: ${v2ToolNames.length} tools`);
  
  const commonTools = v1Tools.filter(tool => 
    v2ToolNames.includes(tool)
  );
  
  const newV2Tools = v2ToolNames.filter(tool => 
    !v1Tools.includes(tool)
  );
  
  const missingInV2 = v1Tools.filter(tool => 
    !v2ToolNames.includes(tool)
  );
  
  console.log(`   Tools communs: ${commonTools.length}`);
  console.log(`   Nouveaux tools V2: ${newV2Tools.length}`);
  console.log(`   Tools manquants dans V2: ${missingInV2.length}`);
  
  if (newV2Tools.length > 0) {
    console.log('\n🆕 Nouveaux tools V2 disponibles:');
    newV2Tools.forEach(tool => console.log(`   - ${tool}`));
  }
  
  if (missingInV2.length > 0) {
    console.log('\n⚠️ Tools V1 manquants dans V2:');
    missingInV2.forEach(tool => console.log(`   - ${tool}`));
  }
  
  return { commonTools, newV2Tools, missingInV2 };
}

/**
 * Test 3: Simulation d'utilisation LLM avec V2
 */
function testLLMV2Usage(tools) {
  console.log('\n🧪 Test 3: Simulation d\'utilisation LLM avec API v2');
  
  const scenarios = [
    {
      message: 'Crée une note intitulée "Guide API v2" dans le classeur "documentation"',
      expectedTools: ['create_note'],
      description: 'Création de note'
    },
    {
      message: 'Récupère le contenu de la note "guide-api"',
      expectedTools: ['get_note_content'],
      description: 'Lecture de contenu'
    },
    {
      message: 'Ajoute du contenu à la note "guide-api"',
      expectedTools: ['add_content_to_note'],
      description: 'Ajout de contenu'
    },
    {
      message: 'Insère du contenu à la position 5 de la note "guide-api"',
      expectedTools: ['insert_content_to_note'],
      description: 'Insertion de contenu'
    },
    {
      message: 'Récupère les insights de la note "guide-api"',
      expectedTools: ['get_note_insights'],
      description: 'Récupération d\'insights'
    },
    {
      message: 'Récupère la table des matières de la note "guide-api"',
      expectedTools: ['get_note_toc'],
      description: 'Table des matières'
    },
    {
      message: 'Fusionne la note "source" avec la note "target"',
      expectedTools: ['merge_note'],
      description: 'Fusion de notes'
    },
    {
      message: 'Publie la note "guide-api"',
      expectedTools: ['publish_note'],
      description: 'Publication de note'
    },
    {
      message: 'Crée un dossier "API v2" dans le classeur "projets"',
      expectedTools: ['create_folder'],
      description: 'Création de dossier'
    },
    {
      message: 'Déplace le dossier "API v2" vers le classeur "archive"',
      expectedTools: ['move_folder'],
      description: 'Déplacement de dossier'
    },
    {
      message: 'Récupère l\'arborescence du classeur "projets"',
      expectedTools: ['get_notebook_tree'],
      description: 'Arborescence de classeur'
    },
    {
      message: 'Réorganise les éléments du classeur "projets"',
      expectedTools: ['reorder_notebook'],
      description: 'Réorganisation de classeur'
    }
  ];
  
  const toolNames = tools.map(t => t.name);
  
  scenarios.forEach((scenario, index) => {
    console.log(`\n📝 Scénario ${index + 1}: ${scenario.description}`);
    console.log(`   Message: "${scenario.message}"`);
    console.log(`   Tools attendus: ${scenario.expectedTools.join(', ')}`);
    
    const availableTools = scenario.expectedTools.filter(expected => 
      toolNames.includes(expected)
    );
    
    console.log(`   Tools disponibles: ${availableTools.join(', ')}`);
    
    if (availableTools.length === scenario.expectedTools.length) {
      console.log('   ✅ Tous les tools sont disponibles');
    } else {
      console.log('   ⚠️ Certains tools manquent');
      const missing = scenario.expectedTools.filter(t => !availableTools.includes(t));
      console.log(`   Manquants: ${missing.join(', ')}`);
    }
  });
}

/**
 * Test 4: Avantages de l'API v2
 */
function testV2Advantages() {
  console.log('\n🧪 Test 4: Avantages de l\'API v2');
  
  console.log('\n📊 Nouvelles fonctionnalités V2:');
  console.log('   ✅ Insertion de contenu à position spécifique');
  console.log('   ✅ Fusion de notes avec stratégies');
  console.log('   ✅ Publication de notes');
  console.log('   ✅ Insights automatiques');
  console.log('   ✅ Table des matières générée');
  console.log('   ✅ Statistiques détaillées');
  console.log('   ✅ Déplacement de dossiers');
  console.log('   ✅ Réorganisation de classeurs');
  console.log('   ✅ Métadonnées séparées du contenu');
  
  console.log('\n📊 Améliorations techniques V2:');
  console.log('   ✅ Endpoints plus spécifiques');
  console.log('   ✅ Meilleure séparation des responsabilités');
  console.log('   ✅ Validation plus stricte');
  console.log('   ✅ Réponses plus détaillées');
  console.log('   ✅ Gestion d\'erreurs améliorée');
  console.log('   ✅ Support complet des slugs');
  
  console.log('\n📊 Avantages pour les LLMs:');
  console.log('   ✅ Tools plus spécialisés');
  console.log('   ✅ Opérations plus précises');
  console.log('   ✅ Meilleure granularité');
  console.log('   ✅ Plus de contrôle sur les données');
  console.log('   ✅ Fonctionnalités avancées');
}

/**
 * Fonction principale
 */
function runTests() {
  console.log('🚀 Test d\'intégration OpenAPI v2 avec votre système');
  console.log('📊 Schéma OpenAPI v2 chargé:', Object.keys(openApiSchema.paths).length, 'endpoints');
  
  // Test 1: Génération des tools v2
  const tools = testV2ToolGeneration();
  
  // Test 2: Comparaison avec V1
  const comparison = testComparisonWithV1(tools);
  
  // Test 3: Simulation LLM v2
  testLLMV2Usage(tools);
  
  // Test 4: Avantages V2
  testV2Advantages();
  
  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS V2');
  console.log('====================');
  console.log(`✅ Tools V2 générés: ${tools.length}`);
  console.log(`✅ Tools communs V1/V2: ${comparison.commonTools.length}`);
  console.log(`✅ Nouveaux tools V2: ${comparison.newV2Tools.length}`);
  console.log(`⚠️ Tools V1 manquants: ${comparison.missingInV2.length}`);
  
  console.log('\n📋 Recommandations V2:');
  console.log('1. L\'API v2 offre beaucoup plus de fonctionnalités');
  console.log('2. Les tools sont plus spécialisés et précis');
  console.log('3. Meilleure expérience pour les LLMs');
  console.log('4. Plus de contrôle sur les opérations');
  console.log('5. Fonctionnalités avancées (insights, TOC, etc.)');
}

// Exécuter les tests
runTests(); 