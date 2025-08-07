#!/usr/bin/env node

/**
 * Test d'intégration OpenAPI avec votre système actuel
 * Usage: node test-openapi-integration.js
 */

const fs = require('fs');

// Charger le schéma OpenAPI complet
const openApiSchema = JSON.parse(fs.readFileSync('./scrivia-openapi-schema.json', 'utf8'));

/**
 * Simuler le générateur OpenAPI
 */
class OpenAPIToolsGenerator {
  constructor(openApiSchema) {
    this.schema = openApiSchema;
  }

  generateTools() {
    const tools = [];
    const endpoints = Object.keys(this.schema.paths);

    console.log('🔧 Génération des tools depuis OpenAPI...');
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
      .replace(/^\/api\/v1\//, '')
      .replace(/\/\{([^}]+)\}/g, '_$1')
      .replace(/\//g, '_')
      .replace(/^_/, '')
      .replace(/_+/g, '_');

    const httpVerb = method.toLowerCase();
    toolName = `${httpVerb}_${toolName}`;

    const nameMappings = {
      'post_note_create': 'create_note',
      'get_note_ref': 'get_note',
      'put_note_ref': 'update_note',
      'delete_note_ref': 'delete_note',
      'patch_note_ref_add-content': 'add_content_to_note',
      'put_note_ref_move': 'move_note',
      'get_note_ref_information': 'get_note_info',
      'get_note_ref_statistics': 'get_note_stats',
      'post_folder_create': 'create_folder',
      'get_folder_ref': 'get_folder',
      'put_folder_ref': 'update_folder',
      'delete_folder_ref': 'delete_folder',
      'post_notebook_create': 'create_notebook',
      'get_notebook_ref': 'get_notebook',
      'put_notebook_ref': 'update_notebook',
      'delete_notebook_ref': 'delete_notebook',
      'get_notebooks': 'list_notebooks',
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
 * Test 1: Génération des tools
 */
function testToolGeneration() {
  console.log('🧪 Test 1: Génération des tools depuis OpenAPI');
  
  const generator = new OpenAPIToolsGenerator(openApiSchema);
  const tools = generator.generateTools();
  
  console.log('\n📋 Tools générés:');
  tools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
    console.log(`      Endpoint: ${tool.method} ${tool.endpoint}`);
    console.log(`      Paramètres: ${Object.keys(tool.parameters.properties).length}`);
  });
  
  return tools;
}

/**
 * Test 2: Conversion au format function calling
 */
function testFunctionCallingFormat(tools) {
  console.log('\n🧪 Test 2: Conversion au format function calling');
  
  const generator = new OpenAPIToolsGenerator(openApiSchema);
  const functionCallingTools = generator.generateToolsForFunctionCalling();
  
  console.log('\n📋 Tools au format function calling:');
  functionCallingTools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.function.name}: ${tool.function.description}`);
    console.log(`      Type: ${tool.type}`);
    console.log(`      Paramètres requis: ${tool.function.parameters.required.join(', ')}`);
  });
  
  return functionCallingTools;
}

/**
 * Test 3: Comparaison avec votre système actuel
 */
function testComparisonWithCurrentSystem(openApiTools) {
  console.log('\n🧪 Test 3: Comparaison avec votre système actuel');
  
  const currentSystemTools = [
    'create_note',
    'update_note', 
    'delete_note',
    'add_content_to_note',
    'move_note',
    'create_folder',
    'get_note_content',
    'get_tree',
    'get_notebooks'
  ];
  
  const openApiToolNames = openApiTools.map(t => t.name);
  
  console.log('\n📊 Comparaison:');
  console.log(`   Système actuel: ${currentSystemTools.length} tools`);
  console.log(`   Système OpenAPI: ${openApiToolNames.length} tools`);
  
  const commonTools = currentSystemTools.filter(tool => 
    openApiToolNames.includes(tool)
  );
  
  const newTools = openApiToolNames.filter(tool => 
    !currentSystemTools.includes(tool)
  );
  
  const missingTools = currentSystemTools.filter(tool => 
    !openApiToolNames.includes(tool)
  );
  
  console.log(`   Tools communs: ${commonTools.length}`);
  console.log(`   Nouveaux tools: ${newTools.length}`);
  console.log(`   Tools manquants: ${missingTools.length}`);
  
  if (newTools.length > 0) {
    console.log('\n🆕 Nouveaux tools disponibles:');
    newTools.forEach(tool => console.log(`   - ${tool}`));
  }
  
  if (missingTools.length > 0) {
    console.log('\n⚠️ Tools manquants dans OpenAPI:');
    missingTools.forEach(tool => console.log(`   - ${tool}`));
  }
  
  return { commonTools, newTools, missingTools };
}

/**
 * Test 4: Simulation d'utilisation LLM
 */
function testLLMUsage(tools) {
  console.log('\n🧪 Test 4: Simulation d\'utilisation LLM');
  
  const scenarios = [
    {
      message: 'Crée une note intitulée "Test OpenAPI" dans le classeur "tests"',
      expectedTools: ['create_note'],
      description: 'Création de note'
    },
    {
      message: 'Liste tous mes classeurs',
      expectedTools: ['list_notebooks'],
      description: 'Liste des classeurs'
    },
    {
      message: 'Crée un dossier "Documentation" dans le classeur "projets"',
      expectedTools: ['create_folder'],
      description: 'Création de dossier'
    },
    {
      message: 'Ajoute du contenu à la note "guide-api"',
      expectedTools: ['add_content_to_note'],
      description: 'Ajout de contenu'
    },
    {
      message: 'Génère un slug pour "Mon nouveau classeur"',
      expectedTools: ['generate_slug'],
      description: 'Génération de slug'
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
 * Test 5: Performance et maintenance
 */
function testPerformanceAndMaintenance() {
  console.log('\n🧪 Test 5: Performance et maintenance');
  
  console.log('\n📊 Avantages du système OpenAPI:');
  console.log('   ✅ Génération automatique des tools');
  console.log('   ✅ Documentation toujours à jour');
  console.log('   ✅ Validation native');
  console.log('   ✅ Moins de maintenance');
  console.log('   ✅ Cohérence avec l\'API');
  
  console.log('\n📊 Avantages de votre système actuel:');
  console.log('   ✅ Contrôle total sur les tools');
  console.log('   ✅ Noms optimisés pour les LLMs');
  console.log('   ✅ Logique métier intégrée');
  console.log('   ✅ Performance optimisée');
  
  console.log('\n🔄 Recommandation hybride:');
  console.log('   1. Garder votre système actuel comme base');
  console.log('   2. Ajouter la génération OpenAPI pour les nouveaux endpoints');
  console.log('   3. Migrer progressivement vers OpenAPI');
  console.log('   4. Maintenir la compatibilité');
}

/**
 * Fonction principale
 */
function runTests() {
  console.log('🚀 Test d\'intégration OpenAPI avec votre système');
  console.log('📊 Schéma OpenAPI chargé:', Object.keys(openApiSchema.paths).length, 'endpoints');
  
  // Test 1: Génération des tools
  const tools = testToolGeneration();
  
  // Test 2: Format function calling
  const functionCallingTools = testFunctionCallingFormat(tools);
  
  // Test 3: Comparaison avec le système actuel
  const comparison = testComparisonWithCurrentSystem(tools);
  
  // Test 4: Simulation LLM
  testLLMUsage(tools);
  
  // Test 5: Performance et maintenance
  testPerformanceAndMaintenance();
  
  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS');
  console.log('====================');
  console.log(`✅ Tools générés: ${tools.length}`);
  console.log(`✅ Format function calling: ${functionCallingTools.length}`);
  console.log(`✅ Tools communs: ${comparison.commonTools.length}`);
  console.log(`✅ Nouveaux tools: ${comparison.newTools.length}`);
  console.log(`⚠️ Tools manquants: ${comparison.missingTools.length}`);
  
  console.log('\n📋 Recommandations:');
  console.log('1. Implémenter l\'intégration OpenAPI dans votre système actuel');
  console.log('2. Tester avec vos agents existants');
  console.log('3. Migrer progressivement vers OpenAPI');
  console.log('4. Maintenir la compatibilité avec l\'ancien système');
}

// Exécuter les tests
runTests(); 