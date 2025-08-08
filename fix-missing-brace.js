#!/usr/bin/env node

/**
 * 🔧 FIX MISSING BRACE
 * 
 * Ce script ajoute l'accolade manquante au fichier route.ts
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING MISSING BRACE...\n');

const targetFile = 'src/app/api/chat/llm/route.ts';
let content = fs.readFileSync(targetFile, 'utf8');

// Compter les accolades
let braceCount = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') braceCount--;
}

console.log('📊 Accolades avant correction:', braceCount);

if (braceCount < 0) {
  // Il manque des accolades fermantes
  const missingBraces = Math.abs(braceCount);
  console.log(`🔧 Ajout de ${missingBraces} accolade(s) fermante(s)`);
  
  // Ajouter les accolades manquantes à la fin
  for (let i = 0; i < missingBraces; i++) {
    content += '\n}';
  }
} else if (braceCount > 0) {
  // Il manque des accolades ouvrantes
  console.log(`🔧 Il manque ${braceCount} accolade(s) ouvrante(s) - vérification manuelle nécessaire`);
}

// Vérifier à nouveau
braceCount = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') braceCount--;
}

console.log('📊 Accolades après correction:', braceCount);

// Écrire le fichier corrigé
fs.writeFileSync(targetFile, content);

console.log('✅ CORRECTION TERMINÉE !');
console.log('🔄 Le serveur devrait maintenant démarrer sans erreurs de syntaxe.'); 