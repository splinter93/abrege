#!/usr/bin/env node

/**
 * 🔍 SIMULATE NAME LOSS
 * 
 * Ce script simule le flux complet pour identifier exactement
 * où le champ 'name' est perdu dans les messages tool.
 */

console.log('🔍 SIMULATING NAME LOSS IN TOOL MESSAGES...\n');

// 1. SIMULATION: Création du message tool avec name
console.log('1️⃣ SIMULATION: Création du message tool avec name');
const originalToolMessage = {
  role: 'tool',
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
  name: 'update_note', // ✅ Name présent
  content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}'
};

console.log('✅ Message tool original avec name:', JSON.stringify(originalToolMessage, null, 2));

// 2. SIMULATION: Sauvegarde via l'API (schéma de validation)
console.log('\n2️⃣ SIMULATION: Validation et sauvegarde via l\'API');
const apiPayload = {
  role: 'tool',
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
  name: 'update_note', // ✅ Name inclus dans le payload
  content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}',
  timestamp: new Date().toISOString()
};

console.log('✅ Payload API avec name:', JSON.stringify(apiPayload, null, 2));

// 3. SIMULATION: Création du newMessage (dans l'API)
console.log('\n3️⃣ SIMULATION: Création du newMessage dans l\'API');
const newMessage = {
  id: 'msg_' + Date.now(),
  role: 'tool',
  content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}',
  timestamp: new Date().toISOString(),
  tool_calls: undefined,
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
  name: 'update_note' // ✅ Name inclus dans newMessage
};

console.log('✅ newMessage avec name:', JSON.stringify(newMessage, null, 2));

// 4. SIMULATION: Sauvegarde en base (JSONB)
console.log('\n4️⃣ SIMULATION: Sauvegarde en base (JSONB)');
const savedThread = [
  {
    role: 'user',
    content: 'renomme la note en Inception',
    timestamp: new Date().toISOString()
  },
  {
    role: 'assistant',
    content: null,
    tool_calls: [{
      id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
      type: 'function',
      function: {
        name: 'update_note',
        arguments: '{"note_id":"123","title":"Inception"}'
      }
    }],
    timestamp: new Date().toISOString()
  },
  {
    role: 'tool',
    content: '{"success":false,"error":"Échec de l\'exécution de update_note: Note non trouvé"}',
    tool_calls: undefined,
    tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a'
    // ❌ MANQUE: name
  }
];

console.log('❌ Thread sauvegardé SANS name:', JSON.stringify(savedThread[2], null, 2));

// 5. SIMULATION: Récupération depuis la base
console.log('\n5️⃣ SIMULATION: Récupération depuis la base');
const retrievedHistory = savedThread; // Simuler la récupération

console.log('❌ Historique récupéré SANS name:', JSON.stringify(retrievedHistory[2], null, 2));

// 6. SIMULATION: Transmission dans sessionHistory.map
console.log('\n6️⃣ SIMULATION: Transmission dans sessionHistory.map');
const transmittedMessages = retrievedHistory.map(msg => {
  const mappedMsg = {
    role: msg.role,
    content: msg.content
  };
  
  if (msg.role === 'assistant' && msg.tool_calls) {
    mappedMsg.tool_calls = msg.tool_calls;
  }
  
  if (msg.role === 'tool') {
    if (msg.tool_call_id) {
      mappedMsg.tool_call_id = msg.tool_call_id;
    }
    if (msg.name) {
      mappedMsg.name = msg.name; // ✅ Transmission du name
    }
  }
  
  return mappedMsg;
});

console.log('❌ Messages transmis SANS name:', JSON.stringify(transmittedMessages[2], null, 2));

// 7. ANALYSE: Identifier le point de perte
console.log('\n7️⃣ ANALYSE: Identifier le point de perte');

const analysis = [
  {
    step: 'Création originale',
    hasName: true,
    name: 'update_note',
    status: '✅ OK'
  },
  {
    step: 'Payload API',
    hasName: true,
    name: 'update_note',
    status: '✅ OK'
  },
  {
    step: 'newMessage',
    hasName: true,
    name: 'update_note',
    status: '✅ OK'
  },
  {
    step: 'Sauvegarde en base',
    hasName: false,
    name: '❌ MANQUE',
    status: '❌ PROBLÈME ICI !'
  },
  {
    step: 'Récupération',
    hasName: false,
    name: '❌ MANQUE',
    status: '❌ CONSÉQUENCE'
  },
  {
    step: 'Transmission',
    hasName: false,
    name: '❌ MANQUE',
    status: '❌ CONSÉQUENCE'
  }
];

analysis.forEach((item, index) => {
  console.log(`${index + 1}. ${item.step}:`);
  console.log(`   Name: ${item.name}`);
  console.log(`   Status: ${item.status}`);
  console.log('');
});

// 8. CONCLUSION
console.log('8️⃣ CONCLUSION:');
console.log('🔍 Le problème est dans la SAUVEGARDE EN BASE !');
console.log('📋 Le name est bien créé et validé, mais il n\'est pas sauvegardé.');
console.log('🔧 Vérifier la création du newMessage dans l\'API messages.');
console.log('🔧 Vérifier que le name est bien inclus dans le JSONB sauvegardé.');

console.log('\n🏁 SIMULATION TERMINÉE');
console.log('📋 Prochaine étape: Vérifier la sauvegarde dans l\'API messages'); 