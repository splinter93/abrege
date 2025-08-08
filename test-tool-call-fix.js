#!/usr/bin/env node

/**
 * Test de la correction des tool call IDs
 * Vérifie que les messages tool ont bien le tool_call_id
 */

console.log('🧪 Test de la correction des tool call IDs...');

// Simulation de l'historique de session avec des tool calls
const sessionHistory = [
  {
    id: '1',
    role: 'user',
    content: 'Liste mes classeurs',
    timestamp: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    role: 'assistant',
    content: null,
    tool_calls: [{
      id: 'call_1234567890',
      type: 'function',
      function: {
        name: 'list_classeurs',
        arguments: '{"user_id":"test-user"}'
      }
    }],
    timestamp: '2024-01-01T00:00:01.000Z'
  },
  {
    id: '3',
    role: 'tool',
    tool_call_id: 'call_1234567890',
    name: 'list_classeurs',
    content: JSON.stringify({
      success: true,
      data: [
        { id: 1, name: 'Classeur Principal', emoji: '📁' },
        { id: 2, name: 'Projets', emoji: '🚀' }
      ]
    }),
    timestamp: '2024-01-01T00:00:02.000Z'
  }
];

console.log('📥 Historique de session:');
console.log(JSON.stringify(sessionHistory, null, 2));

// Simulation de la préparation des messages (correction appliquée)
const systemContent = 'Assistant IA spécialisé dans l\'aide et la conversation.';
const message = 'Crée une note de test';

const messages = [
  {
    role: 'system',
    content: systemContent
  },
  ...sessionHistory.map((msg) => {
    const mappedMsg = {
      role: msg.role,
      content: msg.content
    };
    
    // 🔧 CORRECTION: Transmettre les tool_calls pour les messages assistant
    if (msg.role === 'assistant' && msg.tool_calls) {
      mappedMsg.tool_calls = msg.tool_calls;
    }
    
    // 🔧 CORRECTION: Transmettre tool_call_id et name pour les messages tool
    if (msg.role === 'tool') {
      if (msg.tool_call_id) {
        mappedMsg.tool_call_id = msg.tool_call_id;
      }
      if (msg.name) {
        mappedMsg.name = msg.name;
      }
    }
    
    return mappedMsg;
  }),
  {
    role: 'user',
    content: message
  }
];

console.log('\n📤 Messages préparés pour l\'API:');
console.log(JSON.stringify(messages, null, 2));

// Vérifications
console.log('\n🔍 Vérifications:');

// Vérification 1: Messages tool ont tool_call_id
const toolMessages = messages.filter(m => m.role === 'tool');
const allToolMessagesHaveId = toolMessages.every(m => m.tool_call_id);
console.log(`✅ Messages tool ont tool_call_id: ${allToolMessagesHaveId ? 'OUI' : 'NON'}`);

// Vérification 2: Messages tool ont name
const allToolMessagesHaveName = toolMessages.every(m => m.name);
console.log(`✅ Messages tool ont name: ${allToolMessagesHaveName ? 'OUI' : 'NON'}`);

// Vérification 3: Messages assistant ont tool_calls
const assistantMessages = messages.filter(m => m.role === 'assistant');
const allAssistantMessagesHaveToolCalls = assistantMessages.every(m => m.tool_calls);
console.log(`✅ Messages assistant ont tool_calls: ${allAssistantMessagesHaveToolCalls ? 'OUI' : 'NON'}`);

// Vérification 4: Correspondance des IDs
let idsMatch = true;
for (const toolMsg of toolMessages) {
  const correspondingAssistantMsg = assistantMessages.find(m => 
    m.tool_calls?.some(tc => tc.id === toolMsg.tool_call_id)
  );
  if (!correspondingAssistantMsg) {
    idsMatch = false;
    break;
  }
}
console.log(`✅ Correspondance des IDs: ${idsMatch ? 'OUI' : 'NON'}`);

// Vérification 5: Correspondance des noms
let namesMatch = true;
for (const toolMsg of toolMessages) {
  const correspondingAssistantMsg = assistantMessages.find(m => 
    m.tool_calls?.some(tc => tc.function.name === toolMsg.name)
  );
  if (!correspondingAssistantMsg) {
    namesMatch = false;
    break;
  }
}
console.log(`✅ Correspondance des noms: ${namesMatch ? 'OUI' : 'NON'}`);

// Résultat global
const allChecksPass = allToolMessagesHaveId && 
                     allToolMessagesHaveName && 
                     allAssistantMessagesHaveToolCalls && 
                     idsMatch && 
                     namesMatch;

console.log('\n🏁 Résultat global:');
if (allChecksPass) {
  console.log('🎉 Tous les tests passent ! La correction fonctionne.');
} else {
  console.log('❌ Certains tests échouent. Vérifiez la correction.');
}

// Test avec un payload complet
const payload = {
  model: 'openai/gpt-oss-120b',
  messages: messages,
  stream: true,
  temperature: 0.7,
  max_completion_tokens: 1000,
  top_p: 0.9,
  tools: [
    {
      type: 'function',
      function: {
        name: 'list_classeurs',
        description: 'Liste tous les classeurs de l\'utilisateur',
        parameters: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'ID de l\'utilisateur'
            }
          },
          required: ['user_id']
        }
      }
    }
  ],
  tool_choice: 'auto'
};

console.log('\n📦 Payload complet pour l\'API:');
console.log(JSON.stringify(payload, null, 2));

// Vérification finale du payload
const payloadHasValidMessages = payload.messages.every(m => {
  if (m.role === 'tool') {
    return m.tool_call_id && m.name && typeof m.content === 'string';
  }
  if (m.role === 'assistant' && m.tool_calls) {
    return Array.isArray(m.tool_calls) && m.tool_calls.every(tc => 
      tc.id && tc.type === 'function' && tc.function.name && tc.function.arguments
    );
  }
  return true;
});

console.log(`\n✅ Payload valide: ${payloadHasValidMessages ? 'OUI' : 'NON'}`);

if (payloadHasValidMessages) {
  console.log('🎉 Le payload est prêt pour l\'API Groq !');
} else {
  console.log('❌ Le payload contient des erreurs.');
} 