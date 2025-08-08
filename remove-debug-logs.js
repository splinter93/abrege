#!/usr/bin/env node

/**
 * 🧹 REMOVE DEBUG LOGS
 * 
 * Ce script supprime tous les logs de debug qui causent des erreurs de linter
 * maintenant que le problème du name est résolu.
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 REMOVING DEBUG LOGS...\n');

const targetFile = 'src/app/api/chat/llm/route.ts';
let content = fs.readFileSync(targetFile, 'utf8');

// Patterns à supprimer
const patterns = [
  {
    name: 'Debug transmission message tool',
    pattern: /\/\/ 🔍 DEBUG: Tracer la transmission du name[\s\S]*?willIncludeName: !!(msg as any)\.name[\s\S]*?\}\);[\s\S]*?}/g,
    replacement: ''
  },
  {
    name: 'Debug message tool trouvé',
    pattern: /\/\/ 🔍 DEBUG: Tracer le name dans les messages tool[\s\S]*?return messagesWithName;/g,
    replacement: 'return limitedHistory;'
  },
  {
    name: 'Debug statistiques messages tool',
    pattern: /logger\.dev\('\[LLM API\] 📊 Statistiques messages tool:',[\s\S]*?toolMessagesWithName: limitedHistory\.filter\(m => m\.role === 'tool' && m\.name\)\.length[\s\S]*?\}\);[\s\S]*?}/g,
    replacement: ''
  },
  {
    name: 'Debug création message tool',
    pattern: /\/\/ 🔍 DEBUG: Tracer la création du message tool[\s\S]*?hasName: !!toolResultMessage\.name[\s\S]*?\}\);[\s\S]*?}/g,
    replacement: ''
  },
  {
    name: 'Debug sauvegarde message tool',
    pattern: /\/\/ 🔍 DEBUG: Tracer la sauvegarde du message tool[\s\S]*?willSaveName: !!functionCallData\.name[\s\S]*?\}\);[\s\S]*?}/g,
    replacement: ''
  }
];

let totalRemoved = 0;

patterns.forEach((pattern, index) => {
  console.log(`${index + 1}. 🧹 Suppression: ${pattern.name}`);
  
  const matches = content.match(pattern.pattern);
  if (matches) {
    console.log(`   ✅ Trouvé ${matches.length} occurrences à supprimer`);
    content = content.replace(pattern.pattern, pattern.replacement);
    totalRemoved += matches.length;
  } else {
    console.log(`   ❌ Aucune occurrence trouvée`);
  }
  console.log('');
});

// Nettoyer les lignes vides multiples
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// Écrire le fichier nettoyé
fs.writeFileSync(targetFile, content);

console.log('📊 RÉSUMÉ:');
console.log(`   Logs supprimés: ${totalRemoved}`);
console.log('\n✅ NETTOYAGE TERMINÉ !');
console.log('🔄 Le serveur devrait maintenant démarrer sans erreurs de linter.'); 