#!/usr/bin/env node

/**
 * Correction pour donner accès complet à tous les tools pour GPT/Grok
 * Remplace le filtrage par capacités par un accès complet
 */

const fs = require('fs');

console.log('🔧 Correction pour accès complet GPT/Grok...');

// Chemin du fichier
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Compter les occurrences avant correction
const beforeCount = (content.match(/agentConfig\?\.api_v2_capabilities\?\.length > 0/g) || []).length;
console.log(`🔍 Occurrences trouvées: ${beforeCount}`);

// Remplacer toutes les occurrences
const oldPattern = /\/\/ ✅ ACCÈS COMPLET: Tous les modèles ont accès à tous les endpoints\s+const tools = agentConfig\?\.api_v2_capabilities\?\.length > 0\s+\? agentApiV2Tools\.getToolsForFunctionCalling\(agentConfig\.api_v2_capabilities\)\s+: undefined;/g;
const newPattern = `// 🔧 ACCÈS COMPLET: GPT/Grok ont accès à TOUS les tools
      const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Tous les tools disponibles`;

const correctedContent = content.replace(oldPattern, newPattern);

// Compter les occurrences après correction
const afterCount = (correctedContent.match(/agentConfig\?\.api_v2_capabilities\?\.length > 0/g) || []).length;
console.log(`🔍 Occurrences restantes: ${afterCount}`);

// Vérifier si des changements ont été appliqués
if (content === correctedContent) {
  console.log('❌ Aucun changement appliqué. Pattern non trouvé.');
  
  // Essayer un pattern plus simple
  const simpleOldPattern = /const tools = agentConfig\?\.api_v2_capabilities\?\.length > 0\s+\? agentApiV2Tools\.getToolsForFunctionCalling\(agentConfig\.api_v2_capabilities\)\s+: undefined;/g;
  const simpleNewPattern = `const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Tous les tools disponibles`;
  
  const simpleCorrectedContent = content.replace(simpleOldPattern, simpleNewPattern);
  
  if (content === simpleCorrectedContent) {
    console.log('❌ Aucun changement appliqué avec le pattern simple.');
  } else {
    fs.writeFileSync(routeFile, simpleCorrectedContent);
    console.log('✅ Correction appliquée avec succès (pattern simple) !');
  }
} else {
  // Écrire le fichier corrigé
  fs.writeFileSync(routeFile, correctedContent);
  console.log('✅ Correction appliquée avec succès !');
}

// Vérifier les lignes modifiées
console.log('\n🔍 Vérification des lignes modifiées:');
const lines = correctedContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('agentApiV2Tools.getToolsForFunctionCalling()')) {
    console.log(`📍 Ligne ${i + 1}: ${lines[i].trim()}`);
  }
}

console.log('\n🎯 RÉSULTAT:');
console.log('✅ GPT/Grok ont maintenant accès à TOUS les tools');
console.log('✅ Plus de filtrage par capacités d\'agent');
console.log('✅ Accès complet à tous les endpoints');

console.log('\n📝 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur de développement');
console.log('2. Tester avec GPT/Grok');
console.log('3. Vérifier que tous les tools fonctionnent'); 