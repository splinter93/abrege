#!/usr/bin/env node

/**
 * Script de test pour vérifier les effets glassmorphism
 * Vérifie que les variables CSS sont bien définies et accessibles
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Test des effets glassmorphism...\n');

// Lire le fichier variables-unified.css
const variablesPath = path.join(__dirname, '..', 'src', 'styles', 'variables-unified.css');
const variablesContent = fs.readFileSync(variablesPath, 'utf8');

// Variables glassmorphism attendues
const expectedVariables = [
  '--glass-bg-base',
  '--glass-bg-subtle', 
  '--glass-bg-soft',
  '--glass-bg-medium',
  '--glass-bg-strong',
  '--glass-border-subtle',
  '--glass-border-soft',
  '--glass-border-medium',
  '--glass-border-strong',
  '--glass-border-focus',
  '--glass-blur-light',
  '--glass-blur-medium',
  '--glass-blur-strong',
  '--glass-blur-heavy',
  '--glass-shadow-subtle',
  '--glass-shadow-soft',
  '--glass-shadow-medium',
  '--glass-shadow-strong',
  '--glass-gradient-subtle',
  '--glass-gradient-soft',
  '--glass-gradient-medium'
];

console.log('✅ Variables glassmorphism définies :');
let allFound = true;

expectedVariables.forEach(variable => {
  if (variablesContent.includes(variable)) {
    console.log(`  ✓ ${variable}`);
  } else {
    console.log(`  ❌ ${variable} - MANQUANTE`);
    allFound = false;
  }
});

console.log('\n🔍 Vérification des classes glassmorphism...');

// Lire le fichier glassmorphism-system.css
const glassPath = path.join(__dirname, '..', 'src', 'styles', 'glassmorphism-system.css');
const glassContent = fs.readFileSync(glassPath, 'utf8');

const expectedClasses = [
  '.glass',
  '.glass-subtle',
  '.glass-soft',
  '.glass-medium',
  '.glass-strong',
  '.btn-glass',
  '.input-glass',
  '.card-glass'
];

expectedClasses.forEach(className => {
  if (glassContent.includes(className)) {
    console.log(`  ✓ ${className}`);
  } else {
    console.log(`  ❌ ${className} - MANQUANTE`);
    allFound = false;
  }
});

console.log('\n🔍 Vérification de l\'utilisation dans les composants chat...');

// Lire les fichiers CSS du chat
const chatFiles = [
  'src/components/chat/ChatLayout.css',
  'src/components/chat/ChatWidget.css',
  'src/components/chat/ChatInput.css',
  'src/components/chat/ChatMessage.css'
];

let glassUsageFound = false;

chatFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const glassVars = content.match(/var\(--glass-[^)]+\)/g);
    if (glassVars && glassVars.length > 0) {
      console.log(`  ✓ ${filePath} utilise ${glassVars.length} variables glass`);
      glassUsageFound = true;
    }
  }
});

console.log('\n📊 RÉSULTATS :');
console.log(`Variables définies : ${allFound ? '✅ TOUTES' : '❌ MANQUANTES'}`);
console.log(`Classes définies : ${expectedClasses.every(c => glassContent.includes(c)) ? '✅ TOUTES' : '❌ MANQUANTES'}`);
console.log(`Utilisation dans chat : ${glassUsageFound ? '✅ DÉTECTÉE' : '❌ NON DÉTECTÉE'}`);

if (allFound && glassUsageFound) {
  console.log('\n🎉 Tous les effets glassmorphism sont correctement configurés !');
  console.log('Le chat devrait maintenant afficher des effets glass au lieu d\'un fond noir.');
} else {
  console.log('\n⚠️  Des problèmes ont été détectés. Vérifiez la configuration.');
}

console.log('\n💡 Pour tester visuellement :');
console.log('1. Ouvrez le chat dans votre navigateur');
console.log('2. Vérifiez que le fond n\'est plus complètement noir');
console.log('3. Les éléments devraient avoir un effet de transparence/flou');


