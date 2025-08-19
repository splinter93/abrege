#!/usr/bin/env node

/**
 * Script de correction automatique des types any - Phase 2
 * Qualité du Code : Types TypeScript manquants
 */

const fs = require('fs');
const path = require('path');

// Patterns de correction automatique pour la Phase 2
const PHASE2_FIXES = [
  // Types de base
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
  }
];

// Fichiers prioritaires pour la Phase 2
const PHASE2_PRIORITY_FILES = [
  'src/services/supabase.ts',
  'src/services/optimizedApi.ts',
  'src/services/llm/providers/template.ts',
  'src/hooks/useRealtime.ts',
  'src/hooks/useChatStreaming.ts',
  'src/components/chat/ChatSidebar.tsx',
  'src/components/EditorToolbar.tsx',
  'src/middleware/auth.ts',
  'src/middleware/rateLimit.ts',
  'src/utils/pagination.ts',
  'src/app/api/v1/note/[ref]/route.ts',
  'src/app/api/v1/folder/[ref]/route.ts',
  'src/app/api/v1/classeur/[ref]/route.ts'
];

function fixFilePhase2(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Fichier non trouvé' };
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;
    let modified = false;

    // Appliquer toutes les corrections de la Phase 2
    for (const fix of PHASE2_FIXES) {
      if (fix.pattern.test(content)) {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          changes++;
          modified = true;
        }
      }
    }

    // Ajouter l'import des types de qualité si nécessaire
    if (modified && !content.includes('@/types/quality')) {
      const importStatement = "import type { SafeUnknown, SafeRecord, SafeError } from '@/types/quality';\n";
      const firstImportIndex = content.indexOf('import');
      if (firstImportIndex !== -1) {
        const beforeImport = content.substring(0, firstImportIndex);
        const afterImport = content.substring(firstImportIndex);
        content = beforeImport + importStatement + afterImport;
        changes++;
      }
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

function analyzeFilePhase2(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { count: 0, occurrences: [] };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const occurrences = [];

    lines.forEach((line, index) => {
      if (line.includes(': any')) {
        occurrences.push({
          line: index + 1,
          content: line.trim(),
          suggested: line.replace(/: any/g, ': unknown').trim()
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

function main() {
  console.log('🚀 PHASE 2 : CORRECTION AUTOMATIQUE DES TYPES ANY');
  console.log('=' .repeat(60));
  console.log('🎯 Objectif : Éliminer les types any pour la qualité du code');
  console.log('📁 Fichiers prioritaires :', PHASE2_PRIORITY_FILES.length);
  console.log('🔧 Patterns de correction :', PHASE2_FIXES.length);
  console.log('');

  // Analyser les fichiers prioritaires
  console.log('📊 ANALYSE DES FICHIERS PRIORITAIRES');
  console.log('');

  let totalAnyBefore = 0;
  let totalAnyAfter = 0;
  const results = [];

  PHASE2_PRIORITY_FILES.forEach((filePath, index) => {
    console.log(`[${index + 1}/${PHASE2_PRIORITY_FILES.length}] ${filePath}`);
    
    // Analyse avant correction
    const analysisBefore = analyzeFilePhase2(filePath);
    totalAnyBefore += analysisBefore.count;
    
    if (analysisBefore.count > 0) {
      console.log(`  📝 ${analysisBefore.count} types 'any' trouvés`);
      
      // Appliquer les corrections
      const fixResult = fixFilePhase2(filePath);
      
      if (fixResult.success) {
        // Analyse après correction
        const analysisAfter = analyzeFilePhase2(filePath);
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

  // Résumé de la Phase 2
  console.log('=' .repeat(60));
  console.log('📊 RÉSUMÉ DE LA PHASE 2');
  console.log(`📁 Fichiers traités: ${PHASE2_PRIORITY_FILES.length}`);
  console.log(`🔤 Types 'any' avant: ${totalAnyBefore}`);
  console.log(`🔤 Types 'any' après: ${totalAnyAfter}`);
  console.log(`🔧 Changements appliqués: ${totalAnyBefore - totalAnyAfter}`);
  console.log(`📈 Réduction: ${((totalAnyBefore - totalAnyAfter) / totalAnyBefore * 100).toFixed(1)}%`);

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
  console.log('✨ Phase 2 : Correction automatique terminée !');
  console.log('🎯 Prochaine étape : Implémentation de la validation Zod');
}

if (require.main === module) {
  main();
} 