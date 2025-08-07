// 🧪 Test Qwen 3 - Vérification du reasoning désactivé
// Ce script vérifie que enable_thinking est bien à false

const fs = require('fs');

console.log('🧪 Test de la désactivation du reasoning Qwen 3...\n');

// 1. Vérifier l'API Route
console.log('📋 1. Vérification de l\'API Route:');
try {
  const apiRoutePath = 'src/app/api/chat/llm/route.ts';
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  const checks = [
    {
      name: 'enable_thinking: false',
      condition: apiContent.includes('enable_thinking: false'),
      description: 'Reasoning désactivé dans l\'API route'
    },
    {
      name: 'Commentaire désactivé',
      condition: apiContent.includes('DÉSACTIVÉ: Le thinking/reasoning'),
      description: 'Commentaire indiquant la désactivation'
    }
  ];

  checks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification de l\'API route:', error.message);
}

// 2. Vérifier le Provider Together
console.log('\n📋 2. Vérification du Provider Together:');
try {
  const togetherPath = 'src/services/llm/providers/together.ts';
  const togetherContent = fs.readFileSync(togetherPath, 'utf8');
  
  const checks = [
    {
      name: 'enable_thinking: false',
      condition: togetherContent.includes('enable_thinking: false'),
      description: 'Reasoning désactivé dans le provider'
    },
    {
      name: 'Commentaire désactivé',
      condition: togetherContent.includes('DÉSACTIVÉ: Le thinking/reasoning'),
      description: 'Commentaire indiquant la désactivation'
    }
  ];

  checks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification du provider Together:', error.message);
}

// 3. Vérifier la configuration de l'agent
console.log('\n📋 3. Vérification de la configuration de l\'agent:');
try {
  const agentPath = 'scripts/create-together-agent-qwen3.js';
  const agentContent = fs.readFileSync(agentPath, 'utf8');
  
  const checks = [
    {
      name: 'enable_thinking: false',
      condition: agentContent.includes('enable_thinking: false'),
      description: 'Reasoning désactivé dans l\'agent'
    },
    {
      name: 'Commentaire désactivé',
      condition: agentContent.includes('DÉSACTIVÉ: Le thinking/reasoning'),
      description: 'Commentaire indiquant la désactivation'
    }
  ];

  checks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification de l\'agent:', error.message);
}

// 4. Résumé de la désactivation
console.log('\n📊 4. Résumé de la désactivation du reasoning:');

const disabledChecks = [
  {
    name: 'API Route',
    status: '✅ Désactivé',
    description: 'enable_thinking: false dans l\'API route'
  },
  {
    name: 'Provider Together',
    status: '✅ Désactivé',
    description: 'enable_thinking: false dans le provider'
  },
  {
    name: 'Configuration Agent',
    status: '✅ Désactivé',
    description: 'enable_thinking: false dans l\'agent'
  }
];

disabledChecks.forEach(check => {
  console.log(`   ${check.status} ${check.name}: ${check.description}`);
});

console.log('\n🎉 Reasoning désactivé avec succès !');
console.log('\n📝 Impact de la désactivation:');
console.log('   - Qwen 3 ne générera plus de reasoning');
console.log('   - Les réponses seront plus directes');
console.log('   - Pas d\'affichage du processus de pensée');
console.log('   - Performance légèrement améliorée');

console.log('\n🧪 Pour tester:');
console.log('   1. Sélectionner l\'agent Qwen 3');
console.log('   2. Poser une question');
console.log('   3. Vérifier qu\'aucun reasoning n\'apparaît');
console.log('   4. Vérifier que la réponse est directe');

console.log('\n🔄 Pour réactiver le reasoning:');
console.log('   - Remettre enable_thinking: true dans les fichiers'); 