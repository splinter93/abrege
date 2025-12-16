/**
 * Tests d'intégration pour l'API Memory Synesia
 * Collection de tests pratiques pour valider le fonctionnement
 *
 * Usage:
 *   node MEMORY-API-TESTS.js <API_KEY> <MEMORY_ID> [BASE_URL]
 *
 * Exemples:
 *   node MEMORY-API-TESTS.js "apiKey.12345.abcdef" "mem_abc123"
 *   node MEMORY-API-TESTS.js "apiKey.12345.abcdef" "mem_abc123" "http://localhost:3000"
 */

const API_KEY = process.argv[2];
const MEMORY_ID = process.argv[3];
const BASE_URL = process.argv[4] || 'https://origins-server.up.railway.app';

if (!API_KEY || !MEMORY_ID) {
  console.error('❌ API_KEY et MEMORY_ID requis');
  console.error('Usage: node MEMORY-API-TESTS.js <API_KEY> <MEMORY_ID> [BASE_URL]');
  process.exit(1);
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

// Configuration des tests
const CONFIG = {
  timeout: 30000,
  retries: 3
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
        try {
          const errorData = await error.response.json();
          console.log(`   Détails:`, JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log(`   Réponse:`, await error.response.text());
        }
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

async function apiCall(endpoint, body = null, method = 'GET') {
  const url = `${BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: AUTH_HEADERS,
    ...(body && { body: JSON.stringify(body) })
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = response;
      throw error;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Tests de base des entrées
 */
async function testCreateEntry() {
  const testContent = `Test entry ${Date.now()}`;
  const testMetadata = {
    tags: ['test', 'integration'],
    source: 'api_test',
    custom: { test_id: 'create_entry_test' }
  };

  const response = await apiCall(`/memory/${MEMORY_ID}/entries`, {
    content: testContent,
    metadata: testMetadata
  }, 'POST');

  if (!response.data?.entry_id) {
    throw new Error('Pas d\'entry_id dans la réponse');
  }

  if (response.error !== null) {
    throw new Error(`Erreur inattendue: ${response.error}`);
  }

  console.log(`   📝 Entrée créée: ${response.data.entry_id}`);

  // Nettoyer
  global.testEntryId = response.data.entry_id;

  return response.data.entry_id;
}

async function testListEntries() {
  const response = await apiCall(`/memory/${MEMORY_ID}/entries?limit=5&offset=0`);

  if (!Array.isArray(response.data)) {
    throw new Error('Les données ne sont pas un tableau');
  }

  if (!response.pagination) {
    throw new Error('Pas d\'informations de pagination');
  }

  if (response.pagination.limit !== 5) {
    throw new Error('Limite de pagination incorrecte');
  }

  console.log(`   📋 ${response.data.length} entrées listées`);
  console.log(`   📄 Pagination: ${response.pagination.has_more ? 'Plus de résultats' : 'Tous les résultats'}`);

  return response;
}

async function testSearchEntries() {
  // D'abord créer une entrée de test
  const testContent = `Contenu de test unique ${Date.now()} pour la recherche`;
  await apiCall(`/memory/${MEMORY_ID}/entries`, {
    content: testContent,
    metadata: { tags: ['search_test'] }
  }, 'POST');

  // Attendre que l'indexation soit terminée (embeddings)
  await new Promise(resolve => setTimeout(resolve, 2000));

  const response = await apiCall(`/memory/${MEMORY_ID}/search`, {
    query: 'test unique recherche',
    top_k: 3
  }, 'POST');

  if (!Array.isArray(response.data)) {
    throw new Error('Les résultats de recherche ne sont pas un tableau');
  }

  if (response.data.length === 0) {
    console.log(`   ⚠️ Aucune entrée trouvée (possiblement pas encore indexée)`);
    return;
  }

  // Vérifier que les résultats ont la structure attendue
  const firstResult = response.data[0];
  if (!firstResult.id || !firstResult.value || !firstResult.created_at) {
    throw new Error('Structure de résultat de recherche invalide');
  }

  console.log(`   🔍 ${response.data.length} résultats trouvés`);
  console.log(`   📄 Premier résultat: "${firstResult.value.substring(0, 50)}..."`);

  return response;
}

async function testDeleteEntry() {
  if (!global.testEntryId) {
    throw new Error('Aucune entrée de test à supprimer');
  }

  const response = await apiCall(
    `/memory/${MEMORY_ID}/entries/${global.testEntryId}`,
    null,
    'DELETE'
  );

  if (response.data !== true) {
    throw new Error('Suppression échouée');
  }

  console.log(`   🗑️ Entrée supprimée: ${global.testEntryId}`);

  // Vérifier que l'entrée n'existe plus
  try {
    await apiCall(`/memory/${MEMORY_ID}/entries/${global.testEntryId}`);
    throw new Error('L\'entrée existe encore après suppression');
  } catch (error) {
    if (error.response?.status !== 404) {
      throw new Error('Erreur inattendue lors de la vérification de suppression');
    }
  }

  console.log(`   ✅ Vérification: entrée supprimée confirmée`);
}

/**
 * Tests de recherche avancée
 */
async function testSearchWithMetadata() {
  // Créer plusieurs entrées avec différentes métadonnées
  const entries = [
    {
      content: 'Article sur l\'intelligence artificielle moderne',
      metadata: { tags: ['ia', 'technologie'], source: 'tech_blog' }
    },
    {
      content: 'Guide de développement web avec React',
      metadata: { tags: ['react', 'javascript', 'web'], source: 'dev_guide' }
    },
    {
      content: 'Analyse des tendances blockchain 2024',
      metadata: { tags: ['blockchain', 'crypto'], source: 'finance_report' }
    }
  ];

  for (const entry of entries) {
    await apiCall(`/memory/${MEMORY_ID}/entries`, entry, 'POST');
  }

  // Attendre l'indexation
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Rechercher avec différents termes
  const searchTerms = ['intelligence artificielle', 'développement web', 'blockchain'];

  for (const term of searchTerms) {
    const response = await apiCall(`/memory/${MEMORY_ID}/search`, {
      query: term,
      top_k: 2
    }, 'POST');

    if (!Array.isArray(response.data)) {
      throw new Error(`Recherche "${term}" : résultats invalides`);
    }

    console.log(`   🔍 "${term}": ${response.data.length} résultats`);
  }
}

async function testPagination() {
  // Créer plusieurs entrées pour tester la pagination
  for (let i = 0; i < 7; i++) {
    await apiCall(`/memory/${MEMORY_ID}/entries`, {
      content: `Entrée de pagination ${i + 1}`,
      metadata: { tags: ['pagination_test'] }
    }, 'POST');
  }

  // Tester différentes pages
  const page1 = await apiCall(`/memory/${MEMORY_ID}/entries?limit=3&offset=0`);
  const page2 = await apiCall(`/memory/${MEMORY_ID}/entries?limit=3&offset=3`);
  const page3 = await apiCall(`/memory/${MEMORY_ID}/entries?limit=3&offset=6`);

  if (page1.data.length !== 3) {
    throw new Error('Page 1: nombre d\'entrées incorrect');
  }

  if (page2.data.length !== 3) {
    throw new Error('Page 2: nombre d\'entrées incorrect');
  }

  if (page3.data.length !== 1) {
    throw new Error('Page 3: nombre d\'entrées incorrect');
  }

  if (!page1.pagination.has_more) {
    throw new Error('Page 1 devrait indiquer qu\'il y a plus de résultats');
  }

  if (!page2.pagination.has_more) {
    throw new Error('Page 2 devrait indiquer qu\'il y a plus de résultats');
  }

  if (page3.pagination.has_more) {
    throw new Error('Page 3 ne devrait pas indiquer qu\'il y a plus de résultats');
  }

  console.log(`   📄 Pagination testée: ${page1.data.length} + ${page2.data.length} + ${page3.data.length} = ${page1.data.length + page2.data.length + page3.data.length} entrées`);
}

/**
 * Tests de chat RAG
 */
async function testChatBasic() {
  const messages = [
    { role: 'user', content: 'Bonjour, peux-tu m\'aider ?' }
  ];

  const response = await fetch(`${BASE_URL}/memory/${MEMORY_ID}/chat`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      messages,
      instructions: 'Tu es un assistant utile et amical.',
      llm_model_id: 'gpt-4o-mini'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let events = [];
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const chunkEvents = chunk.split('\\n\\n').filter(line => line.startsWith('data: '));

    for (const event of chunkEvents) {
      try {
        const data = JSON.parse(event.replace('data: ', ''));
        events.push(data);

        if (data.type === 'chunk') {
          fullResponse += data.content;
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }
  }

  // Vérifier qu'on a eu des événements de mémoire
  const memoryEvents = events.filter(e => e.type === 'memory.search.results');
  if (memoryEvents.length === 0) {
    console.log(`   ⚠️ Aucun événement de recherche mémoire (mémoire vide ?)`);
  } else {
    console.log(`   🧠 ${memoryEvents[0].data.count} entrées mémoire trouvées`);
  }

  // Vérifier qu'on a eu du contenu
  const contentEvents = events.filter(e => e.type === 'chunk');
  if (contentEvents.length === 0) {
    throw new Error('Aucun contenu reçu dans le chat');
  }

  // Vérifier l'événement de fin
  const endEvents = events.filter(e => e.type === 'end');
  if (endEvents.length === 0) {
    throw new Error('Aucun événement de fin reçu');
  }

  if (!endEvents[0].usage) {
    throw new Error('Pas d\'informations d\'usage dans l\'événement de fin');
  }

  console.log(`   💬 Chat terminé: ${fullResponse.length} caractères`);
  console.log(`   📊 Usage: ${endEvents[0].usage.total_tokens} tokens`);

  return { events, fullResponse };
}

async function testChatWithMemoryContext() {
  // Créer une entrée spécifique pour tester le RAG
  await apiCall(`/memory/${MEMORY_ID}/entries`, {
    content: 'Synesia est une plateforme d\'IA pour créer des agents conversationnels avec des outils avancés comme la mémoire vectorielle, les APIs externes et le streaming temps réel.',
    metadata: {
      tags: ['synesia', 'plateforme', 'ia'],
      source: 'test_context'
    }
  }, 'POST');

  // Attendre l'indexation
  await new Promise(resolve => setTimeout(resolve, 2000));

  const messages = [
    { role: 'user', content: 'Quelles sont les fonctionnalités principales de Synesia ?' }
  ];

  const response = await fetch(`${BASE_URL}/memory/${MEMORY_ID}/chat`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      messages,
      instructions: 'Tu es un expert Synesia. Réponds de façon claire.',
      llm_model_id: 'gpt-4o-mini'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let memoryContext = null;
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = chunk.split('\\n\\n').filter(line => line.startsWith('data: '));

    for (const event of events) {
      try {
        const data = JSON.parse(event.replace('data: ', ''));
        if (data.type === 'memory.search.results') {
          memoryContext = data.data;
        } else if (data.type === 'chunk') {
          fullResponse += data.content;
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }
  }

  if (!memoryContext || memoryContext.entries.length === 0) {
    console.log(`   ⚠️ Aucun contexte mémoire trouvé`);
    return;
  }

  console.log(`   🧠 Contexte mémoire: ${memoryContext.entries.length} entrées`);
  console.log(`   📝 Première entrée: "${memoryContext.entries[0].value.substring(0, 80)}..."`);

  // Vérifier que la réponse contient des éléments du contexte
  const hasContextInResponse = memoryContext.entries.some(entry =>
    fullResponse.toLowerCase().includes(entry.value.toLowerCase().split(' ')[0])
  );

  if (hasContextInResponse) {
    console.log(`   ✅ La réponse utilise le contexte mémoire`);
  } else {
    console.log(`   ⚠️ La réponse pourrait ne pas utiliser le contexte mémoire`);
  }
}

/**
 * Tests de traitement automatique
 */
async function testProcessText() {
  // Note: Nécessite un agent de traitement configuré dans la mémoire
  try {
    const testText = `
    L'intelligence artificielle transforme notre façon de travailler.
    Les modèles de langage comme GPT permettent de générer du texte de qualité.
    La mémoire vectorielle améliore le contexte des conversations.
    Les embeddings permettent des recherches sémantiques précises.
    `;

    const response = await apiCall(`/memory/${MEMORY_ID}/process`, {
      text: testText
    }, 'POST');

    if (!Array.isArray(response.data)) {
      throw new Error('Les IDs d\'entrées ne sont pas un tableau');
    }

    console.log(`   ⚙️ ${response.data.length} entrées créées automatiquement`);

    if (response.data.length > 0) {
      console.log(`   📝 IDs créés: ${response.data.slice(0, 3).join(', ')}${response.data.length > 3 ? '...' : ''}`);
    }

    return response.data;
  } catch (error) {
    if (error.response?.status === 400 && error.message?.includes('process_agent_id')) {
      console.log(`   ⚠️ Agent de traitement non configuré (test ignoré)`);
      return [];
    }
    throw error;
  }
}

/**
 * Tests d'erreurs
 */
async function testInvalidMemoryId() {
  try {
    await apiCall('/memory/invalid-memory-id/entries', {
      content: 'Test'
    }, 'POST');
    throw new Error('Devrait avoir échoué');
  } catch (error) {
    if (error.response?.status !== 404 && error.response?.status !== 403) {
      throw new Error(`Status d'erreur inattendu: ${error.response?.status}`);
    }
    console.log(`   🚫 Accès refusé pour mémoire invalide (${error.response.status})`);
  }
}

async function testInvalidEntryData() {
  const invalidData = [
    { content: '', metadata: {} }, // Contenu vide
    { content: 'Test', metadata: { tags: 'invalid' } }, // Tags pas un tableau
    { content: 'Test', metadata: { extracted_at: 'invalid-date' } } // Date invalide
  ];

  for (const data of invalidData) {
    try {
      await apiCall(`/memory/${MEMORY_ID}/entries`, data, 'POST');
      throw new Error('Devrait avoir échoué pour les données invalides');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`Validation devrait échouer (status 400), reçu ${error.response?.status}`);
      }
    }
  }

  console.log(`   ✅ Validation des données testée (${invalidData.length} cas)`);
}

async function testSearchInvalidQuery() {
  try {
    await apiCall(`/memory/${MEMORY_ID}/search`, {
      query: '',
      top_k: 5
    }, 'POST');
    throw new Error('Devrait avoir échoué');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw new Error('Query vide devrait être rejetée');
    }
    console.log(`   🚫 Query vide rejetée correctement`);
  }
}

/**
 * Tests de performance
 */
async function testConcurrentOperations() {
  const operations = Array(5).fill().map((_, i) =>
    apiCall(`/memory/${MEMORY_ID}/entries`, {
      content: `Test concurrent ${i + 1} - ${Date.now()}`,
      metadata: { tags: ['performance_test'] }
    }, 'POST')
  );

  const startTime = Date.now();
  const results = await Promise.all(operations);
  const endTime = Date.now();

  const avgTime = (endTime - startTime) / results.length;

  if (avgTime > 5000) { // 5 secondes par opération
    throw new Error(`Performance trop lente: ${avgTime}ms en moyenne`);
  }

  console.log(`   ⚡ ${results.length} opérations concurrentes: ${avgTime.toFixed(0)}ms moyenne`);

  return results;
}

async function testLargeContent() {
  const largeContent = 'A'.repeat(50000); // 50KB de contenu

  const startTime = Date.now();
  const response = await apiCall(`/memory/${MEMORY_ID}/entries`, {
    content: largeContent,
    metadata: { tags: ['large_content_test'] }
  }, 'POST');
  const endTime = Date.now();

  if (endTime - startTime > 10000) { // 10 secondes max
    throw new Error(`Traitement de gros contenu trop lent: ${endTime - startTime}ms`);
  }

  console.log(`   📦 Gros contenu (${largeContent.length} caractères) traité en ${endTime - startTime}ms`);

  return response;
}

/**
 * Fonction principale
 */
async function runAllTests() {
  console.log('🚀 Démarrage des tests API Memory Synesia');
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`🧠 Memory ID: ${MEMORY_ID}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('');

  const runner = new TestRunner();

  // Tests de base
  await runner.run('Création d\'entrée', testCreateEntry);
  await runner.run('Listage d\'entrées', testListEntries);
  await runner.run('Recherche d\'entrées', testSearchEntries);
  await runner.run('Suppression d\'entrée', testDeleteEntry);

  // Tests avancés
  await runner.run('Recherche avec métadonnées', testSearchWithMetadata);
  await runner.run('Pagination', testPagination);

  // Tests de chat
  await runner.run('Chat basique', testChatBasic);
  await runner.run('Chat avec contexte mémoire', testChatWithMemoryContext);

  // Tests de traitement
  await runner.run('Traitement automatique', testProcessText);

  // Tests d'erreurs
  await runner.run('Mémoire invalide', testInvalidMemoryId);
  await runner.run('Données invalides', testInvalidEntryData);
  await runner.run('Recherche invalide', testSearchInvalidQuery);

  // Tests de performance
  await runner.run('Opérations concurrentes', testConcurrentOperations);
  await runner.run('Gros contenu', testLargeContent);

  runner.summary();

  console.log('\\n✨ Tests terminés !');
  console.log('\\n📚 Ressources supplémentaires :');
  console.log('- Documentation complète : docs/MEMORY-API-GUIDE.md');
  console.log('- Exemples d\'intégration : docs/MEMORY-API-INTEGRATION-EXAMPLES.ts');

  if (runner.failed > 0) {
    process.exit(1);
  }
}

// Lancer les tests
runAllTests().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
