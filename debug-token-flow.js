#!/usr/bin/env node

/**
 * Script de debug pour tracer le flux complet du token d'authentification
 * quand un agent appelle un autre agent via executeAgent
 */

console.log('🔍 DEBUG: Tracé du flux de token d\'authentification\n');

console.log('📋 FLUX COMPLET:');
console.log('1. Agent A fait un tool call "executeAgent"');
console.log('2. ToolCallManager.executeToolCall() reçoit le userToken de l\'utilisateur final');
console.log('3. ApiV2ToolExecutor.executeToolCall() reçoit le userToken');
console.log('4. ApiV2HttpClient.executeAgent() reçoit le userToken');
console.log('5. ApiV2HttpClient.makeRequest() détecte si c\'est un userId ou un token JWT');
console.log('6. Si userId: utilise X-User-Id + X-Service-Role');
console.log('7. Si token JWT: utilise Authorization Bearer');
console.log('8. L\'endpoint /api/v2/agents/execute reçoit la requête');
console.log('9. getAuthenticatedUser() traite l\'authentification');
console.log('10. L\'agent appelé reçoit le token de l\'utilisateur final');
console.log('11. L\'agent appelé fait ses tool calls avec le bon token');

console.log('\n🔧 POINTS DE VÉRIFICATION:');
console.log('- Le userToken est-il bien passé dans toute la chaîne ?');
console.log('- L\'ApiV2HttpClient détecte-t-il correctement userId vs token JWT ?');
console.log('- Les headers X-User-Id et X-Service-Role sont-ils bien envoyés ?');
console.log('- getAuthenticatedUser() gère-t-il bien l\'impersonation ?');
console.log('- L\'agent appelé reçoit-il le bon token pour ses tool calls ?');

console.log('\n🧪 TEST SIMULÉ:');
console.log('Simulation d\'un appel executeAgent avec userId...');

// Simulation des headers qui seraient envoyés
const simulatedHeaders = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'agent',
  'X-User-Id': '12345678-1234-1234-1234-123456789012',
  'X-Service-Role': 'true'
};

console.log('\n📤 Headers simulés:');
console.log(JSON.stringify(simulatedHeaders, null, 2));

console.log('\n✅ Vérification des headers:');
console.log(`- X-User-Id présent: ${!!simulatedHeaders['X-User-Id']}`);
console.log(`- X-Service-Role présent: ${!!simulatedHeaders['X-Service-Role']}`);
console.log(`- X-Client-Type: ${simulatedHeaders['X-Client-Type']}`);

console.log('\n🔍 PROCHAINES ÉTAPES:');
console.log('1. Vérifier les logs de l\'ApiV2HttpClient');
console.log('2. Vérifier les logs de getAuthenticatedUser');
console.log('3. Tester avec un vrai appel API');
console.log('4. Ajouter des logs de debug supplémentaires si nécessaire');
