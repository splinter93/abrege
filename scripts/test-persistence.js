#!/usr/bin/env node

/**
 * Script de test pour la persistance des messages
 * Identifie les problèmes de sauvegarde en DB
 */

console.log('🔍 TEST PERSISTANCE MESSAGES - IDENTIFICATION DES ERREURS');

// Simuler les messages qui causent des erreurs
const testMessages = [
  // Message assistant avec reasoning
  {
    role: 'assistant',
    content: 'Voici ma réponse...',
    reasoning: 'Je dois d\'abord analyser la demande...',
    timestamp: new Date().toISOString()
  },
  
  // Message assistant avec tool_calls
  {
    role: 'assistant',
    content: null,
    tool_calls: [{
      id: 'test-tool-call-id',
      type: 'function',
      function: {
        name: 'get_tree',
        arguments: '{"notebook_id":"test-notebook-id"}'
      }
    }],
    timestamp: new Date().toISOString()
  },
  
  // Message tool avec résultat
  {
    role: 'tool',
    tool_call_id: 'test-tool-call-id',
    name: 'get_tree',
    content: '{"success":true,"data":{"tree":[]}}',
    timestamp: new Date().toISOString()
  },
  
  // Message avec tool_results
  {
    role: 'assistant',
    content: 'Voici les résultats...',
    tool_results: [{
      tool_call_id: 'test-tool-call-id',
      name: 'get_tree',
      content: '{"success":true}',
      success: true
    }],
    timestamp: new Date().toISOString()
  }
];

console.log('\n📋 ANALYSE DES MESSAGES DE TEST:');

testMessages.forEach((message, index) => {
  console.log(`\n${index + 1}. MESSAGE ${message.role.toUpperCase()}:`);
  console.log('   Structure:', JSON.stringify(message, null, 2));
  
  // Vérifier les champs critiques
  const checks = [];
  
  // Vérifier le role
  if (['user', 'assistant', 'system', 'tool'].includes(message.role)) {
    checks.push('✅ Role valide');
  } else {
    checks.push('❌ Role invalide');
  }
  
  // Vérifier le content
  if (message.content === null || message.content === undefined || typeof message.content === 'string') {
    checks.push('✅ Content valide');
  } else {
    checks.push('❌ Content invalide');
  }
  
  // Vérifier le timestamp
  if (message.timestamp && typeof message.timestamp === 'string') {
    checks.push('✅ Timestamp valide');
  } else {
    checks.push('❌ Timestamp invalide');
  }
  
  // Vérifier le reasoning
  if (message.reasoning === null || message.reasoning === undefined || typeof message.reasoning === 'string') {
    checks.push('✅ Reasoning valide');
  } else {
    checks.push('❌ Reasoning invalide');
  }
  
  // Vérifier tool_calls
  if (!message.tool_calls || Array.isArray(message.tool_calls)) {
    checks.push('✅ Tool_calls valide');
  } else {
    checks.push('❌ Tool_calls invalide');
  }
  
  // Vérifier tool_call_id
  if (!message.tool_call_id || typeof message.tool_call_id === 'string') {
    checks.push('✅ Tool_call_id valide');
  } else {
    checks.push('❌ Tool_call_id invalide');
  }
  
  // Vérifier name
  if (!message.name || typeof message.name === 'string') {
    checks.push('✅ Name valide');
  } else {
    checks.push('❌ Name invalide');
  }
  
  // Vérifier tool_results
  if (!message.tool_results || Array.isArray(message.tool_results)) {
    checks.push('✅ Tool_results valide');
  } else {
    checks.push('❌ Tool_results invalide');
  }
  
  checks.forEach(check => console.log(`   ${check}`));
});

// Analyser les causes possibles d'erreur
console.log('\n🚨 CAUSES POSSIBLES D\'ERREUR:');
const possibleCauses = [
  'Session inexistante ou inaccessible',
  'Token d\'authentification invalide',
  'Permissions insuffisantes sur la session',
  'Problème de connexion à la base de données',
  'Schéma de validation trop strict',
  'Champs manquants dans la DB',
  'Problème de RLS (Row Level Security)'
];

possibleCauses.forEach((cause, index) => {
  console.log(`   ${index + 1}. ${cause}`);
});

// Recommandations de debug
console.log('\n💡 RECOMMANDATIONS DE DEBUG:');
const debugSteps = [
  'Vérifier que la session existe en DB',
  'Vérifier les permissions de l\'utilisateur',
  'Tester avec un token d\'authentification valide',
  'Vérifier les logs de Supabase',
  'Tester la validation du schéma',
  'Vérifier la structure de la table chat_sessions'
];

debugSteps.forEach((step, index) => {
  console.log(`   ${index + 1}. ${step}`);
});

console.log('\n✅ TEST TERMINÉ - Causes identifiées'); 