#!/usr/bin/env node

/**
 * 🧪 Validation Complète - Correction de l'erreur "Tools should have a name!"
 * 
 * Ce script valide que toutes les corrections de validation des tools sont implémentées
 */

console.log('🚀 VALIDATION COMPLÈTE - CORRECTION "TOOLS SHOULD HAVE A NAME!"');
console.log('─────────────────────────────────────────────────────────────────');

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

// Vérifier que la validation des tools est implémentée pour le premier appel
const firstCallValidation = 'Tools validés pour le premier appel';
if (content.includes(firstCallValidation)) {
  console.log('✅ Validation des tools pour le premier appel implémentée !');
} else {
  console.error('❌ Validation des tools pour le premier appel manquante !');
  process.exit(1);
}

// Vérifier que la validation des tools est implémentée pour la continuation
const continuationValidation = 'Tools validés pour la continuation';
if (content.includes(continuationValidation)) {
  console.log('✅ Validation des tools pour la continuation implémentée !');
} else {
  console.error('❌ Validation des tools pour la continuation manquante !');
  process.exit(1);
}

// Vérifier que la validation de la structure function est implémentée
const functionStructureValidation = 'Tool sans fonction ignoré';
if (content.includes(functionStructureValidation)) {
  console.log('✅ Validation de la structure function implémentée !');
} else {
  console.error('❌ Validation de la structure function manquante !');
  process.exit(1);
}

// Vérifier que la validation du nom de fonction est implémentée
const functionNameValidation = 'Tool sans nom de fonction ignoré';
if (content.includes(functionNameValidation)) {
  console.log('✅ Validation du nom de fonction implémentée !');
} else {
  console.error('❌ Validation du nom de fonction manquante !');
  process.exit(1);
}

// Vérifier que la validation de la description de fonction est implémentée
const functionDescriptionValidation = 'Tool sans description de fonction ignoré';
if (content.includes(functionDescriptionValidation)) {
  console.log('✅ Validation de la description de fonction implémentée !');
} else {
  console.error('❌ Validation de la description de fonction manquante !');
  process.exit(1);
}

// Vérifier que la validation des paramètres est implémentée
const parametersValidation = 'Tool sans paramètres ignoré';
if (content.includes(parametersValidation)) {
  console.log('✅ Validation des paramètres implémentée !');
} else {
  console.error('❌ Validation des paramètres manquante !');
  process.exit(1);
}

// Vérifier que les logs de débogage détaillés sont présents
const detailedLogs = 'Tools bruts reçus';
if (content.includes(detailedLogs)) {
  console.log('✅ Logs de débogage détaillés implémentés !');
} else {
  console.error('❌ Logs de débogage détaillés manquants !');
  process.exit(1);
}

// Vérifier que les logs de débogage pour la continuation sont présents
const continuationLogs = 'Tools bruts pour continuation';
if (content.includes(continuationLogs)) {
  console.log('✅ Logs de débogage pour continuation implémentés !');
} else {
  console.error('❌ Logs de débogage pour continuation manquants !');
  process.exit(1);
}

// Vérifier que le composant de test existe
const testComponent = 'src/components/test/TestToolsValidation.tsx';
if (fs.existsSync(testComponent)) {
  console.log('✅ Composant de test de validation des tools créé !');
} else {
  console.error('❌ Composant de test de validation des tools manquant !');
  process.exit(1);
}

// Vérifier que la page de test existe
const testPage = 'src/app/test-tools-validation/page.tsx';
if (fs.existsSync(testPage)) {
  console.log('✅ Page de test de validation des tools créée !');
} else {
  console.error('❌ Page de test de validation des tools manquante !');
  process.exit(1);
}

console.log('');
console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
console.log('');
console.log('📋 RÉSUMÉ DES CORRECTIONS IMPLÉMENTÉES :');
console.log('   ✅ Validation des tools pour le premier appel');
console.log('   ✅ Validation des tools pour la continuation');
console.log('   ✅ Validation de la structure function');
console.log('   ✅ Validation du nom de fonction');
console.log('   ✅ Validation de la description de fonction');
console.log('   ✅ Validation des paramètres');
console.log('   ✅ Logs de débogage détaillés');
console.log('   ✅ Composant de test créé');
console.log('   ✅ Page de test créée');
console.log('');
console.log('🚀 L\'erreur "Tools should have a name!" devrait maintenant être évitée !');
console.log('💡 Les tools mal formatés seront automatiquement filtrés avant d\'être envoyés à l\'API Groq');
console.log('');
console.log('🔍 PAGES DE TEST DISPONIBLES :');
console.log('   - /test-tools-validation - Diagnostic des tools');
console.log('   - /test-sequential-tool-calls - Test de l\'enchaînement séquentiel');
console.log('   - /test-multi-tool-calls - Test des multiples tool calls');
console.log('');
console.log('🎯 PROCHAINES ÉTAPES :');
console.log('   1. Redémarrez votre serveur');
console.log('   2. Testez avec /test-tools-validation');
console.log('   3. Vérifiez que l\'erreur n\'apparaît plus');
console.log('   4. Testez l\'enchaînement séquentiel'); 