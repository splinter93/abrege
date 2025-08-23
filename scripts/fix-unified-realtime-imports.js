#!/usr/bin/env node

/**
 * Script de correction automatique des imports obsolètes
 * Remplace tous les imports de l'ancien système par le nouveau
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction automatique des imports obsolètes...\n');

// Fichiers à corriger
const filesToFix = [
  'src/components/PollingMonitor.tsx',
  'src/components/test/TestPollingSystem.tsx',
  'src/components/test/TestV2NotesCreation.tsx',
  'src/components/test/TestPollingAuth.tsx',
  'src/components/test/TestToolCallSync.tsx',
  'src/components/test/TestEditorRealtime.tsx',
  'src/components/test/TestNoteDeletion.tsx',
  'src/components/test/TestToolCallPolling.tsx',
  'src/components/test/TestPollingFix.tsx'
];

// Règles de remplacement
const replacementRules = [
  {
    from: "import { triggerUnifiedPolling } from '@/services/unifiedPollingService';",
    to: "import { triggerUnifiedRealtimePolling } from '@/services/unifiedRealtimeService';"
  },
  {
    from: "import { getUnifiedPollingStatus } from '@/services/unifiedPollingService';",
    to: "import { getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';"
  },
  {
    from: "import { stopUnifiedPollingService } from '@/services/unifiedPollingService';",
    to: "import { stopUnifiedRealtimeService } from '@/services/unifiedRealtimeService';"
  },
  {
    from: "import { triggerUnifiedPolling, getUnifiedPollingStatus, stopUnifiedPollingService } from '@/services/unifiedPollingService';",
    to: "import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus, stopUnifiedRealtimeService } from '@/services/unifiedRealtimeService';"
  },
  {
    from: "import { triggerUnifiedPolling, getUnifiedPollingStatus } from '@/services/unifiedPollingService';",
    to: "import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';"
  },
  {
    from: "import { startUnifiedPollingSync, stopUnifiedPollingSync, getUnifiedPollingStatus } from '@/services/unifiedPollingService';",
    to: "import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';"
  },
  {
    from: "import { forceUnifiedPollingSync, getUnifiedPollingStatus } from '@/services/unifiedPollingService';",
    to: "import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';"
  }
];

// Règles de remplacement des appels de fonction
const functionReplacementRules = [
  {
    from: 'triggerUnifiedPolling(',
    to: 'triggerUnifiedRealtimePolling('
  },
  {
    from: 'getUnifiedPollingStatus(',
    to: 'getUnifiedRealtimeStatus('
  },
  {
    from: 'stopUnifiedPollingService(',
    to: 'stopUnifiedRealtimeService('
  },
  {
    from: 'startUnifiedPollingSync(',
    to: '// startUnifiedPollingSync - Fonctionnalité supprimée'
  },
  {
    from: 'stopUnifiedPollingSync(',
    to: '// stopUnifiedPollingSync - Fonctionnalité supprimée'
  },
  {
    from: 'forceUnifiedPollingSync(',
    to: '// forceUnifiedPollingSync - Fonctionnalité supprimée'
  }
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Appliquer les règles de remplacement des imports
    replacementRules.forEach(rule => {
      if (content.includes(rule.from)) {
        content = content.replace(new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rule.to);
        modified = true;
        console.log(`  ✅ Import corrigé dans ${filePath}`);
      }
    });

    // Appliquer les règles de remplacement des appels de fonction
    functionReplacementRules.forEach(rule => {
      if (content.includes(rule.from)) {
        content = content.replace(new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rule.to);
        modified = true;
        console.log(`  ✅ Appel de fonction corrigé dans ${filePath}`);
      }
    });

    // Nettoyer les paramètres complexes des appels triggerUnifiedRealtimePolling
    content = content.replace(
      /triggerUnifiedRealtimePolling\([^)]+\)/g,
      (match) => {
        // Extraire entityType et operation des paramètres complexes
        const entityTypeMatch = match.match(/entityType:\s*['"]([^'"]+)['"]/);
        const operationMatch = match.match(/operation:\s*['"]([^'"]+)['"]/);
        
        if (entityTypeMatch && operationMatch) {
          return `triggerUnifiedRealtimePolling('${entityTypeMatch[1]}', '${operationMatch[1]}')`;
        }
        
        return match;
      }
    );

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