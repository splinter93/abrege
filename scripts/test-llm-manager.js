const { llmManager } = require('../src/services/llm/index.ts');

async function testLLMManager() {
  console.log('🧪 Test du LLM Manager');
  
  // Test 1: Vérifier les providers disponibles
  console.log('\n1️⃣ Providers disponibles:');
  const availableProviders = llmManager.getAvailableProviders();
  availableProviders.forEach(provider => {
    console.log(`   - ${provider.name} (${provider.id}): ${provider.isAvailable() ? '✅ Configuré' : '❌ Non configuré'}`);
  });

  // Test 2: Vérifier le provider actuel
  console.log('\n2️⃣ Provider actuel:');
  const currentProvider = llmManager.getCurrentProvider();
  console.log(`   - ${currentProvider?.name} (${currentProvider?.id})`);

  // Test 3: Changer de provider
  console.log('\n3️⃣ Changement de provider:');
  llmManager.setProvider('deepseek');
  console.log(`   - Nouveau provider: ${llmManager.getCurrentProvider()?.name}`);

  // Test 4: Contexte d'exemple
  const testContext = {
    type: 'article',
    id: 'test-123',
    name: 'Article de test',
    content: 'Ceci est un article de test pour vérifier le contexte.'
  };

  const testHistory = [
    { role: 'user', content: 'Salut !' },
    { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider ?' }
  ];

  console.log('\n4️⃣ Test d\'appel LLM:');
  console.log(`   - Contexte: ${testContext.name} (${testContext.id})`);
  console.log(`   - Provider: ${llmManager.getCurrentProvider()?.name}`);
  
  try {
    const response = await llmManager.call('Peux-tu m\'aider avec cet article ?', testContext, testHistory);
    console.log(`   - Réponse: ${response.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   - Erreur: ${error.message}`);
  }
}

testLLMManager().catch(console.error); 