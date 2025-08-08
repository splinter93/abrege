#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC: Où le name est-il perdu dans les messages tool ?
 * 
 * Ce script simule le flux complet pour identifier où le champ 'name' 
 * est perdu dans les messages tool.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC: Où le name est-il perdu dans les messages tool ?\n');

// 1. Simuler la création d'un message tool avec name
console.log('1️⃣ SIMULATION: Création du message tool avec name');
const toolMessageWithName = {
  role: 'tool',
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
  name: 'update_note', // ✅ Name présent
  content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}'
};

console.log('✅ Message tool créé avec name:', JSON.stringify(toolMessageWithName, null, 2));

// 2. Simuler la sauvegarde via l'API
console.log('\n2️⃣ SIMULATION: Sauvegarde via l\'API');
const apiPayload = {
  role: 'tool',
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
  name: 'update_note', // ✅ Name inclus dans le payload
  content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}',
  timestamp: new Date().toISOString()
};

console.log('✅ Payload API avec name:', JSON.stringify(apiPayload, null, 2));

// 3. Vérifier le schéma de validation
console.log('\n3️⃣ VÉRIFICATION: Schéma de validation');
const addMessageSchema = {
  role: 'tool',
  content: 'string',
  timestamp: 'string',
  tool_calls: 'optional',
  tool_call_id: 'string',
  name: 'string' // ✅ Name dans le schéma
};

console.log('✅ Schéma inclut name:', JSON.stringify(addMessageSchema, null, 2));

// 4. Simuler la récupération depuis la base
console.log('\n4️⃣ SIMULATION: Récupération depuis la base');
const retrievedMessage = {
  role: 'tool',
  content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}',
  tool_calls: undefined,
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a'
  // ❌ MANQUE: name
};

console.log('❌ Message récupéré SANS name:', JSON.stringify(retrievedMessage, null, 2));

// 5. Analyser les causes possibles
console.log('\n5️⃣ ANALYSE: Causes possibles de la perte du name');

const possibleCauses = [
  {
    cause: 'Sauvegarde incomplète',
    description: 'Le name n\'est pas sauvegardé en base',
    check: 'Vérifier la création du newMessage dans l\'API',
    file: 'src/app/api/v1/chat-sessions/[id]/messages/route.ts'
  },
  {
    cause: 'Récupération incomplète',
    description: 'Le name est sauvegardé mais pas récupéré',
    check: 'Vérifier getSessionHistory',
    file: 'src/app/api/chat/llm/route.ts'
  },
  {
    cause: 'Transmission incomplète',
    description: 'Le name est récupéré mais pas transmis à l\'API LLM',
    check: 'Vérifier sessionHistory.map',
    file: 'src/app/api/chat/llm/route.ts'
  },
  {
    cause: 'Création directe sans name',
    description: 'Le message tool est créé directement sans name',
    check: 'Vérifier les créations hardcodées de messages tool',
    file: 'src/app/api/chat/llm/route.ts'
  }
];

possibleCauses.forEach((cause, index) => {
  console.log(`${index + 1}. ${cause.cause}:`);
  console.log(`   📝 ${cause.description}`);
  console.log(`   🔍 ${cause.check}`);
  console.log(`   📁 ${cause.file}\n`);
});

// 6. Recommandations
console.log('6️⃣ RECOMMANDATIONS:');

const recommendations = [
  '🔧 Vérifier que le name est bien inclus dans newMessage lors de la sauvegarde',
  '🔧 Vérifier que le name est bien transmis dans sessionHistory.map',
  '🔧 Vérifier qu\'il n\'y a pas de créations hardcodées de messages tool sans name',
  '🔧 Ajouter des logs pour tracer le name à chaque étape'
];

recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec}`);
});

console.log('\n🏁 DIAGNOSTIC TERMINÉ');
console.log('📋 Prochaines étapes:');
console.log('   1. Vérifier la sauvegarde dans l\'API messages');
console.log('   2. Vérifier la transmission dans sessionHistory.map');
console.log('   3. Vérifier les créations hardcodées de messages tool');
console.log('   4. Ajouter des logs de debug pour tracer le name'); 