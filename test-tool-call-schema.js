#!/usr/bin/env node

/**
 * Test du schéma des tool calls
 * Vérifie que le format respecte le schéma attendu
 */

console.log('🧪 Test du schéma des tool calls...');

// Simulation d'un tool call complet selon le schéma
const toolCallId = 'call_1754521710929';
const toolName = 'create_note';
const toolArguments = '{"notebook_id":"movies","markdown_content":"Test content"}';

// 1) Assistant déclencheur
const assistantMessage = {
  role: 'assistant',
  content: null, // jamais "undefined"
  tool_calls: [{
    id: toolCallId, // ID arbitraire
    type: 'function',
    function: {
      name: toolName,
      arguments: toolArguments
    }
  }]
};

console.log('📝 1) Assistant déclencheur:');
console.log(JSON.stringify(assistantMessage, null, 2));

// 2) Réponse du tool
const toolMessage = {
  role: 'tool',
  tool_call_id: toolCallId, // même ID
  name: toolName, // même nom
  content: '{"success":false,"error":"notebook_id manquant"}'
};

console.log('\n📝 2) Réponse du tool:');
console.log(JSON.stringify(toolMessage, null, 2));

// 3) Historique complet pour le modèle
const completeHistory = [
  {
    role: 'user',
    content: 'Crée une note de test'
  },
  assistantMessage,
  toolMessage
];

console.log('\n📦 3) Historique complet pour le modèle:');
console.log(JSON.stringify(completeHistory, null, 2));

// Vérifications du schéma
console.log('\n🔍 Vérifications du schéma:');

// Vérification 1: Assistant content est null
const assistantContentIsNull = assistantMessage.content === null;
console.log(`✅ Assistant content est null: ${assistantContentIsNull ? 'OUI' : 'NON'}`);

// Vérification 2: Tool calls est un array
const toolCallsIsArray = Array.isArray(assistantMessage.tool_calls);
console.log(`✅ Tool calls est un array: ${toolCallsIsArray ? 'OUI' : 'NON'}`);

// Vérification 3: IDs correspondent
const idsMatch = assistantMessage.tool_calls[0].id === toolMessage.tool_call_id;
console.log(`✅ IDs correspondent: ${idsMatch ? 'OUI' : 'NON'}`);

// Vérification 4: Noms correspondent
const namesMatch = assistantMessage.tool_calls[0].function.name === toolMessage.name;
console.log(`✅ Noms correspondent: ${namesMatch ? 'OUI' : 'NON'}`);

// Vérification 5: Tool message a tous les champs requis
const toolHasRequiredFields = toolMessage.role === 'tool' && 
                             toolMessage.tool_call_id && 
                             toolMessage.name && 
                             typeof toolMessage.content === 'string';
console.log(`✅ Tool message a tous les champs requis: ${toolHasRequiredFields ? 'OUI' : 'NON'}`);

// Vérification 6: Pas de "undefined" dans le content
const noUndefinedContent = assistantMessage.content !== undefined;
console.log(`✅ Pas de "undefined" dans le content: ${noUndefinedContent ? 'OUI' : 'NON'}`);

// Résultat global
const allChecksPass = assistantContentIsNull && 
                     toolCallsIsArray && 
                     idsMatch && 
                     namesMatch && 
                     toolHasRequiredFields && 
                     noUndefinedContent;

console.log('\n🏁 Résultat global:');
if (allChecksPass) {
  console.log('🎉 Tous les tests passent ! Le schéma est correct.');
} else {
  console.log('❌ Certains tests échouent. Vérifiez le schéma.');
}

// Test avec des données réelles
console.log('\n🧪 Test avec des données réelles:');

const realToolCall = {
  id: 'call_1234567890',
  type: 'function',
  function: {
    name: 'list_classeurs',
    arguments: '{"user_id":"test-user"}'
  }
};

const realAssistantMessage = {
  role: 'assistant',
  content: null,
  tool_calls: [realToolCall]
};

const realToolMessage = {
  role: 'tool',
  tool_call_id: realToolCall.id,
  name: realToolCall.function.name,
  content: JSON.stringify({
    success: true,
    data: [
      { id: 1, name: 'Classeur Principal', emoji: '📁' },
      { id: 2, name: 'Projets', emoji: '🚀' }
    ]
  })
};

console.log('📝 Assistant message réel:');
console.log(JSON.stringify(realAssistantMessage, null, 2));

console.log('\n📝 Tool message réel:');
console.log(JSON.stringify(realToolMessage, null, 2));

// Vérification finale
const realIdsMatch = realAssistantMessage.tool_calls[0].id === realToolMessage.tool_call_id;
const realNamesMatch = realAssistantMessage.tool_calls[0].function.name === realToolMessage.name;

console.log('\n🔍 Vérifications avec données réelles:');
console.log(`✅ IDs correspondent: ${realIdsMatch ? 'OUI' : 'NON'}`);
console.log(`✅ Noms correspondent: ${realNamesMatch ? 'OUI' : 'NON'}`);

if (realIdsMatch && realNamesMatch) {
  console.log('🎉 Test avec données réelles réussi !');
} else {
  console.log('❌ Test avec données réelles échoué.');
} 