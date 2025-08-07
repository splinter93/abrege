// 🧪 Test Groq - Diagnostic des Problèmes
// Ce script diagnostique les problèmes avec l'intégration Groq

console.log('🧪 Diagnostic des problèmes avec Groq...\n');

// 1. Vérifier les variables d'environnement
console.log('📋 1. Vérification des variables d\'environnement:');

const requiredEnvVars = [
  'GROQ_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 10)}...` : 'Non défini';
  console.log(`   ${status} ${envVar}: ${displayValue}`);
});

// 2. Vérifier la logique de détection dans l'API Route
console.log('\n🔧 2. Analyse de la logique de détection:');

const apiRoutePath = 'src/app/api/chat/llm/route.ts';
const fs = require('fs');

try {
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  const checks = [
    {
      name: 'Détection GPT-OSS',
      condition: apiContent.includes('isGptOss = config.model.includes(\'gpt-oss\')'),
      description: 'Détection du modèle GPT-OSS'
    },
    {
      name: 'Décision Groq',
      condition: apiContent.includes('const useGroq = isGptOss'),
      description: 'Décision d\'utiliser Groq pour GPT-OSS'
    },
    {
      name: 'URL Groq',
      condition: apiContent.includes('https://api.groq.com/openai/v1/chat/completions'),
      description: 'URL de l\'API Groq'
    },
    {
      name: 'Payload Groq',
      condition: apiContent.includes('max_completion_tokens'),
      description: 'Payload spécifique à Groq'
    },
    {
      name: 'Clé API Groq',
      condition: apiContent.includes('process.env.GROQ_API_KEY'),
      description: 'Utilisation de la clé API Groq'
    },
    {
      name: 'Reasoning effort',
      condition: apiContent.includes('reasoning_effort: \'medium\''),
      description: 'Activation du reasoning pour Groq'
    }
  ];

  checks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification de l\'API route:', error.message);
}

// 3. Vérifier la configuration de l'agent Groq
console.log('\n📋 3. Vérification de la configuration de l\'agent Groq:');

const agentConfig = {
  name: 'Groq GPT-OSS',
  model: 'openai/gpt-oss-120b',
  provider: 'groq'
};

console.log('📋 Configuration attendue:');
console.log(`   - Nom: ${agentConfig.name}`);
console.log(`   - Modèle: ${agentConfig.model}`);
console.log(`   - Provider: ${agentConfig.provider}`);

// 4. Test de la logique de détection
console.log('\n🧪 4. Test de la logique de détection:');

const testModels = [
  'openai/gpt-oss-120b',
  'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
  'Qwen/Qwen3-235B-A22B-fp8-tput',
  'deepseek-chat'
];

testModels.forEach(model => {
  const isGptOss = model.includes('gpt-oss');
  const useGroq = isGptOss;
  const provider = useGroq ? 'Groq' : 'Together AI';
  
  console.log(`   Modèle: ${model}`);
  console.log(`   - isGptOss: ${isGptOss}`);
  console.log(`   - useGroq: ${useGroq}`);
  console.log(`   - Provider: ${provider}`);
  console.log('');
});

// 5. Scénarios de test
console.log('🧪 5. Scénarios de test:');

const scenarios = [
  {
    name: 'Agent Groq sélectionné',
    description: 'Agent avec provider=groq et modèle=gpt-oss',
    expected: '✅ Utilise l\'API Groq'
  },
  {
    name: 'Agent Together GPT-OSS',
    description: 'Agent avec provider=together et modèle=gpt-oss',
    expected: '❌ Utilise Together AI au lieu de Groq'
  },
  {
    name: 'Variables d\'environnement manquantes',
    description: 'GROQ_API_KEY non définie',
    expected: '❌ Erreur 500'
  },
  {
    name: 'Payload incorrect',
    description: 'Payload mal formaté pour Groq',
    expected: '❌ Erreur API'
  }
];

scenarios.forEach(scenario => {
  console.log(`   ${scenario.name}: ${scenario.description} - ${scenario.expected}`);
});

// 6. Recommandations de correction
console.log('\n🔧 6. Recommandations de correction:');

const recommendations = [
  {
    priority: '🔴 CRITIQUE',
    issue: 'Variables d\'environnement manquantes',
    solution: 'Vérifier que GROQ_API_KEY est définie dans .env.local',
    impact: 'Erreur 500 immédiate'
  },
  {
    priority: '🟡 MOYEN',
    issue: 'Logique de détection incorrecte',
    solution: 'Vérifier que l\'agent a bien provider=groq',
    impact: 'Utilise le mauvais provider'
  },
  {
    priority: '🟢 FAIBLE',
    issue: 'Payload mal formaté',
    solution: 'Vérifier le format du payload pour Groq',
    impact: 'Erreur API'
  }
];

recommendations.forEach(rec => {
  console.log(`   ${rec.priority} ${rec.issue}: ${rec.solution} - Impact: ${rec.impact}`);
});

// 7. Test avec l'exemple d'erreur
console.log('\n📋 7. Analyse de l\'erreur fournie:');

const errorInfo = {
  error: 'POST /api/chat/llm 500 in 302ms',
  line: '283',
  message: 'Désolé, une erreur est survenue lors du traitement de votre message.'
};

console.log('📥 Erreur détectée:');
console.log(`   - Type: ${errorInfo.error}`);
console.log(`   - Ligne: ${errorInfo.line}`);
console.log(`   - Message: ${errorInfo.message}`);

console.log('\n🎯 Diagnostic probable:');
console.log('   - Erreur 500 sur la route /api/chat/llm');
console.log('   - Probablement lié à une variable d\'environnement manquante');
console.log('   - Ou à une logique de détection incorrecte');

console.log('\n📝 Actions recommandées:');
console.log('   1. Vérifier que GROQ_API_KEY est définie dans .env.local');
console.log('   2. Vérifier que l\'agent sélectionné a provider=groq');
console.log('   3. Vérifier les logs de l\'API pour plus de détails');
console.log('   4. Tester avec un agent Together AI pour comparer');

console.log('\n🔗 Documentation:');
console.log('   - API Route: src/app/api/chat/llm/route.ts');
console.log('   - Ligne ~283: Probablement dans la logique de détection');
console.log('   - Variables d\'environnement: .env.local');
console.log('   - Agent Groq: scripts/create-groq-agent.js'); 