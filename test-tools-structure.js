// Test simple de la structure des tools
const { agentApiV2Tools } = require('./src/services/agentApiV2Tools.ts');

console.log('🔧 Test de la structure des Tools');
console.log('================================');

// Afficher la structure des tools
const tools = agentApiV2Tools.getToolsForFunctionCalling();

console.log('\n📋 Structure des tools:');
console.log(JSON.stringify(tools[0], null, 2));

console.log('\n✅ Vérification du schéma:');
const firstTool = tools[0];

if (firstTool.type === 'function' && 
    firstTool.function.name && 
    firstTool.function.description && 
    firstTool.function.parameters &&
    firstTool.function.parameters.type === 'object' &&
    firstTool.function.parameters.properties &&
    firstTool.function.parameters.required) {
  console.log('✅ Structure conforme au schéma standard');
} else {
  console.log('❌ Structure non conforme');
}

console.log('\n🎯 Exemple de tool:');
console.log(`- Type: ${firstTool.type}`);
console.log(`- Nom: ${firstTool.function.name}`);
console.log(`- Description: ${firstTool.function.description.substring(0, 50)}...`);
console.log(`- Paramètres requis: ${firstTool.function.parameters.required.join(', ')}`);
console.log(`- Propriétés: ${Object.keys(firstTool.function.parameters.properties).join(', ')}`); 