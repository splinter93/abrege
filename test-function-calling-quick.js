#!/usr/bin/env node

/**
 * 🧪 Test Rapide des Function Calls
 * 
 * Teste si le code de function calling fonctionne en forçant les outils
 */

console.log('🧪 TEST RAPIDE DES FUNCTION CALLS');
console.log('==================================');

console.log('\n📋 SIMULATION D\'UNE REQUÊTE AVEC FUNCTION CALLING:');

// Simuler une requête avec function calling activé
const testRequest = {
  message: "Créer une note 'Test Function Call' avec le contenu 'Ceci est un test'",
  context: {
    agentId: "donna-agent", // Agent Donna avec DeepSeek
    sessionId: "test-session-123"
  },
  history: [],
  provider: "deepseek",
  channelId: "test-channel-123"
};

console.log('\n📤 Requête simulée:');
console.log(JSON.stringify(testRequest, null, 2));

console.log('\n🔧 ANALYSE DU CODE (ligne 180):');
console.log('   const tools = agentConfig?.api_v2_capabilities?.length > 0');
console.log('     ? agentApiV2Tools.getToolsForFunctionCalling()');
console.log('     : undefined;');

console.log('\n❌ **PROBLÈME IDENTIFIÉ:**');
console.log('   - agentConfig.api_v2_capabilities est null ou []');
console.log('   - Donc tools = undefined');
console.log('   - Pas de function calling activé');

console.log('\n✅ **SOLUTION TEMPORAIRE POUR TESTER:**');
console.log('   Modifier temporairement la ligne 180 dans src/app/api/chat/llm/route.ts:');
console.log('   ');
console.log('   // AVANT (ligne 180):');
console.log('   const tools = agentConfig?.api_v2_capabilities?.length > 0');
console.log('     ? agentApiV2Tools.getToolsForFunctionCalling()');
console.log('     : undefined;');
console.log('   ');
console.log('   // APRÈS (pour test):');
console.log('   const tools = agentApiV2Tools.getToolsForFunctionCalling(); // Force les outils');

console.log('\n🔍 **TEST MANUEL:**');
console.log('   1. Modifier la ligne 180 comme indiqué ci-dessus');
console.log('   2. Redémarrer l\'application: npm run dev');
console.log('   3. Tester avec Donna: "Créer une note de test"');
console.log('   4. Vérifier les logs pour voir si les tool_calls sont détectés');

console.log('\n📊 **RÉSULTATS ATTENDUS:**');
console.log('   ✅ Si les tool_calls sont détectés: Le code fonctionne');
console.log('   ❌ Si pas de tool_calls: Problème dans le parsing ou l\'exécution');

console.log('\n🎯 **ÉTAPES DE TEST:**');

console.log('\n1️⃣ **Modifier le code temporairement**');
console.log('   Dans src/app/api/chat/llm/route.ts, ligne 180:');
console.log('   Remplacer la condition par: const tools = agentApiV2Tools.getToolsForFunctionCalling();');

console.log('\n2️⃣ **Redémarrer l\'application**');
console.log('   npm run dev');

console.log('\n3️⃣ **Tester avec Donna**');
console.log('   Message: "Créer une note \'Test Function Call\' avec le contenu \'Ceci est un test\'"');

console.log('\n4️⃣ **Vérifier les logs**');
console.log('   Chercher: [DEV] [LLM API] 🔧 Tool calls détectés');
console.log('   Ou: [DEV] [LLM API] 🎯 ON ENTRE DANS LE BLOC FUNCTION CALL !');

console.log('\n5️⃣ **Restaurer le code**');
console.log('   Remettre la condition originale après le test');

console.log('\n🔧 **OUTILS DISPONIBLES POUR TEST:**');
console.log('   - create_note: Créer une nouvelle note');
console.log('   - update_note: Modifier une note existante');
console.log('   - add_content_to_note: Ajouter du contenu à une note');
console.log('   - move_note: Déplacer une note');
console.log('   - delete_note: Supprimer une note');
console.log('   - create_folder: Créer un dossier');

console.log('\n📋 **EXEMPLES DE TESTS:**');
console.log('   "Créer une note \'Mon Test\' avec le contenu \'Hello World\'"');
console.log('   "Ajouter \'Nouveau paragraphe\' à ma note \'Mon Test\'"');
console.log('   "Créer un dossier \'Mes Tests\'"');
console.log('   "Déplacer ma note \'Mon Test\' vers le dossier \'Mes Tests\'"');

console.log('\n✅ **CONCLUSION:**');
console.log('   Ce test permettra de vérifier si le code de function calling');
console.log('   fonctionne correctement une fois les outils activés.');
console.log('   Si ça marche, le problème est bien la configuration des agents.');
console.log('   Si ça ne marche pas, il y a un problème dans le code.');

console.log('\n🚀 **PROCHAINES ACTIONS:**');
console.log('   1. Modifier temporairement la ligne 180');
console.log('   2. Tester avec Donna');
console.log('   3. Vérifier les logs');
console.log('   4. Restaurer le code');
console.log('   5. Appliquer la migration si le test fonctionne'); 