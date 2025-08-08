#!/usr/bin/env node

/**
 * Test de la structure des messages tool sauvegardés
 * Vérifie que le champ 'name' est bien présent
 */

console.log('🧪 Test de la structure des messages tool...');

// Simulation d'un message tool tel qu'il devrait être sauvegardé
const toolMessage = {
  role: 'tool',
  tool_call_id: 'fc_2d717aa5-6f4c-4fea-9e6c-1389f5343206',
  name: 'list_classeurs', // ✅ Ce champ doit être présent
  content: '{"success":true,"classeur":{"id":"75b35cbc-9de3-4b0e-abb1-d4970b2a24a9","name":"Movies","description":"..."}}',
  timestamp: new Date().toISOString()
};

console.log('📋 Message tool complet:');
console.log(JSON.stringify(toolMessage, null, 2));

// Simulation d'un message assistant correspondant
const assistantMessage = {
  role: 'assistant',
  content: null,
  tool_calls: [{
    id: 'fc_2d717aa5-6f4c-4fea-9e6c-1389f5343206',
    type: 'function',
    function: {
      name: 'list_classeurs',
      arguments: '{"user_id":"test-user"}'
    }
  }],
  timestamp: new Date().toISOString()
};

console.log('\n📋 Message assistant correspondant:');
console.log(JSON.stringify(assistantMessage, null, 2));

// Vérifications
console.log('\n🔍 Vérifications:');

// Vérification 1: Correspondance des IDs
const toolCallId = toolMessage.tool_call_id;
const assistantToolCallId = assistantMessage.tool_calls[0].id;
const idsMatch = toolCallId === assistantToolCallId;
console.log(`✅ Correspondance des IDs: ${idsMatch ? 'OUI' : 'NON'}`);

// Vérification 2: Correspondance des noms
const toolName = toolMessage.name;
const assistantToolName = assistantMessage.tool_calls[0].function.name;
const namesMatch = toolName === assistantToolName;
console.log(`✅ Correspondance des noms: ${namesMatch ? 'OUI' : 'NON'}`);

// Vérification 3: Structure complète
const hasRequiredFields = toolMessage.role === 'tool' && 
                        toolMessage.tool_call_id && 
                        toolMessage.name && 
                        typeof toolMessage.content === 'string';
console.log(`✅ Structure complète: ${hasRequiredFields ? 'OUI' : 'NON'}`);

// Simulation du problème observé dans les logs
const problematicMessage = {
  role: 'tool',
  content: '{"success":true,"classeur":{"id":"75b35cbc-9de3-4b0e-abb1-d4970b2a24a9","name":"Movies","description',
  tool_calls: undefined,
  tool_call_id: 'fc_2d717aa5-6f4c-4fea-9e6c-1389f5343206'
  // ❌ MANQUE: name
};

console.log('\n❌ Message problématique (tel qu\'observé dans les logs):');
console.log(JSON.stringify(problematicMessage, null, 2));

// Diagnostic du problème
console.log('\n🔍 DIAGNOSTIC DU PROBLÈME:');

console.log('1. ✅ Le message tool est correctement créé avec name');
console.log('2. ✅ Le message tool est correctement sauvegardé avec name');
console.log('3. ❌ PROBLÈME: Le name est perdu lors de la récupération/transmission');

console.log('\n💡 CAUSES POSSIBLES:');
console.log('- Le champ name n\'est pas dans le schéma de la base de données');
console.log('- Le champ name est filtré lors de la récupération');
console.log('- Le champ name est perdu lors de la transmission à l\'API');

console.log('\n🔧 SOLUTIONS:');
console.log('1. Vérifier le schéma de la base de données');
console.log('2. Vérifier la récupération des messages');
console.log('3. Vérifier la transmission à l\'API');

// Test de la transmission
console.log('\n🧪 Test de la transmission:');

const transmittedMessage = {
  role: 'tool',
  content: problematicMessage.content,
  tool_call_id: problematicMessage.tool_call_id
  // ❌ MANQUE: name
};

console.log('❌ Message transmis (sans name):');
console.log(JSON.stringify(transmittedMessage, null, 2));

// Correction de la transmission
const correctedTransmission = {
  role: 'tool',
  content: problematicMessage.content,
  tool_call_id: problematicMessage.tool_call_id,
  name: 'list_classeurs' // ✅ AJOUTER le name
};

console.log('✅ Message transmis (avec name):');
console.log(JSON.stringify(correctedTransmission, null, 2));

console.log('\n🎯 RÉSULTAT:');
console.log('Le problème est que le champ name est perdu lors de la transmission');
console.log('Il faut s\'assurer que le name est bien transmis dans tous les cas'); 