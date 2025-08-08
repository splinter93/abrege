#!/usr/bin/env node

/**
 * Correction de tous les endroits où des messages tool sont créés sans name
 * S'assure que le name est toujours présent
 */

const fs = require('fs');

console.log('🔧 Correction de tous les messages tool sans name...');

// Chemin du fichier
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Patterns à corriger
const corrections = [
  {
    name: 'Message tool sans name (ligne ~963)',
    oldPattern: /role: 'tool',\s+tool_call_id: toolCallId,\s+content: JSON\.stringify\(\{[\s\S]*?error: true,[\s\S]*?message: `❌ ÉCHEC : \${errorMessage}`,[\s\S]*?success: false,[\s\S]*?action: 'failed'[\s\S]*?\}\)\)/g,
    newPattern: `role: 'tool',
                tool_call_id: toolCallId,
                name: functionCallData.name || 'unknown_tool', // 🔧 CORRECTION: Ajouter le name
                content: JSON.stringify({
                  error: true,
                  message: \`❌ ÉCHEC : \${errorMessage}\`,
                  success: false,
                  action: 'failed'
                })`
  },
  {
    name: 'Message tool sans name (ligne ~1199)',
    oldPattern: /role: 'tool',\s+tool_call_id: toolCallId,\s+content: typeof result === 'string' \? result : JSON\.stringify\(result\)/g,
    newPattern: `role: 'tool',
                tool_call_id: toolCallId,
                name: functionCallData.name || 'unknown_tool', // 🔧 CORRECTION: Ajouter le name
                content: typeof result === 'string' ? result : JSON.stringify(result)`
  },
  {
    name: 'Message tool sans name (ligne ~1940)',
    oldPattern: /role: 'tool',\s+tool_call_id: toolCallId,\s+content: JSON\.stringify\(\{[\s\S]*?error: true,[\s\S]*?message: `❌ ÉCHEC : \${errorMessage}`,[\s\S]*?success: false,[\s\S]*?action: 'failed'[\s\S]*?\}\)\)/g,
    newPattern: `role: 'tool',
                tool_call_id: toolCallId,
                name: functionCallData.name || 'unknown_tool', // 🔧 CORRECTION: Ajouter le name
                content: JSON.stringify({
                  error: true,
                  message: \`❌ ÉCHEC : \${errorMessage}\`,
                  success: false,
                  action: 'failed'
                })`
  }
];

let totalCorrections = 0;

corrections.forEach((correction, index) => {
  console.log(`\n🔧 Correction ${index + 1}: ${correction.name}`);
  
  const matches = content.match(correction.oldPattern);
  if (matches) {
    console.log(`📍 ${matches.length} occurrence(s) trouvée(s)`);
    
    const correctedContent = content.replace(correction.oldPattern, correction.newPattern);
    
    if (content !== correctedContent) {
      content = correctedContent;
      totalCorrections += matches.length;
      console.log(`✅ Correction appliquée`);
    } else {
      console.log(`❌ Aucun changement appliqué`);
    }
  } else {
    console.log(`📍 Aucune occurrence trouvée`);
  }
});

// Écrire le fichier corrigé
if (totalCorrections > 0) {
  fs.writeFileSync(routeFile, content);
  console.log(`\n✅ ${totalCorrections} correction(s) appliquée(s) !`);
} else {
  console.log(`\n✅ Aucune correction nécessaire`);
}

// Vérification finale
console.log('\n🔍 Vérification finale:');

// Chercher les endroits où des messages tool sont créés
const toolCreationPatterns = [
  /role: 'tool'[^}]*}/g,
  /tool_call_id:[^}]*}/g
];

let remainingIssues = 0;
toolCreationPatterns.forEach((pattern, index) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`📍 Pattern ${index + 1}: ${matches.length} occurrence(s)`);
    matches.forEach((match, i) => {
      if (match.includes('tool_call_id') && !match.includes('name')) {
        console.log(`❌ Match ${i + 1} sans name: ${match.substring(0, 100)}...`);
        remainingIssues++;
      }
    });
  }
});

if (remainingIssues === 0) {
  console.log('✅ Tous les messages tool ont maintenant un name');
} else {
  console.log(`❌ ${remainingIssues} problème(s) restant(s)`);
}

// Vérifier les ajouts explicites du name
console.log('\n🔍 Vérification des ajouts explicites du name:');

const nameAdditions = [
  'name: functionCallData.name',
  'name: functionCallData.name || \'unknown_tool\'',
  'mappedMsg.name = msg.name'
];

nameAdditions.forEach(addition => {
  const count = (content.match(new RegExp(addition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`📍 "${addition}": ${count} occurrence(s)`);
});

console.log('\n🎯 RÉSULTAT:');
if (totalCorrections > 0) {
  console.log(`✅ ${totalCorrections} correction(s) appliquée(s)`);
  console.log('✅ Tous les messages tool devraient maintenant avoir un name');
} else {
  console.log('✅ Aucune correction nécessaire');
}

console.log('\n📝 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur');
console.log('2. Tester avec des tool calls');
console.log('3. Vérifier que le name est présent dans tous les messages tool'); 