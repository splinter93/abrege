/**
 * Script de test pour vérifier la génération des tools depuis OpenAPI
 * 
 * Usage:
 *   npx tsx scripts/test-openapi-tools.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { openApiSchemaService } from '../src/services/llm/openApiSchemaService';

async function test() {
  console.log('🧪 Test de génération des tools OpenAPI\n');

  try {
    // Charger les tools depuis le schéma
    const tools = await openApiSchemaService.getToolsFromSchema('scrivia-api-v2');

    console.log(`✅ ${tools.length} tools générés\n`);

    // Afficher les 10 premiers
    console.log('📋 Premiers tools:');
    tools.slice(0, 10).forEach((tool, i) => {
      if (tool.type === 'function') {
        console.log(`  ${i + 1}. ${tool.function.name}`);
        console.log(`     Description: ${tool.function.description?.substring(0, 60)}...`);
        console.log(`     Parameters: ${Object.keys(tool.function.parameters?.properties || {}).join(', ')}`);
        console.log();
      }
    });

    // Vérifier qu'on a bien les tools essentiels
    const essentialTools = ['getNote', 'createNote', 'updateNote', 'listClasseurs', 'searchContent'];
    console.log('✅ Vérification des tools essentiels:');
    
    for (const toolName of essentialTools) {
      const found = tools.find(t => t.type === 'function' && t.function.name === toolName);
      console.log(`  ${found ? '✅' : '❌'} ${toolName}`);
    }

    console.log('\n🎉 Test terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

test();

