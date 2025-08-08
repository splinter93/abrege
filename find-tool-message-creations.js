#!/usr/bin/env node

/**
 * 🔍 FIND TOOL MESSAGE CREATIONS
 * 
 * Ce script trouve toutes les créations de messages tool dans le fichier
 * route.ts pour vérifier si le name est bien inclus partout.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FINDING TOOL MESSAGE CREATIONS...\n');

const targetFile = 'src/app/api/chat/llm/route.ts';
const content = fs.readFileSync(targetFile, 'utf8');

// Patterns pour trouver les créations de messages tool
const patterns = [
  {
    name: 'role: \'tool\'',
    regex: /role:\s*['"]tool['"][^}]*}/g,
    description: 'Créations avec role: \'tool\''
  },
  {
    name: 'role: "tool"',
    regex: /role:\s*["']tool["'][^}]*}/g,
    description: 'Créations avec role: "tool"'
  },
  {
    name: 'tool_call_id',
    regex: /tool_call_id:[^}]*}/g,
    description: 'Créations avec tool_call_id'
  },
  {
    name: 'addMessage tool',
    regex: /addMessage.*role.*tool[^}]*}/g,
    description: 'Appels addMessage avec role tool'
  }
];

let totalFound = 0;

patterns.forEach((pattern, index) => {
  console.log(`${index + 1}. 🔍 Recherche: ${pattern.description}`);
  
  const matches = content.match(pattern.regex);
  if (matches) {
    console.log(`   ✅ Trouvé ${matches.length} occurrences:`);
    matches.forEach((match, matchIndex) => {
      const hasName = match.includes('name:') || match.includes('"name"') || match.includes("'name'");
      const hasToolCallId = match.includes('tool_call_id');
      const status = hasName ? '✅ AVEC name' : '❌ SANS name';
      
      console.log(`   ${matchIndex + 1}. ${status}`);
      console.log(`      ${match.replace(/\s+/g, ' ').substring(0, 100)}...`);
      console.log('');
    });
    totalFound += matches.length;
  } else {
    console.log(`   ❌ Aucune occurrence trouvée`);
  }
  console.log('');
});

// Recherche spécifique des problèmes
console.log('🔍 RECHERCHE SPÉCIFIQUE DES PROBLÈMES:');

// 1. Messages tool sans name
const toolWithoutName = content.match(/role:\s*['"]tool['"][^}]*}(?![^}]*name:)/g);
if (toolWithoutName) {
  console.log('❌ Messages tool SANS name trouvés:');
  toolWithoutName.forEach((match, index) => {
    console.log(`   ${index + 1}. ${match.replace(/\s+/g, ' ').substring(0, 80)}...`);
  });
} else {
  console.log('✅ Aucun message tool sans name trouvé');
}

// 2. Messages tool avec name
const toolWithName = content.match(/role:\s*['"]tool['"][^}]*name:[^}]*}/g);
if (toolWithName) {
  console.log('✅ Messages tool AVEC name trouvés:');
  toolWithName.forEach((match, index) => {
    console.log(`   ${index + 1}. ${match.replace(/\s+/g, ' ').substring(0, 80)}...`);
  });
} else {
  console.log('❌ Aucun message tool avec name trouvé');
}

console.log('\n📊 STATISTIQUES:');
console.log(`   Total créations trouvées: ${totalFound}`);
console.log(`   Messages tool sans name: ${toolWithoutName ? toolWithoutName.length : 0}`);
console.log(`   Messages tool avec name: ${toolWithName ? toolWithName.length : 0}`);

if (toolWithoutName && toolWithoutName.length > 0) {
  console.log('\n🚨 PROBLÈME DÉTECTÉ: Messages tool sans name !');
  console.log('🔧 Correction nécessaire: Ajouter le name dans ces créations.');
} else {
  console.log('\n✅ Aucun problème détecté dans les créations de messages tool.');
}

console.log('\n🏁 ANALYSE TERMINÉE'); 