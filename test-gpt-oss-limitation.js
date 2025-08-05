// Test de la limitation GPT-OSS - Function calling non supporté

console.log('🚨 TEST LIMITATION GPT-OSS');
console.log('===========================');

// Simulation des différents modèles
const models = [
  {
    name: 'GPT-OSS 120B',
    model: 'openai/gpt-oss-120b',
    provider: 'together',
    supportsFunctionCalling: false
  },
  {
    name: 'DeepSeek Coder',
    model: 'deepseek-ai/deepseek-coder-33b-instruct',
    provider: 'deepseek',
    supportsFunctionCalling: true
  },
  {
    name: 'Llama 3.1 70B',
    model: 'meta-llama/Llama-3.1-70B-Instruct',
    provider: 'together',
    supportsFunctionCalling: true
  }
];

console.log('\n📋 MODÈLES TESTÉS:');
models.forEach(model => {
  const isGptOss = model.model.includes('gpt-oss');
  const supportsFunctionCalling = !isGptOss;
  
  console.log(`\n🔧 ${model.name}:`);
  console.log(`   - Modèle: ${model.model}`);
  console.log(`   - Provider: ${model.provider}`);
  console.log(`   - GPT-OSS: ${isGptOss ? '✅ Oui' : '❌ Non'}`);
  console.log(`   - Support function calling: ${supportsFunctionCalling ? '✅ Oui' : '❌ Non'}`);
  console.log(`   - Status: ${supportsFunctionCalling ? '🟢 Compatible' : '🔴 Limité'}`);
});

console.log('\n🎯 LOGIQUE DE DÉTECTION:');
console.log('   - Si modèle contient "gpt-oss" → Function calling non supporté');
console.log('   - Sinon → Function calling supporté');

console.log('\n📊 IMPACT SUR LES TOOLS:');
console.log('   - GPT-OSS: tools = undefined (pas de function calling)');
console.log('   - Autres modèles: tools = filtrés selon capacités');

console.log('\n💡 RECOMMANDATIONS:');
console.log('   1. Utiliser DeepSeek pour les function calls');
console.log('   2. Utiliser Llama 3.1 70B sur Together AI');
console.log('   3. Attendre la mise à jour de GPT-OSS');
console.log('   4. Informer l\'utilisateur de la limitation');

console.log('\n✅ CORRECTION IMPLÉMENTÉE:');
console.log('   - Détection automatique de GPT-OSS');
console.log('   - Désactivation des tools pour GPT-OSS');
console.log('   - Message d\'information à l\'utilisateur');
console.log('   - Logging détaillé pour debug');

console.log('\n🎯 RÉSULTAT ATTENDU:');
console.log('   - GPT-OSS: Réponses textuelles normales');
console.log('   - DeepSeek: Function calls complets');
console.log('   - Llama 3.1: Function calls complets'); 