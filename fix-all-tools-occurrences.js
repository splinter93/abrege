#!/usr/bin/env node

/**
 * Correction automatique de toutes les occurrences du problème de tools
 * Remplace toutes les occurrences de getToolsForFunctionCalling() sans paramètres
 */

const fs = require('fs');

console.log('🔧 Correction automatique de toutes les occurrences...');

// Chemin du fichier
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Compter les occurrences avant correction
const beforeCount = (content.match(/getToolsForFunctionCalling\(\)/g) || []).length;
console.log(`🔍 Occurrences trouvées: ${beforeCount}`);

// Remplacer toutes les occurrences
const oldPattern = /const tools = agentApiV2Tools\.getToolsForFunctionCalling\(\);/g;
const newPattern = `const tools = agentConfig?.api_v2_capabilities?.length > 0 
        ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
        : undefined;`;

const correctedContent = content.replace(oldPattern, newPattern);

// Compter les occurrences après correction
const afterCount = (correctedContent.match(/getToolsForFunctionCalling\(\)/g) || []).length;
console.log(`🔍 Occurrences restantes: ${afterCount}`);

// Vérifier si des changements ont été appliqués
if (content === correctedContent) {
  console.log('❌ Aucun changement appliqué.');
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

// Vérifier les lignes modifiées
console.log('\n🔍 Vérification des lignes modifiées:');
const lines = correctedContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('agentConfig?.api_v2_capabilities?.length > 0')) {
    console.log(`📍 Ligne ${i + 1}: ${lines[i].trim()}`);
    console.log(`📍 Ligne ${i + 2}: ${lines[i + 1].trim()}`);
    console.log(`📍 Ligne ${i + 3}: ${lines[i + 2].trim()}`);
  }
}

console.log('\n🎯 RÉSULTAT:');
console.log(`✅ ${beforeCount - afterCount} occurrence(s) corrigée(s)`);
console.log('✅ L\'API va maintenant vérifier les capacités de l\'agent');
console.log('✅ Seuls les tools autorisés seront envoyés au LLM');

console.log('\n📝 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur de développement');
console.log('2. Tester avec différents agents');
console.log('3. Vérifier que tous les tools fonctionnent correctement'); 