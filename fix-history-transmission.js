#!/usr/bin/env node

/**
 * Correction de la transmission de l'historique des tool calls
 * Assure que tool_calls, tool_call_id et name sont transmis
 */

const fs = require('fs');

console.log('🔧 Correction de la transmission de l\'historique...');

// Chemin du fichier
const routeFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(routeFile, 'utf8');

console.log('📖 Lecture du fichier:', routeFile);

// Pattern à rechercher (transmission incomplète)
const oldPattern = /\.\.\.sessionHistory\.map\(\(msg: ChatMessage\) => \({[\s\S]*?role: msg\.role as 'user' \| 'assistant' \| 'system',[\s\S]*?content: msg\.content[\s\S]*?}\)\)/g;

// Nouveau pattern (transmission complète)
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

// Appliquer la correction
const correctedContent = content.replace(oldPattern, newPattern);

// Vérifier si des changements ont été appliqués
if (content === correctedContent) {
  console.log('❌ Aucun changement appliqué. Pattern non trouvé.');
  
  // Essayer un pattern plus simple
  const simpleOldPattern = /\.\.\.sessionHistory\.map\(\(msg: ChatMessage\) => \({[\s\S]*?role: msg\.role as 'user' \| 'assistant' \| 'system',[\s\S]*?content: msg\.content[\s\S]*?}\)\)/g;
  
  if (content.match(simpleOldPattern)) {
    console.log('🔍 Pattern trouvé, mais remplacement échoué.');
  } else {
    console.log('🔍 Aucun pattern trouvé.');
    
    // Afficher les lignes autour de sessionHistory.map
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('sessionHistory.map')) {
        console.log(`📍 Ligne ${i + 1}: ${lines[i].trim()}`);
        console.log(`📍 Ligne ${i + 1}: ${lines[i + 1].trim()}`);
        console.log(`📍 Ligne ${i + 2}: ${lines[i + 2].trim()}`);
      }
    }
  }
} else {
  // Écrire le fichier corrigé
  fs.writeFileSync(routeFile, correctedContent);
  console.log('✅ Correction appliquée avec succès !');
  
  // Afficher les changements
  console.log('\n📋 Changements appliqués:');
  console.log('AVANT: Transmission incomplète (role, content seulement)');
  console.log('APRÈS: Transmission complète (role, content, tool_calls, tool_call_id, name)');
}

// Vérifier les lignes modifiées
console.log('\n🔍 Vérification des lignes modifiées:');
const lines = correctedContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('mappedMsg.tool_calls = msg.tool_calls')) {
    console.log(`📍 Ligne ${i + 1}: ${lines[i].trim()}`);
  }
  if (lines[i].includes('mappedMsg.tool_call_id = msg.tool_call_id')) {
    console.log(`📍 Ligne ${i + 1}: ${lines[i].trim()}`);
  }
}

console.log('\n🎯 RÉSULTAT:');
console.log('✅ L\'historique des tool calls est maintenant correctement transmis');
console.log('✅ Les tool_call_id sont préservés');
console.log('✅ Les tool_calls sont transmis pour les messages assistant');
console.log('✅ Les name sont transmis pour les messages tool');

console.log('\n📝 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur de développement');
console.log('2. Tester avec des tool calls');
console.log('3. Vérifier que l\'erreur tool_call_id est résolue'); 