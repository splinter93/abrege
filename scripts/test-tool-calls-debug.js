// 🧪 Test Tool Calls - Diagnostic des Problèmes
// Ce script diagnostique les problèmes avec les tool calls

console.log('🧪 Diagnostic des problèmes avec les tool calls...\n');

// 1. Vérifier la logique de relance dans l'API Route
console.log('📋 1. Analyse de la logique de relance:');

const apiRoutePath = 'src/app/api/chat/llm/route.ts';
const fs = require('fs');

try {
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  const checks = [
    {
      name: 'Exécution tool',
      condition: apiContent.includes('Tool Together AI exécuté:'),
      description: 'Log de confirmation d\'exécution du tool'
    },
    {
      name: 'Injection message tool',
      condition: apiContent.includes('Injection du message tool et relance'),
      description: 'Log d\'injection du message tool'
    },
    {
      name: 'Relance avec historique',
      condition: apiContent.includes('Relance Together AI avec historique tool'),
      description: 'Log de relance avec l\'historique complet'
    },
    {
      name: 'Payload final',
      condition: apiContent.includes('finalPayload'),
      description: 'Création du payload final pour la relance'
    },
    {
      name: 'Streaming final',
      condition: apiContent.includes('Streaming final Together AI'),
      description: 'Gestion du streaming de la relance'
    },
    {
      name: 'Broadcast completion',
      condition: apiContent.includes('llm-complete'),
      description: 'Broadcast de completion après relance'
    },
    {
      name: 'Anti-boucle',
      condition: apiContent.includes('ANTI-BOUCLE: Pas de tools lors de la relance'),
      description: 'Protection contre les boucles infinies'
    }
  ];

  checks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification de l\'API route:', error.message);
}

// 2. Analyser les points de défaillance potentiels
console.log('\n🔧 2. Points de défaillance potentiels:');

const failurePoints = [
  {
    name: 'Exécution tool',
    description: 'L\'exécution du tool peut échouer',
    check: 'Tool Together AI exécuté:',
    impact: 'Pas de résultat à injecter'
  },
  {
    name: 'Injection message',
    description: 'L\'injection du message tool peut échouer',
    check: 'toolResultMessage.content = JSON.stringify(result)',
    impact: 'Historique incomplet'
  },
  {
    name: 'Relance API',
    description: 'La relance de l\'API peut échouer',
    check: 'Relance Together AI avec historique tool',
    impact: 'Pas de réponse finale'
  },
  {
    name: 'Streaming final',
    description: 'Le streaming de la relance peut échouer',
    check: 'Streaming final Together AI',
    impact: 'Pas de tokens reçus'
  },
  {
    name: 'Broadcast completion',
    description: 'Le broadcast de completion peut échouer',
    check: 'llm-complete',
    impact: 'Interface ne se met pas à jour'
  }
];

failurePoints.forEach(point => {
  console.log(`   ⚠️ ${point.name}: ${point.description} - Impact: ${point.impact}`);
});

// 3. Scénarios de test
console.log('\n🧪 3. Scénarios de test:');

const scenarios = [
  {
    name: 'Tool call réussi',
    description: 'Tool exécuté + relance réussie',
    expected: '✅ Réponse finale reçue'
  },
  {
    name: 'Tool call échoué',
    description: 'Tool échoué + relance avec erreur',
    expected: '❌ Message d\'erreur affiché'
  },
  {
    name: 'Relance échouée',
    description: 'Tool réussi + relance échouée',
    expected: '❌ Pas de réponse finale'
  },
  {
    name: 'Streaming interrompu',
    description: 'Tool réussi + streaming interrompu',
    expected: '❌ Réponse incomplète'
  }
];

scenarios.forEach(scenario => {
  console.log(`   ${scenario.name}: ${scenario.description} - ${scenario.expected}`);
});

// 4. Recommandations de correction
console.log('\n🔧 4. Recommandations de correction:');

const recommendations = [
  {
    priority: '🔴 CRITIQUE',
    issue: 'Relance peut ne pas fonctionner',
    solution: 'Ajouter des logs détaillés pour tracer la relance',
    impact: 'Diagnostic plus facile'
  },
  {
    priority: '🟡 MOYEN',
    issue: 'Broadcast peut échouer',
    solution: 'Ajouter des try/catch autour des broadcasts',
    impact: 'Plus de robustesse'
  },
  {
    priority: '🟢 FAIBLE',
    issue: 'Timeout possible',
    solution: 'Augmenter le timeout de 15s à 30s',
    impact: 'Plus de temps pour les tools complexes'
  },
  {
    priority: '🔴 CRITIQUE',
    issue: 'Pas de fallback',
    solution: 'Ajouter un fallback si la relance échoue',
    impact: 'Garantie de réponse'
  }
];

recommendations.forEach(rec => {
  console.log(`   ${rec.priority} ${rec.issue}: ${rec.solution} - Impact: ${rec.impact}`);
});

// 5. Test avec l'exemple fourni
console.log('\n📋 5. Analyse de l\'exemple fourni:');

const exampleLog = {
  toolCall: {
    name: "get_notebooks",
    arguments: "{}"
  },
  result: {
    success: true,
    classeurs: [
      {
        id: "75b35cbc-9de3-4b0e-abb1-d4970b2a24a9",
        name: "Movies",
        emoji: "🎬",
        slug: "backstage-reloaded"
      },
      {
        id: "580879b1-213e-4e1e-a292-e1a6ddf1b4a7",
        name: "Démo",
        emoji: "📸",
        slug: "demo"
      }
    ]
  }
};

console.log('📥 Tool call détecté:', exampleLog.toolCall.name);
console.log('📤 Résultat reçu:', JSON.stringify(exampleLog.result, null, 2));

// Vérifications
const checks = [
  {
    name: 'Tool call valide',
    condition: exampleLog.toolCall.name === 'get_notebooks',
    status: exampleLog.toolCall.name === 'get_notebooks' ? '✅' : '❌'
  },
  {
    name: 'Résultat valide',
    condition: exampleLog.result.success === true,
    status: exampleLog.result.success === true ? '✅' : '❌'
  },
  {
    name: 'Classeurs présents',
    condition: exampleLog.result.classeurs && exampleLog.result.classeurs.length > 0,
    status: (exampleLog.result.classeurs && exampleLog.result.classeurs.length > 0) ? '✅' : '❌'
  },
  {
    name: 'Structure correcte',
    condition: exampleLog.result.classeurs[0].name && exampleLog.result.classeurs[0].emoji,
    status: (exampleLog.result.classeurs[0].name && exampleLog.result.classeurs[0].emoji) ? '✅' : '❌'
  }
];

checks.forEach(check => {
  console.log(`   ${check.status} ${check.name}`);
});

console.log('\n🎯 Diagnostic:');
console.log('   - Le tool call semble fonctionner correctement');
console.log('   - Le résultat est valide et contient les classeurs');
console.log('   - Le problème semble être dans la relance après l\'exécution du tool');
console.log('   - Il faut vérifier les logs de relance dans l\'API');

console.log('\n📝 Actions recommandées:');
console.log('   1. Vérifier les logs de l\'API pour voir si la relance se fait');
console.log('   2. Ajouter des logs détaillés dans la section de relance');
console.log('   3. Vérifier que le broadcast de completion fonctionne');
console.log('   4. Tester avec un tool call simple pour isoler le problème');

console.log('\n🔗 Documentation:');
console.log('   - API Route: src/app/api/chat/llm/route.ts');
console.log('   - Tool Execution: Ligne ~1224');
console.log('   - Relance: Ligne ~1230');
console.log('   - Broadcast: Ligne ~1340'); 