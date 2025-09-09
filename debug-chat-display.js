/**
 * Script de debug pour l'affichage du chat
 * Diagnostic des problèmes de reasoning et tool calls
 */

console.log('🐛 Debug Chat Display - Diagnostic des problèmes');
console.log('=' .repeat(60));

// 1. Vérifier les types ChatMessage
console.log('\n1. 📝 Vérification des types ChatMessage...');
try {
  const { ChatMessage } = require('./src/types/chat');
  console.log('   ✅ Type ChatMessage importé');
  console.log('   📊 Propriétés disponibles:', Object.keys(ChatMessage || {}));
} catch (error) {
  console.log('   ❌ Erreur import ChatMessage:', error.message);
}

// 2. Vérifier les composants
console.log('\n2. ⚛️ Vérification des composants...');
try {
  const ReasoningMessage = require('./src/components/chat/ReasoningMessage.tsx');
  console.log('   ✅ ReasoningMessage importé');
} catch (error) {
  console.log('   ❌ Erreur import ReasoningMessage:', error.message);
}

try {
  const HarmonyReasoningMessage = require('./src/components/chat/HarmonyReasoningMessage.tsx');
  console.log('   ✅ HarmonyReasoningMessage importé');
} catch (error) {
  console.log('   ❌ Erreur import HarmonyReasoningMessage:', error.message);
}

// 3. Vérifier les CSS
console.log('\n3. 🎨 Vérification des CSS...');
try {
  const fs = require('fs');
  const reasoningCSS = fs.readFileSync('./src/components/chat/ReasoningMessage.css', 'utf8');
  const harmonyCSS = fs.readFileSync('./src/components/chat/HarmonyReasoningMessage.css', 'utf8');
  console.log('   ✅ ReasoningMessage.css chargé');
  console.log('   ✅ HarmonyReasoningMessage.css chargé');
  console.log('   📊 Taille ReasoningMessage.css:', reasoningCSS.length, 'caractères');
  console.log('   📊 Taille HarmonyReasoningMessage.css:', harmonyCSS.length, 'caractères');
} catch (error) {
  console.log('   ❌ Erreur lecture CSS:', error.message);
}

// 4. Vérifier l'import CSS dans index.css
console.log('\n4. 📦 Vérification des imports CSS...');
try {
  const fs = require('fs');
  const indexCSS = fs.readFileSync('./src/components/chat/index.css', 'utf8');
  const hasReasoningImport = indexCSS.includes('ReasoningMessage.css');
  const hasHarmonyImport = indexCSS.includes('HarmonyReasoningMessage.css');
  console.log('   ✅ index.css chargé');
  console.log('   📊 Import ReasoningMessage.css:', hasReasoningImport ? '✅' : '❌');
  console.log('   📊 Import HarmonyReasoningMessage.css:', hasHarmonyImport ? '✅' : '❌');
} catch (error) {
  console.log('   ❌ Erreur lecture index.css:', error.message);
}

// 5. Vérifier les endpoints API
console.log('\n5. 🌐 Vérification des endpoints API...');
console.log('   📊 Endpoint standard: /api/chat/llm');
console.log('   📊 Endpoint Harmony: /api/chat/llm-harmony');

// 6. Instructions de debug
console.log('\n6. 🔍 Instructions de debug:');
console.log('   1. Ouvrir la console du navigateur (F12)');
console.log('   2. Aller sur /chat-fullscreen-v2');
console.log('   3. Activer le toggle Harmony');
console.log('   4. Envoyer un message');
console.log('   5. Vérifier les logs:');
console.log('      - [ChatMessageOptimized] 🧠 Reasoning détecté');
console.log('      - [HarmonyReasoningMessage] 🎼 Rendu');
console.log('      - [useChatResponseHarmony] 🎯 Données Harmony extraites');

// 7. Problèmes potentiels identifiés
console.log('\n7. 🚨 Problèmes potentiels identifiés:');
console.log('   ❌ Tool calls: Message temporaire avec persist: false');
console.log('   ❌ Reasoning: Peut-être pas passé dans le message');
console.log('   ❌ CSS: Peut-être pas chargé correctement');
console.log('   ❌ Types: Propriétés Harmony manquantes dans ChatMessage');

// 8. Solutions appliquées
console.log('\n8. ✅ Solutions appliquées:');
console.log('   ✅ Ajout des propriétés Harmony dans ChatMessage');
console.log('   ✅ Changement persist: false → persist: true pour tool calls');
console.log('   ✅ Ajout de debug dans les composants');
console.log('   ✅ Import CSS HarmonyReasoningMessage.css');

console.log('\n🎯 Prochaines étapes:');
console.log('   1. Tester avec le toggle Harmony activé');
console.log('   2. Vérifier les logs dans la console');
console.log('   3. Inspecter les éléments DOM pour voir si les composants sont rendus');
console.log('   4. Vérifier que les CSS sont appliqués');

console.log('\n' + '=' .repeat(60));
