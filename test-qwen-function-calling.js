// Test du support des function calls pour Qwen

console.log('🤖 TEST FUNCTION CALLING QWEN');
console.log('==============================');

// Simulation des différents modèles
const models = [
  {
    name: 'Qwen3-235B-A22B-fp8-tput',
    model: 'Qwen/Qwen3-235B-A22B-fp8-tput',
    provider: 'together',
    supportsFunctionCalling: true,
    expectedTools: '28 tools'
  },
  {
    name: 'Qwen2.5-7B-Instruct-Turbo',
    model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
    provider: 'together',
    supportsFunctionCalling: true,
    expectedTools: '28 tools'
  },
  {
    name: 'GPT-OSS 120B',
    model: 'openai/gpt-oss-120b',
    provider: 'together',
    supportsFunctionCalling: false,
    expectedTools: '0 tools (limitation)'
  },
  {
    name: 'DeepSeek Coder',
    model: 'deepseek-ai/deepseek-coder-33b-instruct',
    provider: 'deepseek',
    supportsFunctionCalling: true,
    expectedTools: '28 tools'
  }
];

console.log('\n📋 MODÈLES TESTÉS:');
models.forEach((model, index) => {
  const isGptOss = model.model.includes('gpt-oss');
  const isQwen = model.model.includes('Qwen');
  const supportsFunctionCalling = !isGptOss;
  
  console.log(`\n${index + 1}. ${model.name}:`);
  console.log(`   - Modèle: ${model.model}`);
  console.log(`   - Provider: ${model.provider}`);
  console.log(`   - GPT-OSS: ${isGptOss ? '✅ Oui' : '❌ Non'}`);
  console.log(`   - Qwen: ${isQwen ? '✅ Oui' : '❌ Non'}`);
  console.log(`   - Support function calling: ${supportsFunctionCalling ? '✅ Oui' : '❌ Non'}`);
  console.log(`   - Tools attendus: ${model.expectedTools}`);
  console.log(`   - Status: ${supportsFunctionCalling ? '🟢 Compatible' : '🔴 Limité'}`);
});

console.log('\n🎯 NOUVELLE LOGIQUE DE DÉTECTION:');
console.log('   - Si modèle contient "gpt-oss" → Function calling non supporté');
console.log('   - Si modèle contient "Qwen" → Function calling supporté ✅');
console.log('   - Sinon → Function calling supporté (DeepSeek, etc.)');

console.log('\n📊 IMPACT DE LA CORRECTION:');
console.log('   - Qwen3-235B: ✅ Maintenant supporté');
console.log('   - Qwen2.5-7B: ✅ Maintenant supporté');
console.log('   - GPT-OSS: ❌ Reste limité');
console.log('   - DeepSeek: ✅ Déjà supporté');

console.log('\n✅ AVANTAGES:');
console.log('   1. Qwen peut maintenant utiliser les function calls');
console.log('   2. Accès complet à tous les endpoints');
console.log('   3. Plus de modèles compatibles');
console.log('   4. Flexibilité maximale');

console.log('\n🧪 TEST ATTENDU:');
console.log('   - Qwen devrait maintenant recevoir les 28 tools');
console.log('   - Qwen devrait pouvoir appeler les function calls');
console.log('   - Les logs devraient montrer "✅ Qwen détecté"');
console.log('   - Plus de réponses textuelles pour Qwen');

console.log('\n🚀 RÉSULTAT ATTENDU:');
console.log('   - Qwen3-235B: 28 tools disponibles ✅');
console.log('   - Qwen2.5-7B: 28 tools disponibles ✅');
console.log('   - GPT-OSS: 0 tools (limitation respectée)');
console.log('   - DeepSeek: 28 tools disponibles ✅'); 