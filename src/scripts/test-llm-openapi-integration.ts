#!/usr/bin/env tsx

/**
 * Script de test final pour valider l'intégration complète du schéma OpenAPI V2 avec le système LLM
 */

import { getOpenAPISchemaService } from '../services/openApiSchemaService';
import { getOpenAPIV2Tools } from '../services/openApiToolsGenerator';

async function testLLMOpenAPIIntegration() {
  console.log('🧪 Test final d\'intégration LLM + OpenAPI V2\n');

  try {
    // 1. Test du service de schéma
    console.log('1️⃣ Test du service de schéma OpenAPI V2...');
    const schemaService = getOpenAPISchemaService();
    const schema = schemaService.getSchema();
    
    console.log(`✅ Schéma chargé: ${schema.info.title} v${schema.info.version}`);
    console.log(`📊 ${Object.keys(schema.paths).length} endpoints disponibles`);
    
    // 2. Test de génération des tools
    console.log('\n2️⃣ Test de génération des tools pour LLM...');
    const tools = getOpenAPIV2Tools();
    
    console.log(`✅ ${tools.length} tools générés pour les LLMs`);
    
    // Vérifier que les tools ont le bon format
    const validTools = tools.filter(tool => 
      tool.type === 'function' && 
      tool.function && 
      tool.function.name && 
      tool.function.description &&
      tool.function.parameters
    );
    
    console.log(`✅ ${validTools.length} tools avec format valide`);
    
    // 3. Test des tools spécifiques
    console.log('\n3️⃣ Test des tools spécifiques...');
    
    const toolNames = tools.map(tool => tool.function.name);
    const expectedTools = [
      'create_note',
      'get_note', 
      'update_note',
      'delete_note',
      'add_content_to_note',
      'move_note',
      'create_classeur',
      'list_classeurs',
      'create_folder',
      'search_notes',
      'get_user_info',
      'get_platform_stats'
    ];
    
    const foundTools = expectedTools.filter(expected => 
      toolNames.includes(expected)
    );
    
    console.log(`✅ ${foundTools.length}/${expectedTools.length} tools attendus trouvés`);
    console.log('📋 Tools trouvés:');
    foundTools.forEach(tool => {
      console.log(`   - ${tool}`);
    });
    
    const missingTools = expectedTools.filter(expected => 
      !toolNames.includes(expected)
    );
    
    if (missingTools.length > 0) {
      console.log('⚠️ Tools manquants:');
      missingTools.forEach(tool => {
        console.log(`   - ${tool}`);
      });
    }
    
    // 4. Test des paramètres des tools
    console.log('\n4️⃣ Test des paramètres des tools...');
    
    const createNoteTool = tools.find(tool => tool.function.name === 'create_note');
    if (createNoteTool) {
      const params = createNoteTool.function.parameters;
      console.log('📝 Tool create_note:');
      console.log(`   - Type: ${params.type}`);
      console.log(`   - Propriétés: ${Object.keys(params.properties).length}`);
      console.log(`   - Requis: ${params.required?.length || 0}`);
      
      if (params.required?.includes('source_title') && params.required?.includes('notebook_id')) {
        console.log('✅ Paramètres requis corrects pour create_note');
      } else {
        console.log('❌ Paramètres requis manquants pour create_note');
      }
    }
    
    // 5. Test de compatibilité avec Groq
    console.log('\n5️⃣ Test de compatibilité avec Groq...');
    
    // Vérifier que les tools sont compatibles avec le format Groq
    const groqCompatibleTools = tools.filter(tool => {
      const func = tool.function;
      return func.name && 
             func.description && 
             func.parameters &&
             func.parameters.type === 'object' &&
             func.parameters.properties &&
             typeof func.parameters.properties === 'object';
    });
    
    console.log(`✅ ${groqCompatibleTools.length}/${tools.length} tools compatibles avec Groq`);
    
    // 6. Test de performance
    console.log('\n6️⃣ Test de performance...');
    
    const startTime = Date.now();
    const tools2 = getOpenAPIV2Tools(); // Deuxième génération
    const endTime = Date.now();
    
    console.log(`✅ Génération des tools: ${endTime - startTime}ms`);
    console.log(`✅ ${tools2.length} tools générés (identique: ${tools.length === tools2.length})`);
    
    // 7. Résumé final
    console.log('\n🎉 Test d\'intégration terminé avec succès !');
    console.log('\n📊 Résumé final:');
    console.log(`   - Schéma: ${schema.info.title} v${schema.info.version}`);
    console.log(`   - Endpoints: ${Object.keys(schema.paths).length}`);
    console.log(`   - Tools générés: ${tools.length}`);
    console.log(`   - Tools valides: ${validTools.length}`);
    console.log(`   - Tools attendus trouvés: ${foundTools.length}/${expectedTools.length}`);
    console.log(`   - Compatible Groq: ${groqCompatibleTools.length}/${tools.length}`);
    console.log(`   - Performance: ${endTime - startTime}ms`);
    
    // 8. Recommandations
    console.log('\n💡 Recommandations:');
    if (foundTools.length === expectedTools.length) {
      console.log('✅ Tous les tools attendus sont disponibles');
    } else {
      console.log('⚠️ Certains tools attendus sont manquants');
    }
    
    if (groqCompatibleTools.length === tools.length) {
      console.log('✅ Tous les tools sont compatibles avec Groq');
    } else {
      console.log('⚠️ Certains tools ne sont pas compatibles avec Groq');
    }
    
    if (endTime - startTime < 100) {
      console.log('✅ Performance excellente (< 100ms)');
    } else if (endTime - startTime < 500) {
      console.log('✅ Performance correcte (< 500ms)');
    } else {
      console.log('⚠️ Performance à améliorer (> 500ms)');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  testLLMOpenAPIIntegration().catch(console.error);
}

export { testLLMOpenAPIIntegration };
