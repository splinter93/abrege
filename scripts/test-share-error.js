#!/usr/bin/env node

require('dotenv').config();

console.log('🚨 TEST DE L\'ERREUR DE PARTAGE');
console.log('================================\n');

console.log('📋 INSTRUCTIONS:');
console.log('1. Ouvrez l\'éditeur dans le navigateur');
console.log('2. Ouvrez la console (F12 → Console)');
console.log('3. Ouvrez une note');
console.log('4. Cliquez sur le menu "..." (kebab)');
console.log('5. Cliquez sur "Partager"');
console.log('6. Modifiez les paramètres de partage');
console.log('7. Cliquez sur "Sauvegarder"');
console.log('8. Regardez les logs dans la console');
console.log('\n');

console.log('🔍 LOGS À CHERCHER:');
console.log('- 🚨 [EDITOR] ===== DÉBUT HANDLESHARESETTINGSCHANGE =====');
console.log('- 🚨 [DEBUG] ===== DÉBUT API V2 SHARE =====');
console.log('- 🚨 [DEBUG] ===== DÉBUT CHECKUSERPERMISSION =====');
console.log('\n');

console.log('📊 INFORMATIONS UTILES:');
console.log('- URL de l\'API: /api/v2/note/[noteId]/share');
console.log('- Méthode: PATCH');
console.log('- Erreur attendue: "Article non trouvé"');
console.log('\n');

console.log('💡 SI L\'ERREUR PERSISTE:');
console.log('- Vérifiez que vous êtes connecté');
console.log('- Vérifiez que la note a un slug');
console.log('- Vérifiez les logs dans la console du navigateur');
console.log('- Vérifiez les logs dans le terminal Next.js');
console.log('\n');

console.log('🎯 OBJECTIF:');
console.log('Identifier exactement où l\'erreur se produit dans la chaîne:');
console.log('Éditeur → API V2 /share → checkUserPermission → Requête DB'); 