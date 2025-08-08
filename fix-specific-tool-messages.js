#!/usr/bin/env node

/**
 * Correction spécifique des endroits où tool_call_id est défini sans name
 */

const fs = require('fs');

console.log('🔧 Correction spécifique des messages tool sans name...');

// Chemin du fichier
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Chercher spécifiquement les endroits problématiques
const lines = content.split('\n');
const problematicLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('tool_call_id:') && !line.includes('name:')) {
    // Vérifier si c'est dans un contexte de création de message tool
    const context = lines.slice(Math.max(0, i-5), i+5).join('\n');
    if (context.includes('role:') && context.includes('tool')) {
      problematicLines.push({
        lineNumber: i + 1,
        line: line.trim(),
        context: context
      });
    }
  }
}

console.log(`🔍 ${problematicLines.length} ligne(s) problématique(s) trouvée(s):`);

problematicLines.forEach((problem, index) => {
  console.log(`\n📍 Problème ${index + 1} (ligne ${problem.lineNumber}):`);
  console.log(`   ${problem.line}`);
  console.log(`   Contexte:`);
  console.log(problem.context);
});

// Chercher les endroits où des messages tool sont créés sans name
const toolMessagePatterns = [
  {
    name: 'Message tool avec tool_call_id mais sans name',
    pattern: /role: 'tool',\s+tool_call_id: [^,}]+,\s+content: [^}]+/g,
    replacement: (match) => {
      // Ajouter le name après tool_call_id
      return match.replace(/tool_call_id: ([^,]+),/, 'tool_call_id: $1,\n                name: functionCallData.name || \'unknown_tool\', // 🔧 CORRECTION: Ajouter le name')
    }
  },
  {
    name: 'Message tool avec tool_call_id dans un objet',
    pattern: /tool_call_id: toolCallId,\s+content: [^}]+/g,
    replacement: (match) => {
      // Ajouter le name après tool_call_id
      return match.replace(/tool_call_id: toolCallId,/, 'tool_call_id: toolCallId,\n                name: functionCallData.name || \'unknown_tool\', // 🔧 CORRECTION: Ajouter le name')
    }
  }
];

let totalCorrections = 0;

toolMessagePatterns.forEach((pattern, index) => {
  console.log(`\n🔧 Correction ${index + 1}: ${pattern.name}`);
  
  const matches = content.match(pattern.pattern);
  if (matches) {
    console.log(`📍 ${matches.length} occurrence(s) trouvée(s)`);
    
    let correctedContent = content;
    matches.forEach((match, i) => {
      const replacement = pattern.replacement(match);
      correctedContent = correctedContent.replace(match, replacement);
    });
    
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
const finalCheck = content.match(/role: 'tool'[^}]*}/g);
if (finalCheck) {
  console.log(`📍 ${finalCheck.length} message(s) tool trouvé(s)`);
  
  let issuesFound = 0;
  finalCheck.forEach((match, i) => {
    if (match.includes('tool_call_id') && !match.includes('name')) {
      console.log(`❌ Message ${i + 1} sans name: ${match.substring(0, 100)}...`);
      issuesFound++;
    }
  });
  
  if (issuesFound === 0) {
    console.log('✅ Tous les messages tool ont maintenant un name');
  } else {
    console.log(`❌ ${issuesFound} problème(s) restant(s)`);
  }
}

console.log('\n🎯 RÉSULTAT:');
if (totalCorrections > 0) {
  console.log(`✅ ${totalCorrections} correction(s) appliquée(s)`);
  console.log('✅ Les messages tool devraient maintenant avoir un name');
} else {
  console.log('✅ Aucune correction nécessaire');
}

console.log('\n📝 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur');
console.log('2. Tester avec des tool calls');
console.log('3. Vérifier que le name est présent dans tous les messages tool'); 