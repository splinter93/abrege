#!/usr/bin/env node

/**
 * 🔧 FIX MISSING NAME IN TOOL MESSAGES
 * 
 * Ce script corrige les créations de messages tool qui n'incluent pas
 * le champ 'name' dans l'objet.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING MISSING NAME IN TOOL MESSAGES...\n');

const targetFile = 'src/app/api/chat/llm/route.ts';
let content = fs.readFileSync(targetFile, 'utf8');

// Patterns à corriger
const fixes = [
  {
    name: 'toolResultMessage sans name dans l\'objet',
    pattern: /const toolResultMessage = \{[\s\S]*?role: 'tool' as const,[\s\S]*?tool_call_id: toolCallId,[\s\S]*?\/\/ 🔧 SÉCURITÉ: même ID[\s\S]*?name: functionCallData\.name \|\| 'unknown_tool',[\s\S]*?\/\/ 🔧 SÉCURITÉ: même nom \(fallback\)[\s\S]*?content: toolContent[\s\S]*?\};/g,
    replacement: (match) => {
      // Vérifier si le name est déjà dans l'objet
      if (match.includes('name: functionCallData.name')) {
        return match; // Déjà corrigé
      }
      
      // Ajouter le name dans l'objet
      return match.replace(
        /content: toolContent[\s\S]*?\};/,
        `content: toolContent, // 🔧 SÉCURITÉ: JSON string\n            name: functionCallData.name || 'unknown_tool' // 🔧 SÉCURITÉ: même nom (fallback)\n          };`
      );
    }
  },
  {
    name: 'toolResultMessage sans name dans l\'objet (autre pattern)',
    pattern: /const toolResultMessage = \{[\s\S]*?role: 'tool' as const,[\s\S]*?tool_call_id: toolCallId,[\s\S]*?\/\/ 🔧 SÉCURITÉ: même ID[\s\S]*?content: toolContent[\s\S]*?\};/g,
    replacement: (match) => {
      // Vérifier si le name est déjà dans l'objet
      if (match.includes('name: functionCallData.name')) {
        return match; // Déjà corrigé
      }
      
      // Ajouter le name dans l'objet
      return match.replace(
        /content: toolContent[\s\S]*?\};/,
        `content: toolContent, // 🔧 SÉCURITÉ: JSON string\n            name: functionCallData.name || 'unknown_tool' // 🔧 SÉCURITÉ: même nom (fallback)\n          };`
      );
    }
  }
];

let totalFixes = 0;

fixes.forEach((fix, index) => {
  console.log(`${index + 1}. 🔧 Correction: ${fix.name}`);
  
  const matches = content.match(fix.pattern);
  if (matches) {
    console.log(`   ✅ Trouvé ${matches.length} occurrences à corriger`);
    
    matches.forEach((match, matchIndex) => {
      const hasNameInObject = match.includes('name: functionCallData.name') && 
                             !match.includes('name: functionCallData.name || \'unknown_tool\', // 🔧 SÉCURITÉ: même nom (fallback)');
      
      if (!hasNameInObject) {
        const newMatch = fix.replacement(match);
        content = content.replace(match, newMatch);
        totalFixes++;
        console.log(`   ✅ Correction ${matchIndex + 1} appliquée`);
      } else {
        console.log(`   ℹ️  Occurrence ${matchIndex + 1} déjà corrigée`);
      }
    });
  } else {
    console.log(`   ❌ Aucune occurrence trouvée`);
  }
  console.log('');
});

// Vérifier s'il y a encore des problèmes
const remainingProblems = content.match(/role:\s*['"]tool['"][^}]*}(?![^}]*name:)/g);
if (remainingProblems) {
  console.log('⚠️  PROBLÈMES RESTANTS DÉTECTÉS:');
  remainingProblems.forEach((problem, index) => {
    console.log(`   ${index + 1}. ${problem.replace(/\s+/g, ' ').substring(0, 80)}...`);
  });
} else {
  console.log('✅ Aucun problème restant détecté');
}

// Écrire le fichier corrigé
fs.writeFileSync(targetFile, content);

console.log('📊 RÉSUMÉ:');
console.log(`   Corrections appliquées: ${totalFixes}`);
console.log(`   Problèmes restants: ${remainingProblems ? remainingProblems.length : 0}`);

if (totalFixes > 0) {
  console.log('\n✅ CORRECTIONS APPLIQUÉES AVEC SUCCÈS !');
  console.log('🔄 Redémarrez le serveur et testez.');
} else {
  console.log('\nℹ️  Aucune correction nécessaire.');
}

console.log('\n🏁 CORRECTION TERMINÉE'); 