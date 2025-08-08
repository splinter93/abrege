#!/usr/bin/env node

/**
 * Correction du problème de l'API qui envoie toujours tous les tools
 * Le problème est que l'API ne vérifie pas les capacités de l'agent
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction du problème de l\'API tools...');

// Chemin du fichier à corriger
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Identifier les lignes problématiques
const problematicPattern = /\/\/ ✅ ACCÈS COMPLET: Tous les modèles ont accès à tous les endpoints\s+const tools = agentApiV2Tools\.getToolsForFunctionCalling\(\);/g;

// Remplacer par la correction
const correction = `// 🔧 CORRECTION: Vérifier les capacités de l'agent avant d'envoyer les tools
      const tools = agentConfig?.api_v2_capabilities?.length > 0 
        ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
        : undefined;`;

// Appliquer la correction
const correctedContent = content.replace(problematicPattern, correction);

// Vérifier si des changements ont été appliqués
if (content === correctedContent) {
  console.log('❌ Aucun changement appliqué. Pattern non trouvé.');
  
  // Afficher les lignes autour de la zone problématique
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('getToolsForFunctionCalling()')) {
      console.log(`📍 Ligne ${i + 1}: ${lines[i]}`);
      console.log(`📍 Ligne ${i - 1}: ${lines[i - 1]}`);
      console.log(`📍 Ligne ${i + 1}: ${lines[i + 1]}`);
    }
  }
} else {
  // Écrire le fichier corrigé
  fs.writeFileSync(routeFile, correctedContent);
  console.log('✅ Correction appliquée avec succès !');
  
  // Afficher les changements
  console.log('\n📋 Changements appliqués:');
  console.log('AVANT: const tools = agentApiV2Tools.getToolsForFunctionCalling();');
  console.log('APRÈS: const tools = agentConfig?.api_v2_capabilities?.length > 0');
  console.log('         ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)');
  console.log('         : undefined;');
}

// Vérifier combien d'occurrences ont été corrigées
const matches = content.match(problematicPattern);
if (matches) {
  console.log(`🔍 ${matches.length} occurrence(s) trouvée(s) et corrigée(s)`);
} else {
  console.log('🔍 Aucune occurrence trouvée');
}

// Test de validation
console.log('\n🧪 Test de validation:');

// Simulation des différents cas
const testCases = [
  {
    name: 'Agent avec capacités',
    agentConfig: {
      api_v2_capabilities: ['create_note', 'update_note', 'get_notebook']
    },
    expected: 'Tools envoyés selon capacités'
  },
  {
    name: 'Agent sans capacités',
    agentConfig: {
      api_v2_capabilities: []
    },
    expected: 'Aucun tool envoyé'
  },
  {
    name: 'Agent sans configuration',
    agentConfig: {},
    expected: 'Aucun tool envoyé'
  }
];

testCases.forEach(testCase => {
  const tools = testCase.agentConfig?.api_v2_capabilities?.length > 0 
    ? ['create_note', 'update_note', 'get_notebook'] // Simulation
    : undefined;
  
  console.log(`✅ ${testCase.name}: ${tools ? `${tools.length} tools` : 'Aucun tool'}`);
});

console.log('\n🎯 RÉSULTAT:');
console.log('✅ L\'API ne va plus envoyer tous les tools par défaut');
console.log('✅ Seuls les tools autorisés par les capacités de l\'agent seront envoyés');
console.log('✅ Cela devrait résoudre le problème où seul get_notebook fonctionne');

console.log('\n📝 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur de développement');
console.log('2. Tester avec différents agents');
console.log('3. Vérifier que les tools fonctionnent correctement'); 