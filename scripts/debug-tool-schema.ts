/**
 * Debug : Afficher un tool généré pour voir le problème
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { openApiSchemaService } from '../src/services/llm/openApiSchemaService';

async function debug() {
  const tools = await openApiSchemaService.getToolsFromSchema('scrivia-api-v2');
  
  // Afficher le premier tool (createNote)
  const createNote = tools.find(t => t.type === 'function' && t.function.name === 'createNote');
  
  console.log('🔍 Tool createNote:');
  console.log(JSON.stringify(createNote, null, 2));
}

debug();

