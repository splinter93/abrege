import * as dotenv from 'dotenv';
dotenv.config();

import { openApiSchemaService } from '../src/services/llm/openApiSchemaService';

async function debug() {
  const tools = await openApiSchemaService.getToolsFromSchema('scrivia-api-v2');
  const applyContent = tools.find(t => t.type === 'function' && t.function.name === 'applyContentOperations');
  
  console.log('🔍 Tool applyContentOperations:');
  console.log(JSON.stringify(applyContent, null, 2));
}

debug();

