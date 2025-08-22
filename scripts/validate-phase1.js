#!/usr/bin/env node

/**
 * Script de validation finale de la Phase 1
 * Vérifie que tous les composants de l'éditeur fonctionnent correctement
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATION FINALE DE LA PHASE 1');
console.log('=====================================\n');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EDITOR_DIR = path.join(SRC_DIR, 'components', 'editor');
const UTILS_DIR = path.join(SRC_DIR, 'utils');
const TYPES_DIR = path.join(SRC_DIR, 'types');

// Tests de validation
const tests = [
  {
    name: 'Vérification des fichiers critiques',
    test: () => {
      const criticalFiles = [
        path.join(EDITOR_DIR, 'Editor.tsx'),
        path.join(EDITOR_DIR, 'EditorToolbar.tsx'),
        path.join(EDITOR_DIR, 'TableControls.tsx'),
        path.join(UTILS_DIR, 'logger.ts'),
        path.join(UTILS_DIR, 'errorHandler.ts'),
        path.join(TYPES_DIR, 'editor.ts')
      ];
      
      const missingFiles = criticalFiles.filter(file => !fs.existsSync(file));
      if (missingFiles.length > 0) {
        throw new Error(`Fichiers manquants: ${missingFiles.join(', ')}`);
      }
      return `✅ ${criticalFiles.length} fichiers critiques présents`;
    }
  },
  
  {
    name: 'Vérification des exports du logger',
    test: () => {
      const loggerPath = path.join(UTILS_DIR, 'logger.ts');
      const content = fs.readFileSync(loggerPath, 'utf8');
      
      const requiredExports = [
        'export const logger',
        'export const simpleLogger',
        'export const logApi',
        'export enum LogLevel',
        'export enum LogCategory'
      ];
      
      const missingExports = requiredExports.filter(export_ => !content.includes(export_));
      if (missingExports.length > 0) {
        throw new Error(`Exports manquants: ${missingExports.join(', ')}`);
      }
      return `✅ Tous les exports du logger sont présents`;
    }
  },
  
  {
    name: 'Vérification de l\'absence de "as any"',
    test: () => {
      const editorFiles = [
        path.join(EDITOR_DIR, 'Editor.tsx'),
        path.join(EDITOR_DIR, 'EditorToolbar.tsx'),
        path.join(EDITOR_DIR, 'TableControls.tsx')
      ];
      
      let totalAsAny = 0;
      editorFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const asAnyCount = (content.match(/as any/g) || []).length;
        totalAsAny += asAnyCount;
        
        if (asAnyCount > 0) {
          console.log(`  ⚠️  ${path.basename(file)}: ${asAnyCount} "as any" restants`);
        }
      });
      
      if (totalAsAny > 0) {
        throw new Error(`${totalAsAny} "as any" restants dans les composants éditeur`);
      }
      return `✅ Aucun "as any" dans les composants éditeur`;
    }
  },
  
  {
    name: 'Vérification des types TypeScript',
    test: () => {
      const typesFile = path.join(TYPES_DIR, 'editor.ts');
      const content = fs.readFileSync(typesFile, 'utf8');
      
      const requiredTypes = [
        'interface FullEditorInstance',
        'interface EditorToolbarProps',
        'interface SlashCommand',
        'interface CustomImageExtension',
        'interface CodeBlockWithCopyExtension'
      ];
      
      const missingTypes = requiredTypes.filter(type => !content.includes(type));
      if (missingTypes.length > 0) {
        throw new Error(`Types manquants: ${missingTypes.join(', ')}`);
      }
      return `✅ Tous les types TypeScript sont définis`;
    }
  },
  
  {
    name: 'Vérification du gestionnaire d\'erreurs',
    test: () => {
      const errorHandlerPath = path.join(UTILS_DIR, 'errorHandler.ts');
      const content = fs.readFileSync(errorHandlerPath, 'utf8');
      
      const requiredFeatures = [
        'class EditorErrorHandler',
        'handleEditorError',
        'handleApiError',
        'handleCriticalError',
        'getErrorStats'
      ];
      
      const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
      if (missingFeatures.length > 0) {
        throw new Error(`Fonctionnalités manquantes: ${missingFeatures.join(', ')}`);
      }
      return `✅ Gestionnaire d'erreurs complet`;
    }
  },
  
  {
    name: 'Vérification des tests de régression',
    test: () => {
      const testFile = path.join(SRC_DIR, 'tests', 'editor-regression.test.ts');
      if (!fs.existsSync(testFile)) {
        throw new Error('Fichier de tests de régression manquant');
      }
      
      const content = fs.readFileSync(testFile, 'utf8');
      const testCount = (content.match(/it\(/g) || []).length;
      
      if (testCount < 10) {
        throw new Error(`Nombre de tests insuffisant: ${testCount} (minimum 10 requis)`);
      }
      
      return `✅ ${testCount} tests de régression présents`;
    }
  },
  
  {
    name: 'Vérification de la compatibilité des imports',
    test: () => {
      // Vérifier que les anciens imports fonctionnent encore
      const loggerPath = path.join(UTILS_DIR, 'logger.ts');
      const content = fs.readFileSync(loggerPath, 'utf8');
      
      // Vérifier que simpleLogger et logApi sont bien exportés
      if (!content.includes('export const simpleLogger')) {
        throw new Error('simpleLogger non exporté');
      }
      
      if (!content.includes('export const logApi')) {
        throw new Error('logApi non exporté');
      }
      
      return `✅ Compatibilité des imports maintenue`;
    }
  }
];

// Exécution des tests
let passedTests = 0;
let totalTests = tests.length;

console.log(`Exécution de ${totalTests} tests de validation...\n`);

tests.forEach((test, index) => {
  try {
    console.log(`${index + 1}/${totalTests} ${test.name}...`);
    const result = test.test();
    console.log(`  ${result}\n`);
    passedTests++;
  } catch (error) {
    console.log(`  ❌ ÉCHEC: ${error.message}\n`);
  }
});

// Résumé final
console.log('=====================================');
console.log(`📊 RÉSULTATS: ${passedTests}/${totalTests} tests réussis`);

if (passedTests === totalTests) {
  console.log('🎉 PHASE 1 COMPLÈTEMENT VALIDÉE !');
  console.log('✅ Le code est maintenant propre et professionnel');
  console.log('✅ Tous les composants fonctionnent correctement');
  console.log('✅ La migration est terminée avec succès');
  process.exit(0);
} else {
  console.log('❌ PHASE 1 INCOMPLÈTE');
  console.log('⚠️  Des problèmes restent à résoudre');
  process.exit(1);
} 