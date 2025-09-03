#!/usr/bin/env tsx

/**
 * Script de test pour valider l'intégration du schéma OpenAPI V2 avec le système LLM
 */

import { getOpenAPISchemaService } from '../services/openApiSchemaService';
import { getOpenAPIV2Tools } from '../services/openApiToolsGenerator';
import { AgentApiV2Tools } from '../services/agentApiV2Tools';

async function testOpenAPIIntegration() {
  console.log('🧪 Test d\'intégration OpenAPI V2 avec le système LLM\n');

  try {
    // 1. Test du service de schéma
    console.log('1️⃣ Test du service de schéma OpenAPI V2...');
    const schemaService = getOpenAPISchemaService();
    const schema = schemaService.getSchema();
    
    console.log(`✅ Schéma chargé: ${schema.info.title} v${schema.info.version}`);
    console.log(`📊 ${Object.keys(schema.paths).length} endpoints disponibles`);
    console.log(`🏷️ ${schema.tags.length} tags disponibles`);
    
    // 2. Test de génération des tools
    console.log('\n2️⃣ Test de génération des tools...');
    const tools = getOpenAPIV2Tools();
    
    console.log(`✅ ${tools.length} tools générés`);
    console.log('📋 Liste des tools:');
    tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.function.name} - ${tool.function.description.substring(0, 60)}...`);
    });
    
    // 3. Test d'AgentApiV2Tools
    console.log('\n3️⃣ Test d\'AgentApiV2Tools...');
    const agentTools = new AgentApiV2Tools();
    
    // Attendre que l'initialisation soit terminée
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const allTools = agentTools.getAllTools();
    console.log(`✅ ${allTools.length} tools chargés dans AgentApiV2Tools`);
    
    // 4. Test de debug
    console.log('\n4️⃣ Informations de debug...');
    const debugInfo = schemaService.getDebugInfo();
    console.log('📊 Informations de debug:');
    console.log(JSON.stringify(debugInfo, null, 2));
    
    // 5. Test de recherche d'endpoints
    console.log('\n5️⃣ Test de recherche d\'endpoints...');
    const noteEndpoints = schemaService.findEndpoint('note');
    console.log(`📝 ${noteEndpoints.length} endpoints liés aux notes:`);
    noteEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
    
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  testOpenAPIIntegration().catch(console.error);
}

export { testOpenAPIIntegration };
