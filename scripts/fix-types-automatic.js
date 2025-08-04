#!/usr/bin/env node

/**
 * Script de correction automatique des types any
 * Corrige les patterns les plus sûrs automatiquement
 */

const fs = require('fs');
const path = require('path');

// Patterns de correction automatique (sûrs)
const AUTOMATIC_FIXES = [
  // Error patterns
  {
    pattern: /error: any/g,
    replacement: 'error: unknown',
    description: 'Error types'
  },
  {
    pattern: /catch \(error: any\)/g,
    replacement: 'catch (error: unknown)',
    description: 'Catch error types'
  },
  // Params patterns
  {
    pattern: /params\?: any/g,
    replacement: 'params?: Record<string, string>',
    description: 'Params types'
  },
  // Event patterns
  {
    pattern: /event: any/g,
    replacement: 'event: unknown',
    description: 'Event types'
  },
  {
    pattern: /payload: any/g,
    replacement: 'payload: unknown',
    description: 'Payload types'
  },
  // Data patterns
  {
    pattern: /data: any/g,
    replacement: 'data: unknown',
    description: 'Data types'
  },
  // Generic patterns
  {
    pattern: /\[key: string\]: any/g,
    replacement: '[key: string]: unknown',
    description: 'Index signature types'
  },
  // Args patterns
  {
    pattern: /args: any\[\]/g,
    replacement: 'args: unknown[]',
    description: 'Args array types'
  }
];

// Fichiers à corriger automatiquement
const FILES_TO_FIX = [
  'src/middleware/auth.ts',
  'src/middleware/rateLimit.ts',
  'src/hooks/useRealtime.ts',
  'src/components/chat/ChatSidebar.tsx',
  'src/utils/pagination.ts'
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changes = 0;
    
    AUTOMATIC_FIXES.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changes += matches.length;
      }
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, changes };
    }
    
    return { success: false, changes: 0 };
  } catch (error) {
    console.error(`❌ Erreur lors de la correction de ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🔧 CORRECTION AUTOMATIQUE DES TYPES ANY');
  console.log('=' .repeat(50));
  
  let totalChanges = 0;
  let successCount = 0;
  
  FILES_TO_FIX.forEach((filePath, index) => {
    console.log(`\n[${index + 1}/${FILES_TO_FIX.length}] ${filePath}`);
    
    const result = fixFile(filePath);
    
    if (result.success) {
      console.log(`✅ Corrigé: ${result.changes} changements`);
      totalChanges += result.changes;
      successCount++;
    } else if (result.error) {
      console.log(`❌ Erreur: ${result.error}`);
    } else {
      console.log(`ℹ️  Aucun changement nécessaire`);
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 RÉSULTATS:`);
  console.log(`✅ Fichiers corrigés: ${successCount}/${FILES_TO_FIX.length}`);
  console.log(`🔧 Changements totaux: ${totalChanges}`);
  
  // Vérifier le nombre de 'any' restants
  try {
    const remainingAny = require('child_process').execSync(
      'grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l',
      { encoding: 'utf8' }
    );
    console.log(`📝 Types 'any' restants: ${remainingAny.trim()}`);
  } catch (error) {
    console.log('❌ Impossible de compter les types restants');
  }
  
  console.log('\n✨ Correction automatique terminée !');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, AUTOMATIC_FIXES }; 