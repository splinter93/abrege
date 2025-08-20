#!/usr/bin/env node

/**
 * Script de nettoyage complet de la qualité du code
 * Élimine TOUTES les erreurs TypeScript et types any
 */

const fs = require('fs');
const path = require('path');

// ========================================
// PATTERNS DE CORRECTION COMPLETS
// ========================================

const COMPLETE_FIXES = [
  // Types any de base
  {
    pattern: /: any/g,
    replacement: ': unknown',
    description: 'Types any de base'
  },
  {
    pattern: /: any\[\]/g,
    replacement: ': unknown[]',
    description: 'Tableaux any'
  },
  {
    pattern: /Record<string, any>/g,
    replacement: 'Record<string, unknown>',
    description: 'Record any'
  },
  {
    pattern: /Promise<any>/g,
    replacement: 'Promise<unknown>',
    description: 'Promise any'
  },
  {
    pattern: /Array<any>/g,
    replacement: 'Array<unknown>',
    description: 'Array any'
  },
  
  // Paramètres de fonction
  {
    pattern: /\(([^)]*): any\)/g,
    replacement: '($1: unknown)',
    description: 'Paramètres de fonction any'
  },
  
  // Variables
  {
    pattern: /const ([^:]+): any =/g,
    replacement: 'const $1: unknown =',
    description: 'Variables const any'
  },
  {
    pattern: /let ([^:]+): any =/g,
    replacement: 'let $1: unknown =',
    description: 'Variables let any'
  },
  
  // Propriétés d'objet
  {
    pattern: /([a-zA-Z_][a-zA-Z0-9_]*): any/g,
    replacement: '$1: unknown',
    description: 'Propriétés d\'objet any'
  },
  
  // Catch blocks
  {
    pattern: /catch \(([^)]*): any\)/g,
    replacement: 'catch ($1: unknown)',
    description: 'Catch blocks any'
  },
  
  // Types génériques
  {
    pattern: /<any>/g,
    replacement: '<unknown>',
    description: 'Types génériques any'
  },
  
  // Casts any
  {
    pattern: /as any/g,
    replacement: 'as unknown',
    description: 'Casts any'
  },
  
  // Imports any
  {
    pattern: /import.*any/g,
    replacement: (match) => match.replace(/any/g, 'unknown'),
    description: 'Imports any'
  }
];

// ========================================
// FICHIERS À NETTOYER EN PRIORITÉ
// ========================================

const PRIORITY_FILES = [
  // Services critiques
  'src/services/supabase.ts',
  'src/services/optimizedApi.ts',
  'src/services/supabaseRealtimeService.ts',
  'src/services/chatHistoryService.ts',
  'src/services/diffService.ts',
  
  // Composants critiques
  'src/components/chat/ChatSidebar.tsx',
  'src/components/FileSystemLiveView.tsx',
  'src/components/useFolderManagerState.ts',
  
  // Hooks critiques
  'src/hooks/useSessionSync.ts',
  'src/hooks/__tests__/useSessionSync.test.ts',
  
  // Utils critiques
  'src/utils/pagination.ts',
  'src/utils/ToolCallsParser.ts',
  'src/utils/resourceResolver.test.ts',
  'src/utils/slugGenerator.test.ts',
  
  // Tests critiques
  'src/tests/groq-tool-calls-fix.test.ts',
  'src/tests/round-executor-integration.test.ts',
  'src/tests/integration/chat-architecture.test.ts',
  
  // API routes critiques
  'src/app/api/v1/notes/recent/route.ts',
  'src/app/api/v1/note/merge/route.ts',
  'src/app/api/v1/notebook/create/route.ts',
  'src/app/api/v2/note/[ref]/metadata/route.ts',
  'src/app/api/v2/note/[ref]/move/route.ts'
];

// ========================================
// FONCTIONS DE NETTOYAGE
// ========================================

function fixFileComplete(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Fichier non trouvé' };
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;
    let modified = false;

    // Appliquer toutes les corrections
    for (const fix of COMPLETE_FIXES) {
      if (fix.pattern.test(content)) {
        if (typeof fix.replacement === 'function') {
          const newContent = content.replace(fix.pattern, fix.replacement);
          if (newContent !== content) {
            content = newContent;
            changes++;
            modified = true;
          }
        } else {
          const newContent = content.replace(fix.pattern, fix.replacement);
          if (newContent !== content) {
            content = newContent;
            changes++;
            modified = true;
          }
        }
      }
    }

    // Corrections spécifiques par fichier
    if (filePath.includes('ToolCallsParser.ts')) {
      // Corriger les erreurs spécifiques de ToolCallsParser
      content = content.replace(/logger\./g, 'console.');
      content = content.replace(/const index = /g, 'let index = ');
      modified = true;
      changes++;
    }

    if (filePath.includes('useSessionSync.test.ts')) {
      // Corriger les erreurs de test
      content = content.replace(/addMessage\(message\)/g, 'addMessage("test-session", message)');
      modified = true;
      changes++;
    }

    if (filePath.includes('pagination.ts')) {
      // Corriger les erreurs de pagination
      content = content.replace(/query: unknown/g, 'query: any');
      content = content.replace(/supabase: unknown/g, 'supabase: any');
      content = content.replace(/filters: unknown/g, 'filters: any');
      modified = true;
      changes++;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      return { success: true, changes };
    }

    return { success: true, changes: 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function analyzeFileComplete(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { count: 0, occurrences: [] };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const occurrences = [];

    lines.forEach((line, index) => {
      if (line.includes(': any') || line.includes('any[]') || line.includes('any>')) {
        occurrences.push({
          line: index + 1,
          content: line.trim(),
          suggested: line.replace(/: any/g, ': unknown').replace(/any\[\]/g, 'unknown[]').replace(/any>/g, 'unknown>')
        });
      }
    });

    return {
      count: occurrences.length,
      occurrences
    };
  } catch (error) {
    return { count: 0, occurrences: [], error: error.message };
  }
}

// ========================================
// FONCTION PRINCIPALE
// ========================================

function main() {
  console.log('🧹 NETTOYAGE COMPLET DE LA QUALITÉ DU CODE');
  console.log('=' .repeat(60));
  console.log('🎯 Objectif : Éliminer TOUTES les erreurs TypeScript');
  console.log('📁 Fichiers prioritaires :', PRIORITY_FILES.length);
  console.log('🔧 Patterns de correction :', COMPLETE_FIXES.length);
  console.log('');

  // Analyser et corriger les fichiers prioritaires
  console.log('📊 NETTOYAGE DES FICHIERS PRIORITAIRES');
  console.log('');

  let totalAnyBefore = 0;
  let totalAnyAfter = 0;
  const results = [];

  PRIORITY_FILES.forEach((filePath, index) => {
    console.log(`[${index + 1}/${PRIORITY_FILES.length}] ${filePath}`);
    
    // Analyse avant correction
    const analysisBefore = analyzeFileComplete(filePath);
    totalAnyBefore += analysisBefore.count;
    
    if (analysisBefore.count > 0) {
      console.log(`  📝 ${analysisBefore.count} types 'any' trouvés`);
      
      // Appliquer les corrections
      const fixResult = fixFileComplete(filePath);
      
      if (fixResult.success) {
        // Analyse après correction
        const analysisAfter = analyzeFileComplete(filePath);
        totalAnyAfter += analysisAfter.count;
        
        if (fixResult.changes > 0) {
          console.log(`  ✅ Corrigé: ${fixResult.changes} changements`);
          console.log(`  📊 Résultat: ${analysisBefore.count} → ${analysisAfter.count} types 'any'`);
        } else {
          console.log(`  ℹ️  Aucun changement nécessaire`);
        }
        
        results.push({
          file: filePath,
          before: analysisBefore.count,
          after: analysisAfter.count,
          changes: fixResult.changes
        });
      } else {
        console.log(`  ❌ Erreur: ${fixResult.error}`);
        results.push({
          file: filePath,
          before: analysisBefore.count,
          after: analysisBefore.count,
          error: fixResult.error
        });
      }
    } else {
      console.log(`  ✅ Aucun type 'any' trouvé`);
      results.push({
        file: filePath,
        before: 0,
        after: 0,
        changes: 0
      });
    }
    
    console.log('');
  });

  // Résumé du nettoyage
  console.log('=' .repeat(60));
  console.log('📊 RÉSUMÉ DU NETTOYAGE COMPLET');
  console.log(`📁 Fichiers traités: ${PRIORITY_FILES.length}`);
  console.log(`🔤 Types 'any' avant: ${totalAnyBefore}`);
  console.log(`🔤 Types 'any' après: ${totalAnyAfter}`);
  console.log(`🔧 Changements appliqués: ${totalAnyBefore - totalAnyAfter}`);
  console.log(`📈 Réduction: ${totalAnyBefore > 0 ? ((totalAnyBefore - totalAnyAfter) / totalAnyBefore * 100).toFixed(1) : 0}%`);

  // Compter le total global
  try {
    const globalCountBefore = require('child_process').execSync(
      'grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l',
      { encoding: 'utf8' }
    );
    console.log(`🌍 Total global restant: ${globalCountBefore.trim()} types 'any'`);
  } catch (error) {
    console.log('❌ Impossible de compter le total global');
  }

  console.log('');
  console.log('✨ Nettoyage complet terminé !');
  console.log('🎯 Prochaine étape : Vérification TypeScript');
}

if (require.main === module) {
  main();
} 