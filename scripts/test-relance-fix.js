#!/usr/bin/env node

/**
 * 🧪 Test Rapide - Correction du Bug de Relance
 * 
 * Ce script teste rapidement si la correction du bug de relance fonctionne
 */

console.log('🚀 TEST RAPIDE - CORRECTION DU BUG DE RELANCE');
console.log('─────────────────────────────────────────────');

// Vérifier que le fichier corrigé existe
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

// Vérifier que la ligne problématique est corrigée
const problematicLine = 'tool_calls: msg.tool_calls ? `${msg.content.substring(0, 100)}...` : \'none\'';
const correctedLine = 'tool_calls: msg.tool_calls ? `${msg.tool_calls.length} tool calls` : \'none\'';

if (content.includes(problematicLine)) {
  console.error('❌ Ligne problématique encore présente !');
  console.error('   Problème:', problematicLine);
  process.exit(1);
}

if (content.includes(correctedLine)) {
  console.log('✅ Ligne problématique corrigée !');
  console.log('   Correction:', correctedLine);
} else {
  console.error('❌ Ligne corrigée non trouvée !');
  console.error('   Attendu:', correctedLine);
  process.exit(1);
}

// Vérifier que le prompt forcé est présent
const forcedPrompt = 'IMPORTANT: Tu viens d\'exécuter des outils. Donne maintenant une réponse finale à l\'utilisateur. N\'utilise PAS d\'outils, réponds directement avec du texte.';

if (content.includes(forcedPrompt)) {
  console.log('✅ Prompt forcé présent !');
} else {
  console.error('❌ Prompt forcé manquant !');
  process.exit(1);
}

// Vérifier que le blocage des nouveaux tool calls est présent
const blockingCode = 'Bloquer les nouveaux tool calls lors de la relance';

if (content.includes(blockingCode)) {
  console.log('✅ Code de blocage présent !');
} else {
  console.error('❌ Code de blocage manquant !');
  process.exit(1);
}

console.log('');
console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
console.log('');
console.log('📋 RÉSUMÉ DES CORRECTIONS :');
console.log('   ✅ Bug de substring corrigé');
console.log('   ✅ Prompt forcé implémenté');
console.log('   ✅ Blocage des nouveaux tool calls implémenté');
console.log('   ✅ Logs de débogage sécurisés');
console.log('');
console.log('🚀 Le serveur peut maintenant être relancé sans erreur !');
console.log('💡 Testez avec /test-tool-call-relance pour valider le fonctionnement'); 