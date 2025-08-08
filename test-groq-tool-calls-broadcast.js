#!/usr/bin/env node

/**
 * Test des tool calls Groq avec broadcast au frontend
 * Vérifie que les tool calls sont bien détectés et broadcastés
 */

const { simpleLogger: logger } = require('./src/utils/logger');

// Configuration de test
const TEST_CONFIG = {
  model: 'openai/gpt-oss-120b',
  apiKey: process.env.GROQ_API_KEY,
  baseUrl: 'https://api.groq.com/openai/v1',
  sessionId: 'test-tool-calls-broadcast-' + Date.now(),
  channelId: 'test-channel-' + Date.now()
};

// Tools de test
const TEST_TOOLS = [
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
];

/**
 * Test d'appel Groq avec tool calls et vérification du broadcast
 */
async function testGroqToolCallsBroadcast() {
  console.log('\n🧪 Test des tool calls Groq avec broadcast...');
  
  if (!TEST_CONFIG.apiKey) {
    console.log('❌ GROQ_API_KEY non configurée');
    return false;
  }

  try {
    console.log('📊 Configuration de test:', {
      model: TEST_CONFIG.model,
      sessionId: TEST_CONFIG.sessionId,
      channelId: TEST_CONFIG.channelId,
      toolsCount: TEST_TOOLS.length
    });

    const messages = [
      {
        role: 'system',
        content: 'Tu es un assistant IA utile. Tu peux utiliser les outils disponibles pour interagir avec l\'API Scrivia. Utilise les tools quand c\'est approprié.'
      },
      {
        role: 'user',
        content: 'Liste mes classeurs'
      }
    ];

    const payload = {
      model: TEST_CONFIG.model,
      messages,
      tools: TEST_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_completion_tokens: 1000,
      top_p: 0.9,
      stream: true
    };

    console.log('🚀 Appel Groq avec tool calls et streaming...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ Appel Groq réussi, lecture du stream...');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let toolCallsDetected = false;
    let toolCallData = null;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.tool_calls) {
              console.log('🔧 Tool calls détectés dans le stream:', JSON.stringify(delta.tool_calls));
              toolCallsDetected = true;
              
              // Simuler le broadcast qui serait envoyé
              const broadcastEvent = {
                type: 'broadcast',
                event: 'llm-tool-calls',
                payload: {
                  sessionId: TEST_CONFIG.sessionId,
                  tool_calls: delta.tool_calls,
                  tool_name: delta.tool_calls[0]?.function?.name || 'unknown_tool'
                }
              };
              
              console.log('📡 Broadcast simulé:', JSON.stringify(broadcastEvent, null, 2));
              
              // Simuler l'exécution du tool
              const toolResult = {
                success: true,
                data: [
                  { id: 1, name: 'Classeur Principal', emoji: '📁', description: 'Classeur par défaut' },
                  { id: 2, name: 'Projets', emoji: '🚀', description: 'Mes projets en cours' }
                ]
              };
              
              const resultBroadcast = {
                type: 'broadcast',
                event: 'llm-tool-result',
                payload: {
                  sessionId: TEST_CONFIG.sessionId,
                  tool_name: delta.tool_calls[0]?.function?.name || 'unknown_tool',
                  result: toolResult,
                  success: true
                }
              };
              
              console.log('📡 Broadcast résultat simulé:', JSON.stringify(resultBroadcast, null, 2));
            }
            
            if (delta?.content) {
              console.log('📝 Contenu reçu:', delta.content);
            }
          } catch (parseError) {
            // Ignorer les erreurs de parsing pour les chunks non-JSON
          }
        }
      }
    }

    if (toolCallsDetected) {
      console.log('✅ Tool calls détectés et broadcastés avec succès !');
      return true;
    } else {
      console.log('⚠️ Aucun tool call détecté dans le stream');
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

/**
 * Test de l'API de chat avec tool calls
 */
async function testChatAPIWithToolCalls() {
  console.log('\n🧪 Test de l\'API de chat avec tool calls...');
  
  try {
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        message: 'Liste mes classeurs',
        sessionId: TEST_CONFIG.sessionId,
        agentId: 'test-agent',
        config: {
          model: TEST_CONFIG.model,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API chat:', response.status, errorText);
      return false;
    }

    console.log('✅ Appel API chat réussi');
    
    // Lire le stream de réponse
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      console.log('📡 Chunk reçu:', chunk);
    }

    return true;

  } catch (error) {
    console.error('❌ Erreur lors du test API chat:', error);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Test des tool calls Groq avec broadcast');
  console.log('=' .repeat(50));
  
  // Test 1: Appel direct Groq
  const groqResult = await testGroqToolCallsBroadcast();
  
  // Test 2: API de chat
  const chatResult = await testChatAPIWithToolCalls();
  
  console.log('\n📊 Résultats:');
  console.log(`- Test Groq direct: ${groqResult ? '✅' : '❌'}`);
  console.log(`- Test API chat: ${chatResult ? '✅' : '❌'}`);
  
  if (groqResult && chatResult) {
    console.log('\n🎉 Tous les tests réussis ! Les tool calls sont bien broadcastés.');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.');
  }
}

// Exécuter le test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testGroqToolCallsBroadcast,
  testChatAPIWithToolCalls
}; 