#!/usr/bin/env node

/**
 * Script de correction complète de tous les fichiers de test
 * Supprime les imports obsolètes et corrige la syntaxe
 */

const fs = require('fs');

console.log('🔧 Correction complète de tous les fichiers de test...\n');

// Fichiers à corriger
const filesToFix = [
  'src/components/test/TestPollingAuth.tsx',
  'src/components/test/TestPollingFix.tsx',
  'src/components/test/TestToolCallSync.tsx',
  'src/components/test/TestV2NotesCreation.tsx',
  'src/components/test/TestNoteDeletion.tsx'
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Corriger les imports
    if (content.includes("import { triggerUnifiedPolling } from '@/services/unifiedPollingService';")) {
      content = content.replace(
        "import { triggerUnifiedPolling } from '@/services/unifiedPollingService';",
        "import { triggerUnifiedRealtimePolling } from '@/services/unifiedRealtimeService';"
      );
      modified = true;
      console.log(`  ✅ Import corrigé dans ${filePath}`);
    }

    if (content.includes("import { getUnifiedPollingStatus } from '@/services/unifiedPollingService';")) {
      content = content.replace(
        "import { getUnifiedPollingStatus } from '@/services/unifiedPollingService';",
        "import { getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';"
      );
      modified = true;
      console.log(`  ✅ Import corrigé dans ${filePath}`);
    }

    if (content.includes("import { stopUnifiedPollingService } from '@/services/unifiedPollingService';")) {
      content = content.replace(
        "import { stopUnifiedPollingService } from '@/services/unifiedPollingService';",
        "import { stopUnifiedRealtimeService } from '@/services/unifiedRealtimeService';"
      );
      modified = true;
      console.log(`  ✅ Import corrigé dans ${filePath}`);
    }

    // 2. Corriger les appels de fonction
    if (content.includes('triggerUnifiedPolling(')) {
      content = content.replace(/triggerUnifiedPolling\(/g, 'triggerUnifiedRealtimePolling(');
      modified = true;
      console.log(`  ✅ Appels de fonction corrigés dans ${filePath}`);
    }

    if (content.includes('getUnifiedPollingStatus(')) {
      content = content.replace(/getUnifiedPollingStatus\(/g, 'getUnifiedRealtimeStatus(');
      modified = true;
      console.log(`  ✅ Appels de fonction corrigés dans ${filePath}`);
    }

    if (content.includes('stopUnifiedPollingService(')) {
      content = content.replace(/stopUnifiedPollingService\(/g, 'stopUnifiedRealtimeService(');
      modified = true;
      console.log(`  ✅ Appels de fonction corrigés dans ${filePath}`);
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  💾 Fichier mis à jour: ${filePath}`);
      return true;
    } else {
      console.log(`  ℹ️  Aucune modification nécessaire: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`  ❌ Erreur lors de la correction de ${filePath}:`, error.message);
    return false;
  }
}

// Corriger tous les fichiers
let totalFixed = 0;
let totalFiles = 0;

filesToFix.forEach(filePath => {
  totalFiles++;
  if (fixFile(filePath)) {
    totalFixed++;
  }
  console.log('');
});

console.log(`📊 Résumé de la correction:`);
console.log(`  Fichiers traités: ${totalFiles}`);
console.log(`  Fichiers corrigés: ${totalFixed}`);
console.log(`  Fichiers inchangés: ${totalFiles - totalFixed}`);

if (totalFixed > 0) {
  console.log('\n✅ Correction terminée avec succès !');
  console.log('\n🔧 Prochaines étapes:');
  console.log('  1. Vérifier que l\'application compile sans erreur');
  console.log('  2. Tester le nouveau système unifié');
  console.log('  3. Supprimer les anciens composants de test si nécessaire');
} else {
  console.log('\nℹ️  Aucune correction nécessaire.');
} 