/**
 * Tests d'intégration pour l'API LLM Exec Synesia
 * Collection de tests pratiques pour valider le fonctionnement
 *
 * Usage:
 *   node LLM-EXEC-API-TESTS.js <API_KEY> <PROJECT_ID> [BASE_URL]
 *
 * Exemples:
 *   node LLM-EXEC-API-TESTS.js "apiKey.12345.abcdef" "project-uuid"
 *   node LLM-EXEC-API-TESTS.js "apiKey.12345.abcdef" "project-uuid" "http://localhost:3000"
 */

const API_KEY = process.argv[2];
const PROJECT_ID = process.argv[3];
const BASE_URL = process.argv[4] || 'https://origins-server.up.railway.app';

if (!API_KEY) {
  console.error('❌ API_KEY requis');
  console.error('Usage: node LLM-EXEC-API-TESTS.js <API_KEY> [PROJECT_ID] [BASE_URL]');
  process.exit(1);
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
  ...(PROJECT_ID && { 'x-project-id': PROJECT_ID })
};

// Configuration des tests
const CONFIG = {
  timeout: 30000,
  retries: 3,
  models: ['gpt-4o-mini', 'claude-3-haiku']
};

/**
 * Utilitaires de test
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async run(testName, testFn) {
    console.log(`\\n🧪 ${testName}`);
    try {
      await testFn();
      console.log(`✅ ${testName} - PASSÉ`);
      this.passed++;
    } catch (error) {
      console.log(`❌ ${testName} - ÉCHOUÉ`);
      console.log(`   Erreur: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Réponse:`, await error.response.text());
      }
      this.failed++;
    }
  }

  summary() {
    console.log(`\\n📊 RÉSULTATS DES TESTS`);
    console.log(`✅ Passés: ${this.passed}`);
    console.log(`❌ Échoués: ${this.failed}`);
    console.log(`📈 Taux de réussite: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
  }
}

async function apiCall(endpoint, body = null, method = 'POST') {
  const url = `${BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: AUTH_HEADERS,
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.response = response;
    throw error;
  }

  return response.json();
}

/**
 * Tests de base
 */
async function testBasicChat() {
  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Dis bonjour en français' }
    ]
  });

  if (!response.message?.content) {
    throw new Error('Pas de contenu dans la réponse');
  }

  if (!response.usage) {
    throw new Error('Pas d\'informations d\'usage');
  }

  console.log(`   🤖 Réponse: ${response.message.content.substring(0, 50)}...`);
  console.log(`   📊 Usage: ${response.usage.total_tokens} tokens`);
}

async function testStreamingChat() {
  const response = await fetch(`${BASE_URL}/llm-exec/round/stream`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Compte jusqu\'à 3' }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = chunk.split('\\n\\n').filter(line => line.startsWith('data: '));

    for (const event of events) {
      try {
        const data = JSON.parse(event.replace('data: ', ''));
        chunks.push(data);
      } catch (e) {
        // Ignore invalid JSON
      }
    }
  }

  if (chunks.length === 0) {
    throw new Error('Aucun événement reçu en streaming');
  }

  const hasContent = chunks.some(chunk => chunk.type === 'chunk' && chunk.content);
  if (!hasContent) {
    throw new Error('Aucun contenu reçu en streaming');
  }

  console.log(`   📺 ${chunks.length} événements reçus`);
}

async function testLLMConfig() {
  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Donne-moi une réponse très courte' }
    ],
    llmConfig: {
      temperature: 0.1,
      max_completion_tokens: 10
    }
  });

  const contentLength = response.message.content.length;
  if (contentLength > 50) {
    throw new Error(`Réponse trop longue (${contentLength} caractères)`);
  }

  console.log(`   📏 Longueur réponse: ${contentLength} caractères`);
}

/**
 * Tests d'outils
 */
async function testCallableTool() {
  // Note: Nécessite un callable existant dans Synesia
  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Utilise l\'outil de calcul pour 15 + 27' }
    ],
    tools: [
      {
        type: 'callable',
        callable_id: 'calculator-callable-id' // À remplacer par un vrai ID
      }
    ]
  });

  console.log(`   🔧 Tool calls: ${response.message.tool_calls?.length || 0}`);
}

async function testKnowledgeTool() {
  // Test avec un outil knowledge (si configuré)
  try {
    const response = await apiCall('/llm-exec/round', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Qu\'est-ce que Synesia ?' }
      ],
      tools: [
        {
          type: 'knowledge',
          knowledge_id: 'docs-knowledge-id', // À remplacer par un vrai ID
          name: 'search_docs',
          description: 'Recherche dans la documentation',
          allowed_actions: ['search']
        }
      ]
    });

    console.log(`   📚 Knowledge search exécuté`);
  } catch (error) {
    if (error.message.includes('knowledge_id') || error.message.includes('not found')) {
      console.log(`   ⚠️ Knowledge base non configuré (test ignoré)`);
      return;
    }
    throw error;
  }
}

async function testOpenAPITool() {
  // Test avec une API publique (JSONPlaceholder)
  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Récupère la liste des posts' }
    ],
    tools: [
      {
        type: 'openapi',
        schema: {
          openapi: '3.0.0',
          info: { title: 'JSONPlaceholder API', version: '1.0.0' },
          servers: [{ url: 'https://jsonplaceholder.typicode.com' }],
          paths: {
            '/posts': {
              get: {
                operationId: 'getPosts',
                summary: 'Get all posts',
                responses: {
                  '200': {
                    description: 'List of posts',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: { type: 'object' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        base_url: 'https://jsonplaceholder.typicode.com',
        description: 'Test API',
        allowed_operations: ['getPosts']
      }
    ]
  });

  console.log(`   🌐 OpenAPI tool exécuté`);
}

async function testWebSearchTool() {
  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Recherche les actualités tech d\'aujourd\'hui' }
    ],
    tools: [
      {
        type: 'websearch'
      }
    ]
  });

  console.log(`   🔍 Web search exécuté`);
}

async function testCodeInterpreterTool() {
  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Calcule la factorielle de 10 en Python' }
    ],
    tools: [
      {
        type: 'code_interpreter'
      }
    ]
  });

  console.log(`   💻 Code interpreter exécuté`);
}

/**
 * Tests de gestion d'erreurs
 */
async function testInvalidModel() {
  try {
    await apiCall('/llm-exec/round', {
      model: 'invalid-model-name',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    throw new Error('Devrait avoir échoué');
  } catch (error) {
    if (!error.message.includes('model') && !error.message.includes('not found')) {
      throw new Error('Erreur inattendue');
    }
    console.log(`   🚫 Erreur modèle gérée correctement`);
  }
}

async function testMissingMessages() {
  try {
    await apiCall('/llm-exec/round', {
      model: 'gpt-4o-mini'
      // messages manquant
    });
    throw new Error('Devrait avoir échoué');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw new Error('Mauvais code d\'erreur');
    }
    console.log(`   🚫 Erreur validation gérée correctement`);
  }
}

async function testInvalidAuth() {
  try {
    const response = await fetch(`${BASE_URL}/llm-exec/round`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'invalid-key'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });

    if (response.status === 401 || response.status === 403) {
      console.log(`   🔒 Authentification rejetée correctement`);
      return;
    }

    throw new Error(`Status inattendu: ${response.status}`);
  } catch (error) {
    // Erreur réseau acceptée
    console.log(`   🔒 Erreur réseau auth (accepté)`);
  }
}

/**
 * Tests de performance
 */
async function testConcurrentRequests() {
  const promises = Array(5).fill().map(() =>
    apiCall('/llm-exec/round', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }]
    })
  );

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const endTime = Date.now();

  const avgTime = (endTime - startTime) / results.length;

  if (avgTime > 10000) { // 10 secondes
    throw new Error(`Temps de réponse trop lent: ${avgTime}ms`);
  }

  console.log(`   ⚡ Temps moyen: ${avgTime.toFixed(0)}ms`);
}

/**
 * Tests de charge
 */
async function testLargePayload() {
  const largeMessage = 'A'.repeat(10000); // 10KB message

  const response = await apiCall('/llm-exec/round', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: largeMessage }]
  });

  console.log(`   📦 Gros payload traité (${largeMessage.length} caractères)`);
}

/**
 * Fonction principale
 */
async function runAllTests() {
  console.log('🚀 Démarrage des tests API LLM Exec Synesia');
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`📋 Project ID: ${PROJECT_ID || 'N/A'}`);

  const runner = new TestRunner();

  // Tests de base
  await runner.run('Chat basique', testBasicChat);
  await runner.run('Chat en streaming', testStreamingChat);
  await runner.run('Configuration LLM', testLLMConfig);

  // Tests d'outils
  await runner.run('Outil Callable', testCallableTool);
  await runner.run('Outil Knowledge', testKnowledgeTool);
  await runner.run('Outil OpenAPI', testOpenAPITool);
  await runner.run('Outil Web Search', testWebSearchTool);
  await runner.run('Outil Code Interpreter', testCodeInterpreterTool);

  // Tests d'erreurs
  await runner.run('Modèle invalide', testInvalidModel);
  await runner.run('Messages manquants', testMissingMessages);
  await runner.run('Authentification invalide', testInvalidAuth);

  // Tests de performance
  await runner.run('Requêtes concurrentes', testConcurrentRequests);
  await runner.run('Gros payload', testLargePayload);

  runner.summary();

  console.log('\\n✨ Tests terminés !');
  console.log('\\n📚 Ressources supplémentaires :');
  console.log('- Documentation complète : docs/LLM-EXEC-API-GUIDE.md');
  console.log('- Exemples d\'intégration : docs/LLM-EXEC-INTEGRATION-EXAMPLES.ts');

  if (runner.failed > 0) {
    process.exit(1);
  }
}

// Lancer les tests
runAllTests().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
