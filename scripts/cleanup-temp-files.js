#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des fichiers temporaires de correction...\n');

const filesToCleanup = [
  'scripts/fix-llm-templates-connection.js',
  'scripts/fix-api-route-agent-config.js',
  'scripts/fix-llm-templates-complete.js',
  'scripts/test-llm-templates-connection.js',
  'scripts/cleanup-temp-files.js',
  'src/app/api/chat/llm/route.ts.backup'
];

let cleanedCount = 0;
let keptCount = 0;

filesToCleanup.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Supprimé: ${filePath}`);
      cleanedCount++;
    } else {
      console.log(`⚠️  Non trouvé: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Erreur suppression ${filePath}: ${error.message}`);
  }
});

console.log('\n📊 Résumé du nettoyage:');
console.log(`   🗑️  Fichiers supprimés: ${cleanedCount}`);
console.log(`   ⚠️  Fichiers non trouvés: ${keptCount}`);

console.log('\n✅ Nettoyage terminé !');
console.log('\n🎯 Les corrections ont été appliquées avec succès:');
console.log('   - Route API mise à jour pour récupérer l\'agentConfig');
console.log('   - Templates LLM connectés à la table agents');
console.log('   - Configuration des agents enrichie');
console.log('\n🚀 Vous pouvez maintenant redémarrer votre application et tester !'); 