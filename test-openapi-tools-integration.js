#!/usr/bin/env node

/**
 * Test d'intégration d'OpenAPI tools avec le système actuel
 * Usage: node test-openapi-tools-integration.js
 */

const fs = require('fs');

// Charger le schéma OpenAPI
const openApiSchema = JSON.parse(fs.readFileSync('./scrivia-openapi-schema.json', 'utf8'));

/**
 * Simuler l'intégration OpenAPI avec votre système actuel
 */
function simulateOpenAPIIntegration() {
  console.log('🧪 Simulation d\'intégration OpenAPI avec votre système actuel');
  
  // Analyser le schéma OpenAPI
  const endpoints = Object.keys(openApiSchema.paths);
  const schemas = Object.keys(openApiSchema.components.schemas);
  
  console.log('📊 Analyse du schéma OpenAPI:');
  console.log(`   - Endpoints: ${endpoints.length}`);
  console.log(`   - Schémas: ${schemas.length}`);
  
  // Générer les tools automatiquement
  const generatedTools = [];
  
  endpoints.forEach(endpoint => {
    const path = openApiSchema.paths[endpoint];
    const methods = Object.keys(path);
    
    methods.forEach(method => {
      const operation = path[method];
      const toolName = `${method}_${endpoint.replace(/[\/\{\}]/g, '_')}`;
      
      generatedTools.push({
        name: toolName,
        description: operation.summary || operation.description || `Execute ${method.toUpperCase()} on ${endpoint}`,
        parameters: extractParameters(operation, openApiSchema)
      });
    });
  });
  
  console.log('\n🔧 Tools générés automatiquement:');
  generatedTools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
  });
  
  return generatedTools;
}

/**
 * Extraire les paramètres d'une opération OpenAPI
 */
function extractParameters(operation, schema) {
  const parameters = {
    type: 'object',
    properties: {},
    required: []
  };
  
  // Paramètres de path
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
  
  // Paramètres de body
  if (operation.requestBody) {
    const content = operation.requestBody.content['application/json'];
    if (content && content.schema) {
      const bodySchema = resolveSchema(content.schema, schema);
      Object.assign(parameters.properties, bodySchema.properties || {});
      if (bodySchema.required) {
        parameters.required.push(...bodySchema.required);
      }
    }
  }
  
  return parameters;
}

/**
 * Résoudre les références de schéma
 */
function resolveSchema(schema, openApiSchema) {
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    return openApiSchema.components.schemas[refPath] || schema;
  }
  return schema;
}

/**
 * Simuler l'utilisation des tools avec un LLM
 */
function simulateLLMUsage(tools) {
  console.log('\n🤖 Simulation d\'utilisation LLM avec les tools OpenAPI');
  
  const scenarios = [
    {
      userMessage: 'Crée une note intitulée "Test OpenAPI" dans le classeur "tests"',
      expectedTools: ['POST_api_v1_note_create'],
      description: 'Création de note'
    },
    {
      userMessage: 'Liste tous mes classeurs',
      expectedTools: ['GET_api_v1_notebooks'],
      description: 'Liste des classeurs'
    },
    {
      userMessage: 'Crée un dossier "Documentation" dans le classeur "projets"',
      expectedTools: ['POST_api_v1_folder_create'],
      description: 'Création de dossier'
    },
    {
      userMessage: 'Ajoute du contenu à la note "guide-api"',
      expectedTools: ['PATCH_api_v1_note__ref__add_content'],
      description: 'Ajout de contenu'
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`\n📝 Scénario ${index + 1}: ${scenario.description}`);
    console.log(`   Message: "${scenario.userMessage}"`);
    console.log(`   Tools attendus: ${scenario.expectedTools.join(', ')}`);
    
    // Simuler la sélection de tools
    const selectedTools = tools.filter(tool => 
      scenario.expectedTools.some(expected => tool.name.includes(expected))
    );
    
    console.log(`   Tools sélectionnés: ${selectedTools.map(t => t.name).join(', ')}`);
    
    if (selectedTools.length > 0) {
      console.log('   ✅ Tools trouvés - Exécution possible');
    } else {
      console.log('   ❌ Tools non trouvés - Exécution impossible');
    }
  });
}

/**
 * Comparer avec votre système actuel
 */
function compareWithCurrentSystem() {
  console.log('\n📊 Comparaison avec votre système actuel');
  
  const currentSystem = {
    tools: [
      'create_note',
      'update_note', 
      'delete_note',
      'add_content_to_note',
      'move_note',
      'create_folder',
      'get_note_content',
      'get_tree',
      'get_notebooks'
    ],
    maintenance: 'Manuel',
    documentation: 'Manuelle',
    validation: 'Zod côté serveur'
  };
  
  const openApiSystem = {
    tools: 'Générés automatiquement',
    maintenance: 'Automatique',
    documentation: 'Auto-générée',
    validation: 'OpenAPI native'
  };
  
  console.log('Système Actuel:');
  console.log(`   - Tools: ${currentSystem.tools.length} (maintenance manuelle)`);
  console.log(`   - Documentation: ${currentSystem.documentation}`);
  console.log(`   - Validation: ${currentSystem.validation}`);
  
  console.log('\nSystème OpenAPI:');
  console.log(`   - Tools: ${openApiSystem.tools}`);
  console.log(`   - Maintenance: ${openApiSystem.maintenance}`);
  console.log(`   - Documentation: ${openApiSystem.documentation}`);
  console.log(`   - Validation: ${openApiSystem.validation}`);
  
  console.log('\n🎯 Avantages du système OpenAPI:');
  console.log('   ✅ Génération automatique des tools');
  console.log('   ✅ Documentation toujours à jour');
  console.log('   ✅ Validation native');
  console.log('   ✅ Moins de maintenance');
  console.log('   ✅ Cohérence avec l\'API');
}

/**
 * Proposer une implémentation hybride
 */
function proposeHybridImplementation() {
  console.log('\n🔄 Proposition d\'implémentation hybride');
  
  console.log('Phase 1: Intégration OpenAPI dans votre système actuel');
  console.log('   - Garder votre système de function calling');
  console.log('   - Ajouter la génération automatique depuis OpenAPI');
  console.log('   - Maintenir la compatibilité');
  
  console.log('\nPhase 2: Migration progressive');
  console.log('   - Remplacer les tools manuels par les tools OpenAPI');
  console.log('   - Tester avec vos agents existants');
  console.log('   - Optimiser selon les performances');
  
  console.log('\nPhase 3: Évolution vers l\'API LLM Direct');
  console.log('   - Une fois l\'accès Synesia résolu');
  console.log('   - Migrer vers l\'API LLM Direct');
  console.log('   - Bénéficier du reasoning et des boucles automatiques');
  
  console.log('\n💡 Code d\'exemple pour l\'intégration:');
  console.log(`
// Intégration OpenAPI dans votre système actuel
class OpenAPIToolsGenerator {
  constructor(openApiSchema) {
    this.schema = openApiSchema;
  }
  
  generateTools() {
    // Générer les tools depuis le schéma OpenAPI
    return this.parseEndpoints();
  }
  
  parseEndpoints() {
    // Logique de parsing OpenAPI
    // Retourner les tools au format de votre système
  }
}

// Utilisation
const generator = new OpenAPIToolsGenerator(openApiSchema);
const tools = generator.generateTools();
agentApiV2Tools.addTools(tools);
  `);
}

/**
 * Fonction principale
 */
function runAnalysis() {
  console.log('🚀 Analyse d\'intégration OpenAPI avec votre système');
  console.log('📊 Schéma OpenAPI chargé:', Object.keys(openApiSchema.paths).length, 'endpoints');
  
  // 1. Analyser le schéma OpenAPI
  const tools = simulateOpenAPIIntegration();
  
  // 2. Simuler l'utilisation LLM
  simulateLLMUsage(tools);
  
  // 3. Comparer avec le système actuel
  compareWithCurrentSystem();
  
  // 4. Proposer une implémentation hybride
  proposeHybridImplementation();
  
  console.log('\n📋 Recommandations:');
  console.log('1. Implémenter l\'intégration OpenAPI dans votre système actuel');
  console.log('2. Tester la génération automatique des tools');
  console.log('3. Comparer les performances avec votre système actuel');
  console.log('4. Migrer progressivement vers l\'API LLM Direct quand disponible');
}

// Exécuter l'analyse
runAnalysis(); 