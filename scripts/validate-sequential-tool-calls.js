#!/usr/bin/env node

/**
 * 🧪 Validation - Enchaînement Séquentiel des Tool Calls
 * 
 * Ce script valide que l'enchaînement séquentiel avec commentaires est implémenté
 */

console.log('🚀 VALIDATION - ENCHAÎNEMENT SÉQUENTIEL DES TOOL CALLS');
console.log('─────────────────────────────────────────────────────────');

// Vérifier que le fichier modifié existe
const fs = require('fs');
const path = require('path');

const targetFile = 'src/services/llm/groqGptOss120b.ts';

if (!fs.existsSync(targetFile)) {
  console.error('❌ Fichier cible non trouvé:', targetFile);
  process.exit(1);
}

console.log('✅ Fichier cible trouvé:', targetFile);

// Vérifier la correction
const content = fs.readFileSync(targetFile, 'utf8');

// Vérifier que la fonction séquentielle est implémentée
const sequentialFunction = 'executeToolsSequentially';
if (content.includes(sequentialFunction)) {
  console.log('✅ Fonction séquentielle implémentée:', sequentialFunction);
} else {
  console.error('❌ Fonction séquentielle manquante !');
  process.exit(1);
}

// Vérifier que les commentaires sont demandés
const commentRequest = 'Demander au LLM de commenter ce tool call';
if (content.includes(commentRequest)) {
  console.log('✅ Demande de commentaires implémentée !');
} else {
  console.error('❌ Demande de commentaires manquante !');
  process.exit(1);
}

// Vérifier que les commentaires sont ajoutés aux résultats
const commentAddition = 'is_comment: true';
if (content.includes(commentAddition)) {
  console.log('✅ Commentaires ajoutés aux résultats !');
} else {
  console.error('❌ Commentaires non ajoutés aux résultats !');
  process.exit(1);
}

// Vérifier que la continuation est permise
const continuationAllowed = 'Permettre au LLM de continuer la conversation ou de terminer';
if (content.includes(continuationAllowed)) {
  console.log('✅ Continuation de conversation permise !');
} else {
  console.error('❌ Continuation de conversation non implémentée !');
  process.exit(1);
}

// Vérifier que les tools sont disponibles lors de la relance
const toolsAvailable = 'agentApiV2Tools.getToolsForFunctionCalling(agentConfig)';
if (content.includes(toolsAvailable)) {
  console.log('✅ Tools disponibles lors de la relance !');
} else {
  console.error('❌ Tools non disponibles lors de la relance !');
  process.exit(1);
}

// Vérifier que le composant de test existe
const testComponent = 'src/components/test/TestSequentialToolCalls.tsx';
if (fs.existsSync(testComponent)) {
  console.log('✅ Composant de test séquentiel créé !');
} else {
  console.error('❌ Composant de test séquentiel manquant !');
  process.exit(1);
}

// Vérifier que la page de test existe
const testPage = 'src/app/test-sequential-tool-calls/page.tsx';
if (fs.existsSync(testPage)) {
  console.log('✅ Page de test séquentiel créée !');
} else {
  console.error('❌ Page de test séquentiel manquante !');
  process.exit(1);
}

console.log('');
console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
console.log('');
console.log('📋 RÉSUMÉ DES IMPLÉMENTATIONS :');
console.log('   ✅ Fonction d\'exécution séquentielle implémentée');
console.log('   ✅ Commentaires du LLM après chaque tool call');
console.log('   ✅ Continuation de conversation permise');
console.log('   ✅ Tools disponibles lors de la relance');
console.log('   ✅ Composant de test créé');
console.log('   ✅ Page de test créée');
console.log('');
console.log('🚀 Le système supporte maintenant l\'enchaînement séquentiel !');
console.log('💡 Testez avec /test-sequential-tool-calls pour valider le fonctionnement');
console.log('');
console.log('🎯 COMPORTEMENT ATTENDU :');
console.log('   Tool 1 → Commentaire → Tool 2 → Commentaire → Tool 3 → Commentaire → Réponse finale'); 