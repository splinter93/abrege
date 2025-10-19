/**
 * Valide que TOUS les tools générés sont propres pour xAI
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { openApiSchemaService } from '../src/services/llm/openApiSchemaService';

async function validate() {
  console.log('🔍 Validation de tous les tools pour xAI\n');

  const tools = await openApiSchemaService.getToolsFromSchema('scrivia-api-v2');

  console.log(`✅ ${tools.length} tools générés\n`);

  let hasIssues = false;

  // Vérifier chaque tool
  for (const tool of tools) {
    if (tool.type !== 'function') {
      console.log(`❌ ${tool.type} - Type invalide (doit être 'function')`);
      hasIssues = true;
      continue;
    }

    const func = tool.function;

    // Vérifier les champs interdits dans les parameters
    const paramsStr = JSON.stringify(func.parameters);
    const forbiddenFields = ['format', 'maxLength', 'minLength', 'minimum', 'maximum', 'default', 'pattern'];
    
    for (const field of forbiddenFields) {
      if (paramsStr.includes(`"${field}"`)) {
        console.log(`❌ ${func.name} - Contient le champ interdit: ${field}`);
        hasIssues = true;
      }
    }

    // Vérifier que les champs requis sont présents
    if (!func.name) {
      console.log(`❌ Tool sans nom`);
      hasIssues = true;
    }

    if (!func.description) {
      console.log(`⚠️  ${func.name} - Pas de description`);
    }

    if (!func.parameters || func.parameters.type !== 'object') {
      console.log(`❌ ${func.name} - Parameters invalides`);
      hasIssues = true;
    }
  }

  if (!hasIssues) {
    console.log('✅ TOUS LES TOOLS SONT VALIDES !\n');
    
    // Afficher quelques exemples
    console.log('📋 Exemples de tools nettoyés:');
    tools.slice(0, 3).forEach((tool, i) => {
      console.log(`\n${i + 1}. ${tool.function.name}:`);
      console.log(JSON.stringify(tool, null, 2));
    });
  } else {
    console.log('\n❌ Des problèmes ont été détectés');
    process.exit(1);
  }
}

validate();

