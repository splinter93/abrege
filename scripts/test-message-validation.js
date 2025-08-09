#!/usr/bin/env node

/**
 * Script de test pour valider les messages avant envoi
 * Identifie les problèmes de format qui causent les erreurs de validation
 */

console.log('🔍 TEST VALIDATION MESSAGES - IDENTIFICATION DES ERREURS');

// Simuler le schéma de validation
const addMessageSchema = {
  role: ['user', 'assistant', 'system', 'tool'],
  content: 'string|null|undefined',
  timestamp: 'string|undefined',
  reasoning: 'string|null|undefined',
  tool_calls: 'array|undefined',
  tool_call_id: 'string|undefined',
  name: 'string|undefined',
  tool_results: 'array|undefined'
};

// Messages problématiques identifiés dans les logs
const problematicMessages = [
  // Message assistant avec tool_calls
  {
    role: 'assistant',
    content: null,
    tool_calls: [{ 
      id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a', 
      type: 'function', 
      function: { 
        name: 'get_tree', 
        arguments: '{"notebookId":"d35d755e-42a4-4100-b796-9c614b2b13bd"}' 
      } 
    }],
    timestamp: '2025-08-08T21:02:39.000Z'
  },
  
  // Message tool avec résultat
  {
    role: 'tool',
    tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a',
    name: 'get_tree',
    content: '{"success":false,"error":"Échec de l\'exécution de get_tree: notebookId au lieu de notebook_id"}',
    timestamp: '2025-08-08T21:02:39.000Z'
  },
  
  // Message assistant avec reasoning
  {
    role: 'assistant',
    content: 'Voici la réponse...',
    reasoning: 'Je dois d\'abord récupérer l\'arborescence...',
    timestamp: '2025-08-08T21:02:39.000Z'
  }
];

console.log('\n📋 ANALYSE DES MESSAGES PROBLÉMATIQUES:');

problematicMessages.forEach((message, index) => {
  console.log(`\n${index + 1}. MESSAGE ${message.role.toUpperCase()}:`);
  console.log('   Structure:', JSON.stringify(message, null, 2));
  
  // Vérifier la conformité au schéma
  const issues = [];
  
  // Vérifier le role
  if (!addMessageSchema.role.includes(message.role)) {
    issues.push(`❌ Role invalide: ${message.role}`);
  }
  
  // Vérifier le content
  if (message.content !== null && message.content !== undefined && typeof message.content !== 'string') {
    issues.push(`❌ Content invalide: ${typeof message.content}`);
  }
  
  // Vérifier le timestamp
  if (message.timestamp && typeof message.timestamp !== 'string') {
    issues.push(`❌ Timestamp invalide: ${typeof message.timestamp}`);
  }
  
  // Vérifier le reasoning
  if (message.reasoning !== null && message.reasoning !== undefined && typeof message.reasoning !== 'string') {
    issues.push(`❌ Reasoning invalide: ${typeof message.reasoning}`);
  }
  
  // Vérifier tool_calls
  if (message.tool_calls && !Array.isArray(message.tool_calls)) {
    issues.push(`❌ Tool_calls invalide: ${typeof message.tool_calls}`);
  }
  
  // Vérifier tool_call_id
  if (message.tool_call_id && typeof message.tool_call_id !== 'string') {
    issues.push(`❌ Tool_call_id invalide: ${typeof message.tool_call_id}`);
  }
  
  // Vérifier name
  if (message.name && typeof message.name !== 'string') {
    issues.push(`❌ Name invalide: ${typeof message.name}`);
  }
  
  // Vérifier tool_results
  if (message.tool_results && !Array.isArray(message.tool_results)) {
    issues.push(`❌ Tool_results invalide: ${typeof message.tool_results}`);
  }
  
  if (issues.length === 0) {
    console.log('   ✅ Message conforme au schéma');
  } else {
    console.log('   ❌ Problèmes détectés:');
    issues.forEach(issue => console.log(`      ${issue}`));
  }
});

// Analyser les erreurs communes
console.log('\n🚨 ERREURS COMMUNES IDENTIFIÉES:');
const commonErrors = [
  'notebookId au lieu de notebook_id',
  'noteId au lieu de ref',
  'title au lieu de source_title',
  'content au lieu de markdown_content',
  'Arguments mal formatés dans tool_calls'
];

commonErrors.forEach(error => {
  console.log(`   ❌ ${error}`);
});

// Recommandations
console.log('\n💡 RECOMMANDATIONS:');
console.log('   1. Vérifier que tous les messages respectent le schéma de validation');
console.log('   2. S\'assurer que les tool_calls ont les bons noms de paramètres');
console.log('   3. Utiliser les noms exacts des paramètres (notebook_id, ref, etc.)');
console.log('   4. Tester la validation avant envoi');
console.log('   5. Ajouter des logs détaillés pour identifier les problèmes');

console.log('\n✅ TEST TERMINÉ - Messages analysés'); 