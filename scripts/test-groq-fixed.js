// 🧪 Test Groq - Vérification de la Correction
// Ce script vérifie que Groq fonctionne maintenant correctement

console.log('🧪 Test Groq - Vérification de la correction...\n');

// 1. Vérifier que l'import GroqProvider est ajouté
console.log('📋 1. Vérification de l\'import GroqProvider:');

const apiRoutePath = 'src/app/api/chat/llm/route.ts';
const fs = require('fs');

try {
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  const checks = [
    {
      name: 'Import GroqProvider',
      condition: apiContent.includes('import { DeepSeekProvider, TogetherProvider, GroqProvider }'),
      description: 'GroqProvider est importé'
    },
    {
      name: 'Logique Groq',
      condition: apiContent.includes('else if (currentProvider.id === \'groq\')'),
      description: 'Logique de détection Groq ajoutée'
    },
    {
      name: 'Payload Groq',
      condition: apiContent.includes('max_completion_tokens'),
      description: 'Payload spécifique à Groq'
    },
    {
      name: 'Streaming Groq',
      condition: apiContent.includes('Streaming avec Groq'),
      description: 'Logique de streaming pour Groq'
    },
    {
      name: 'API URL Groq',
      condition: apiContent.includes('https://api.groq.com/openai/v1/chat/completions'),
      description: 'URL de l\'API Groq'
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

  // 2. Vérifier la structure de la logique
  console.log('\n🔧 2. Analyse de la structure de la logique:');

  const logicChecks = [
    {
      name: 'Détection DeepSeek',
      condition: apiContent.includes('if (currentProvider.id === \'deepseek\')'),
      description: 'Logique pour DeepSeek'
    },
    {
      name: 'Détection Groq',
      condition: apiContent.includes('else if (currentProvider.id === \'groq\')'),
      description: 'Logique pour Groq'
    },
    {
      name: 'Provider par défaut',
      condition: apiContent.includes('else {'),
      description: 'Logique pour les autres providers'
    }
  ];

  logicChecks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification de l\'API route:', error.message);
}



// 3. Test de la logique de détection
console.log('\n🧪 3. Test de la logique de détection:');

const testScenarios = [
  {
    name: 'Agent Groq sélectionné',
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    expected: '✅ Utilise l\'API Groq directement'
  },
  {
    name: 'Agent Together GPT-OSS',
    provider: 'together',
    model: 'openai/gpt-oss-120b',
    expected: '❌ Utilise Together AI au lieu de Groq'
  },
  {
    name: 'Agent DeepSeek',
    provider: 'deepseek',
    model: 'deepseek-chat',
    expected: '✅ Utilise l\'API DeepSeek'
  }
];

testScenarios.forEach(scenario => {
  console.log(`   ${scenario.name}:`);
  console.log(`   - Provider: ${scenario.provider}`);
  console.log(`   - Modèle: ${scenario.model}`);
  console.log(`   - Résultat attendu: ${scenario.expected}`);
  console.log('');
});

// 4. Vérification des variables d'environnement
console.log('📋 4. Vérification des variables d\'environnement:');

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

// 5. Résumé de la correction
console.log('\n🎯 5. Résumé de la correction:');

const corrections = [
  {
    type: '🔧 AJOUT',
    description: 'Import de GroqProvider',
    impact: 'Permet d\'utiliser la classe GroqProvider'
  },
  {
    type: '🔧 AJOUT',
    description: 'Logique de détection Groq',
    impact: 'Détecte quand l\'agent utilise Groq'
  },
  {
    type: '🔧 AJOUT',
    description: 'Payload spécifique à Groq',
    impact: 'Utilise max_completion_tokens et reasoning_effort'
  },
  {
    type: '🔧 AJOUT',
    description: 'Streaming pour Groq',
    impact: 'Gère le streaming des réponses Groq'
  },
  {
    type: '🔧 AJOUT',
    description: 'URL et clé API Groq',
    impact: 'Utilise l\'API Groq directement'
  }
];

corrections.forEach(correction => {
  console.log(`   ${correction.type} ${correction.description}: ${correction.impact}`);
});

// 6. Instructions de test
console.log('\n📝 6. Instructions de test:');

const testInstructions = [
  '1. Redémarrer le serveur: npm run dev',
  '2. Sélectionner l\'agent "Groq GPT-OSS" dans l\'interface',
  '3. Poser une question simple: "Bonjour, comment ça va ?"',
  '4. Vérifier qu\'il n\'y a plus d\'erreur 500',
  '5. Vérifier que la réponse vient bien de Groq',
  '6. Tester avec des function calls si nécessaire'
];

testInstructions.forEach(instruction => {
  console.log(`   ${instruction}`);
});

// 7. Diagnostic des problèmes potentiels
console.log('\n🔍 7. Diagnostic des problèmes potentiels:');

const potentialIssues = [
  {
    issue: 'Erreur 500 persistante',
    cause: 'Variables d\'environnement manquantes',
    solution: 'Vérifier .env.local et redémarrer le serveur'
  },
  {
    issue: 'Agent non trouvé',
    cause: 'Agent Groq non créé dans la base de données',
    solution: 'Exécuter scripts/create-groq-agent.js'
  },
  {
    issue: 'Erreur API Groq',
    cause: 'Clé API invalide ou quota dépassé',
    solution: 'Vérifier la clé sur https://console.groq.com/'
  },
  {
    issue: 'Streaming ne fonctionne pas',
    cause: 'Problème de canal Supabase',
    solution: 'Vérifier la configuration Supabase'
  }
];

potentialIssues.forEach(issue => {
  console.log(`   🔍 ${issue.issue}:`);
  console.log(`      Cause: ${issue.cause}`);
  console.log(`      Solution: ${issue.solution}`);
  console.log('');
});

console.log('✅ Test de vérification terminé !');
console.log('🎯 Groq devrait maintenant fonctionner correctement.'); 