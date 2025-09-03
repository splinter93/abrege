#!/usr/bin/env node

/**
 * 🔧 ADD NAME DEBUG LOGS
 * 
 * Ce script ajoute des logs de debug pour tracer le champ 'name' 
 * dans les messages tool à chaque étape du processus.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 ADDING NAME DEBUG LOGS...\n');

const targetFile = 'src/app/api/chat/llm/route.ts';

// Lire le fichier
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Ajouter des logs dans getSessionHistory pour tracer le name
const getSessionHistoryLog = `
    // 🔍 DEBUG: Tracer le name dans les messages tool
    const messagesWithName = limitedHistory.map(msg => {
      if (msg.role === 'tool') {
        logger.dev('[LLM API] 🔍 Message tool trouvé:', {
          tool_call_id: msg.tool_call_id,
          name: msg.name || '❌ MANQUE',
          hasName: !!msg.name
        });
      }
      return msg;
    });

    logger.dev('[LLM API] 📊 Statistiques messages tool:', {
      totalMessages: limitedHistory.length,
      toolMessages: limitedHistory.filter(m => m.role === 'tool').length,
      toolMessagesWithName: limitedHistory.filter(m => m.role === 'tool' && m.name).length
    });

    return messagesWithName;`;

// Remplacer le return dans getSessionHistory
content = content.replace(
  /return limitedHistory;/,
  getSessionHistoryLog
);

// 2. Ajouter des logs dans sessionHistory.map pour tracer la transmission
const sessionHistoryMapLog = `
          // 🔍 DEBUG: Tracer la transmission du name
          if (msg.role === 'tool') {
            logger.dev('[LLM API] 🔍 Transmission message tool:', {
              originalName: msg.name || '❌ MANQUE',
              toolCallId: msg.tool_call_id,
              willIncludeName: !!msg.name
            });
          }`;

// Ajouter le log avant chaque sessionHistory.map
const mapPatterns = [
  /sessionHistory\.map\(\(msg: ChatMessage\) => \{/g,
  /sessionHistory\.map\(\(msg: any\) => \{/g
];

mapPatterns.forEach(pattern => {
  content = content.replace(pattern, (match) => {
    return match + sessionHistoryMapLog;
  });
});

// 3. Ajouter des logs après la création des messages tool
const toolMessageCreationLog = `
          // 🔍 DEBUG: Tracer la création du message tool
          logger.dev('[LLM API] 🔍 Création message tool:', {
            toolCallId: toolCallId,
            functionName: functionCallData.name,
            toolName: toolResultMessage.name,
            hasName: !!toolResultMessage.name
          });`;

// Ajouter le log après la création de toolResultMessage
content = content.replace(
  /const toolResultMessage = \{[\s\S]*?\};/g,
  (match) => {
    return match + toolMessageCreationLog;
  }
);

// 4. Ajouter des logs dans la sauvegarde
const saveMessageLog = `
            // 🔍 DEBUG: Tracer la sauvegarde du message tool
            logger.dev('[LLM API] 🔍 Sauvegarde message tool:', {
              toolCallId: toolCallId,
              name: functionCallData.name,
              willSaveName: !!functionCallData.name
            });`;

// Ajouter le log avant la sauvegarde
content = content.replace(
  /body: JSON\.stringify\(\{[\s\S]*?role: 'tool',[\s\S]*?\}\)\)/g,
  (match) => {
    return saveMessageLog + '\n            ' + match;
  }
);

// Écrire le fichier modifié
fs.writeFileSync(targetFile, content);

console.log('✅ LOGS DE DEBUG AJOUTÉS !');
console.log('📋 Logs ajoutés:');
console.log('   1. 🔍 Tracer le name dans getSessionHistory');
console.log('   2. 🔍 Tracer la transmission dans sessionHistory.map');
console.log('   3. 🔍 Tracer la création des messages tool');
console.log('   4. 🔍 Tracer la sauvegarde des messages tool');
console.log('\n🔄 Redémarrez le serveur et testez pour voir les logs !'); 