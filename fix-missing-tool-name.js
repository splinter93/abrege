#!/usr/bin/env node

/**
 * Correction du problème du name manquant dans les messages tool
 * S'assure que le name est toujours transmis
 */

const fs = require('fs');

console.log('🔧 Correction du name manquant dans les messages tool...');

// Chemin du fichier
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Vérifier si la correction de transmission est bien appliquée
const hasTransmissionFix = content.includes('mappedMsg.name = msg.name');
console.log(`🔍 Correction de transmission appliquée: ${hasTransmissionFix ? 'OUI' : 'NON'}`);

if (!hasTransmissionFix) {
  console.log('❌ La correction de transmission n\'est pas appliquée !');
  console.log('🔧 Application de la correction de transmission...');
  
  // Appliquer la correction de transmission
  const oldPattern = /\.\.\.sessionHistory\.map\(\(msg: ChatMessage\) => \({[\s\S]*?role: msg\.role as 'user' \| 'assistant' \| 'system',[\s\S]*?content: msg\.content[\s\S]*?}\)\)/g;
  const newPattern = `...sessionHistory.map((msg: ChatMessage) => {
          const mappedMsg: any = {
            role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
            content: msg.content
          };
          
          // 🔧 CORRECTION: Transmettre les tool_calls pour les messages assistant
          if (msg.role === 'assistant' && msg.tool_calls) {
            mappedMsg.tool_calls = msg.tool_calls;
          }
          
          // 🔧 CORRECTION: Transmettre tool_call_id et name pour les messages tool
          if (msg.role === 'tool') {
            if (msg.tool_call_id) {
              mappedMsg.tool_call_id = msg.tool_call_id;
            }
            if (msg.name) {
              mappedMsg.name = msg.name;
            }
          }
          
          return mappedMsg;
        })`;
  
  const correctedContent = content.replace(oldPattern, newPattern);
  
  if (content !== correctedContent) {
    fs.writeFileSync(routeFile, correctedContent);
    console.log('✅ Correction de transmission appliquée !');
  } else {
    console.log('❌ Impossible d\'appliquer la correction de transmission');
  }
} else {
  console.log('✅ La correction de transmission est déjà appliquée');
}

// Vérifier s'il y a des endroits où le name pourrait être perdu
console.log('\n🔍 Vérification des endroits où le name pourrait être perdu:');

// Chercher les endroits où des messages tool sont créés sans name
const toolCreationPatterns = [
  /role: 'tool'[^}]*}/g,
  /tool_call_id:[^}]*}/g
];

let foundIssues = false;
toolCreationPatterns.forEach((pattern, index) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`📍 Pattern ${index + 1} trouvé ${matches.length} fois`);
    matches.forEach((match, i) => {
      if (!match.includes('name')) {
        console.log(`❌ Match ${i + 1} sans name: ${match.substring(0, 100)}...`);
        foundIssues = true;
      }
    });
  }
});

if (!foundIssues) {
  console.log('✅ Aucun problème trouvé dans la création des messages tool');
}

// Vérifier les endroits où le name est explicitement ajouté
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

// Test de validation
console.log('\n🧪 Test de validation:');

// Simulation d'un message tool avec et sans name
const toolMessageWithName = {
  role: 'tool',
  tool_call_id: 'call_123',
  name: 'list_classeurs',
  content: '{"success":true}'
};

const toolMessageWithoutName = {
  role: 'tool',
  tool_call_id: 'call_123',
  content: '{"success":true}'
  // ❌ MANQUE: name
};

console.log('✅ Message tool avec name:', JSON.stringify(toolMessageWithName, null, 2));
console.log('❌ Message tool sans name:', JSON.stringify(toolMessageWithoutName, null, 2));

// Vérification de la validité
const isValidWithName = toolMessageWithName.role === 'tool' && 
                       toolMessageWithName.tool_call_id && 
                       toolMessageWithName.name && 
                       typeof toolMessageWithName.content === 'string';

const isValidWithoutName = toolMessageWithoutName.role === 'tool' && 
                          toolMessageWithoutName.tool_call_id && 
                          typeof toolMessageWithoutName.content === 'string';

console.log(`✅ Message avec name valide: ${isValidWithName ? 'OUI' : 'NON'}`);
console.log(`❌ Message sans name valide: ${isValidWithoutName ? 'OUI' : 'NON'}`);

console.log('\n🎯 RÉSULTAT:');
if (hasTransmissionFix) {
  console.log('✅ La correction de transmission est appliquée');
  console.log('✅ Le name devrait être transmis correctement');
  console.log('📝 Prochaines étapes:');
  console.log('1. Redémarrer le serveur');
  console.log('2. Tester avec des tool calls');
  console.log('3. Vérifier que le name est présent dans les logs');
} else {
  console.log('❌ La correction de transmission n\'est pas appliquée');
  console.log('🔧 Il faut appliquer la correction de transmission');
}

console.log('\n💡 CONSEILS:');
console.log('- Vérifier que le champ name est bien dans le schéma de la base de données');
console.log('- Vérifier que le name est bien récupéré depuis la base de données');
console.log('- Vérifier que le name est bien transmis à l\'API'); 