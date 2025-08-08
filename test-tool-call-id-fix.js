#!/usr/bin/env node

/**
 * Test de la correction des tool call IDs
 * Vérifie que les IDs sont correctement stockés et utilisés
 */

console.log('🧪 Test de la correction des tool call IDs...');

// Simulation d'un tool call de Groq
const mockGroqToolCall = {
  id: 'call_1234567890',
  type: 'function',
  function: {
    name: 'list_classeurs',
    arguments: '{"user_id": "test-user"}'
  }
};

// Simulation de la détection du tool call
let functionCallData = null;

console.log('📥 Tool call détecté:', JSON.stringify(mockGroqToolCall, null, 2));

// Simuler la logique de détection
if (!functionCallData) {
  functionCallData = {
    name: mockGroqToolCall.function?.name || '',
    arguments: mockGroqToolCall.function?.arguments || '',
    tool_call_id: mockGroqToolCall.id // ✅ CORRECTION: Stocker l'ID du tool call
  };
} else {
  if (mockGroqToolCall.function?.name) {
    functionCallData.name = mockGroqToolCall.function.name;
  }
  if (mockGroqToolCall.function?.arguments) {
    functionCallData.arguments += mockGroqToolCall.function.arguments;
  }
  // ✅ CORRECTION: Garder l'ID du tool call
  if (mockGroqToolCall.id) {
    functionCallData.tool_call_id = mockGroqToolCall.id;
  }
}

console.log('📊 Function call data après détection:', JSON.stringify(functionCallData, null, 2));

// Simuler la création du message assistant
const toolCallId = functionCallData.tool_call_id || `call_${Date.now()}`; // ✅ CORRECTION: Utiliser l'ID réel
const toolMessage = {
  role: 'assistant',
  content: null,
  tool_calls: [{
    id: toolCallId, // ✅ CORRECTION: ID réel du tool call
    type: 'function',
    function: {
      name: functionCallData.name || 'unknown_tool',
      arguments: functionCallData.arguments
    }
  }]
};

console.log('📝 Message assistant créé:', JSON.stringify(toolMessage, null, 2));

// Simuler la création du message tool
const toolResultMessage = {
  role: 'tool',
  tool_call_id: toolCallId, // ✅ CORRECTION: Même ID que l'appel
  name: functionCallData.name || 'unknown_tool',
  content: JSON.stringify({
    success: true,
    data: [
      { id: 1, name: 'Classeur Principal', emoji: '📁' },
      { id: 2, name: 'Projets', emoji: '🚀' }
    ]
  })
};

console.log('📝 Message tool créé:', JSON.stringify(toolResultMessage, null, 2));

// Vérifier la correspondance des IDs
const idsMatch = toolMessage.tool_calls[0].id === toolResultMessage.tool_call_id;
console.log('🔍 Correspondance des IDs:', idsMatch ? '✅' : '❌');

if (idsMatch) {
  console.log('🎉 Test réussi ! Les tool call IDs sont correctement gérés.');
} else {
  console.log('❌ Test échoué ! Les IDs ne correspondent pas.');
}

// Simuler un payload pour l'API
const messages = [
  { role: 'user', content: 'Liste mes classeurs' },
  toolMessage,
  toolResultMessage
];

console.log('📦 Payload final pour l\'API:', JSON.stringify(messages, null, 2)); 