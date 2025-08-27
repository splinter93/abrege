#!/usr/bin/env node

/**
 * Script de debug pour l'erreur OAuth "invalid_scope"
 * Aide à identifier et résoudre les problèmes de scope OAuth
 */

console.log('🔍 [DEBUG] Script de debug OAuth Scope');
console.log('=====================================');

// 1. Vérifier les scopes autorisés
const allowedScopes = [
  'notes:read', 'notes:write', 
  'dossiers:read', 'dossiers:write', 
  'classeurs:read', 'classeurs:write'
];

console.log('\n✅ Scopes autorisés pour scrivia-custom-gpt:');
allowedScopes.forEach(scope => console.log(`  - ${scope}`));

// 2. Vérifier les scopes problématiques
const problematicScopes = [
  'profile:read', // ❌ Non autorisé
  'user:read',    // ❌ Non autorisé
  'admin:all'     // ❌ Non autorisé
];

console.log('\n❌ Scopes problématiques (non autorisés):');
problematicScopes.forEach(scope => console.log(`  - ${scope}`));

// 3. Instructions pour résoudre le problème
console.log('\n🔧 Instructions pour résoudre l\'erreur:');
console.log('1. Ouvrir la console du navigateur (F12)');
console.log('2. Aller dans l\'onglet Application > Session Storage');
console.log('3. Supprimer toutes les clés OAuth:');
console.log('   - chatgpt_oauth_flow');
console.log('   - chatgpt_oauth_params');
console.log('   - oauth_external_params');
console.log('4. Vider le cache du navigateur');
console.log('5. Tester à nouveau le flux OAuth');

// 4. Test de validation des scopes
console.log('\n🧪 Test de validation des scopes:');

function validateScopes(requestedScopes) {
  const valid = requestedScopes.filter(scope => allowedScopes.includes(scope));
  const invalid = requestedScopes.filter(scope => !allowedScopes.includes(scope));
  
  console.log(`\nScopes demandés: ${requestedScopes.join(', ')}`);
  console.log(`✅ Scopes valides: ${valid.join(', ')}`);
  console.log(`❌ Scopes invalides: ${invalid.join(', ')}`);
  
  if (invalid.length > 0) {
    console.log(`\n🚨 PROBLÈME: ${invalid.length} scope(s) invalide(s) détecté(s)!`);
    console.log('   C\'est la cause de l\'erreur "invalid_scope"');
  } else {
    console.log('\n✅ Tous les scopes sont valides');
  }
  
  return valid;
}

// Test avec des scopes valides
console.log('\n--- Test 1: Scopes valides ---');
validateScopes(['notes:read', 'notes:write']);

// Test avec des scopes mixtes
console.log('\n--- Test 2: Scopes mixtes ---');
validateScopes(['notes:read', 'profile:read', 'dossiers:read']);

// Test avec des scopes invalides
console.log('\n--- Test 3: Scopes invalides ---');
validateScopes(['profile:read', 'user:read', 'admin:all']);

console.log('\n🎯 Résumé:');
console.log('- L\'erreur "invalid_scope" est causée par des scopes non autorisés');
console.log('- Les scopes doivent être exactement ceux listés dans "Scopes autorisés"');
console.log('- Utilisez le script de test mis à jour: test-oauth-flow.html');
console.log('- Videz le cache du navigateur si le problème persiste');
