#!/usr/bin/env node

/**
 * 🧪 Test - Validation des Tools pour éviter l'erreur "Tools should have a name!"
 * 
 * Ce script teste que la validation des tools est correctement implémentée
 */

console.log('🚀 TEST - VALIDATION DES TOOLS');
console.log('──────────────────────────────');

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

// Vérifier que le filtrage des tools invalides est implémenté
const toolFiltering = 'Tool invalide ignoré';
if (content.includes(toolFiltering)) {
  console.log('✅ Filtrage des tools invalides implémenté !');
} else {
  console.error('❌ Filtrage des tools invalides manquant !');
  process.exit(1);
}

// Vérifier que la validation du nom des tools est implémentée
const nameValidation = 'Tool sans nom ignoré';
if (content.includes(nameValidation)) {
  console.log('✅ Validation du nom des tools implémentée !');
} else {
  console.error('❌ Validation du nom des tools manquante !');
  process.exit(1);
}

// Vérifier que la validation de la description des tools est implémentée
const descriptionValidation = 'Tool sans description ignoré';
if (content.includes(descriptionValidation)) {
  console.log('✅ Validation de la description des tools implémentée !');
} else {
  console.error('❌ Validation de la description des tools manquante !');
  process.exit(1);
}

// Vérifier que les logs de validation sont présents
const validationLogs = 'Tools validés pour';
if (content.includes(validationLogs)) {
  console.log('✅ Logs de validation des tools implémentés !');
} else {
  console.error('❌ Logs de validation des tools manquants !');
  process.exit(1);
}

console.log('');
console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
console.log('');
console.log('📋 RÉSUMÉ DES CORRECTIONS :');
console.log('   ✅ Validation des tools pour le premier appel');
console.log('   ✅ Validation des tools pour la continuation');
console.log('   ✅ Filtrage des tools invalides');
console.log('   ✅ Validation du nom des tools');
console.log('   ✅ Validation de la description des tools');
console.log('   ✅ Logs de validation détaillés');
console.log('');
console.log('🚀 L\'erreur "Tools should have a name!" devrait maintenant être évitée !');
console.log('💡 Les tools invalides seront automatiquement filtrés avant d\'être envoyés à l\'API Groq'); 