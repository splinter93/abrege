#!/usr/bin/env node

/**
 * 🧪 Script de Test du Système Realtime Unifié
 * 
 * Script pour tester et valider le fonctionnement du nouveau système Realtime unifié
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Démarrage des tests du système Realtime unifié...\n');

// Configuration des tests
const testConfig = {
  userId: 'test-user-123',
  noteId: 'test-note-456',
  timeout: 30000 // 30 secondes
};

// Fonction pour exécuter un test
function runTest(testName, testFunction) {
  console.log(`\n🔍 Test: ${testName}`);
  console.log('─'.repeat(50));
  
  try {
    const startTime = Date.now();
    const result = testFunction();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ ${testName} - RÉUSSI (${duration}ms)`);
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   ${value ? '✅' : '❌'} ${key}`);
        });
      }
      if (result.stats) {
        console.log(`   📊 Canaux: ${result.stats.channelsCount}, Uptime: ${Math.floor(result.stats.uptime / 1000)}s`);
      }
    } else {
      console.log(`❌ ${testName} - ÉCHOUÉ`);
      if (result.error) {
        console.log(`   Erreur: ${result.error}`);
      }
    }
    
    return result;
  } catch (error) {
    console.log(`❌ ${testName} - ERREUR`);
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 1: Vérification des fichiers
function testFileStructure() {
  const requiredFiles = [
    'src/services/UnifiedRealtimeService.ts',
    'src/hooks/useUnifiedRealtime.ts',
    'src/components/UnifiedRealtimeDebug.tsx',
    'src/components/RealtimeMigration.tsx',
    'src/utils/testUnifiedRealtime.ts'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  return {
    success: missingFiles.length === 0,
    error: missingFiles.length > 0 ? `Fichiers manquants: ${missingFiles.join(', ')}` : undefined,
    details: {
      'UnifiedRealtimeService': fs.existsSync('src/services/UnifiedRealtimeService.ts'),
      'useUnifiedRealtime': fs.existsSync('src/hooks/useUnifiedRealtime.ts'),
      'UnifiedRealtimeDebug': fs.existsSync('src/components/UnifiedRealtimeDebug.tsx'),
      'RealtimeMigration': fs.existsSync('src/components/RealtimeMigration.tsx'),
      'testUnifiedRealtime': fs.existsSync('src/utils/testUnifiedRealtime.ts')
    }
  };
}

// Test 2: Vérification de la compilation TypeScript
function testTypeScriptCompilation() {
  try {
    execSync('npx tsc --noEmit --project tsconfig.json', { 
      stdio: 'pipe',
      timeout: testConfig.timeout 
    });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Erreur de compilation TypeScript: ${error.message}` 
    };
  }
}

// Test 3: Vérification des imports
function testImports() {
  const filesToCheck = [
    'src/components/editor/Editor.tsx',
    'src/components/UnifiedRealtimeDebug.tsx',
    'src/components/RealtimeMigration.tsx'
  ];

  const results = {};
  let hasErrors = false;

  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Vérifier les imports problématiques
      const problematicImports = [
        'RealtimeEditorService',
        'DatabaseRealtimeService',
        'useRealtimeEditor',
        'useDatabaseRealtime',
        'RealtimeEditorManager',
        'RealtimeEditorDebug'
      ];

      const foundImports = problematicImports.filter(imp => content.includes(imp));
      
      if (foundImports.length > 0) {
        results[file] = false;
        hasErrors = true;
        console.log(`   ⚠️  ${file}: Imports obsolètes trouvés: ${foundImports.join(', ')}`);
      } else {
        results[file] = true;
      }
    }
  });

  return {
    success: !hasErrors,
    error: hasErrors ? 'Imports obsolètes détectés' : undefined,
    details: results
  };
}

// Test 4: Vérification de la configuration Supabase
function testSupabaseConfig() {
  const envFile = '.env.local';
  const envExample = 'env.example';
  
  let hasConfig = false;
  let configDetails = {};

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    hasConfig = envContent.includes('NEXT_PUBLIC_SUPABASE_URL') && 
                envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    configDetails = {
      'env.local exists': true,
      'SUPABASE_URL set': envContent.includes('NEXT_PUBLIC_SUPABASE_URL'),
      'SUPABASE_KEY set': envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    };
  } else if (fs.existsSync(envExample)) {
    configDetails = {
      'env.local exists': false,
      'env.example exists': true,
      'needs setup': true
    };
  } else {
    configDetails = {
      'env.local exists': false,
      'env.example exists': false,
      'needs setup': true
    };
  }

  return {
    success: hasConfig,
    error: !hasConfig ? 'Configuration Supabase manquante' : undefined,
    details: configDetails
  };
}

// Test 5: Vérification des dépendances
function testDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['@supabase/supabase-js'];
    
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );

    return {
      success: missingDeps.length === 0,
      error: missingDeps.length > 0 ? `Dépendances manquantes: ${missingDeps.join(', ')}` : undefined,
      details: {
        'supabase-js': !missingDeps.includes('@supabase/supabase-js')
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lecture package.json: ${error.message}`
    };
  }
}

// Test 6: Vérification de la syntaxe des nouveaux fichiers
function testSyntaxValidation() {
  const filesToCheck = [
    'src/services/UnifiedRealtimeService.ts',
    'src/hooks/useUnifiedRealtime.ts',
    'src/components/UnifiedRealtimeDebug.tsx'
  ];

  const results = {};
  let hasErrors = false;

  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        // Vérification basique de la syntaxe
        const content = fs.readFileSync(file, 'utf8');
        
        // Vérifier les patterns problématiques
        const problematicPatterns = [
          /import.*from.*['"]@\/.*['"];?\s*$/gm, // Imports mal formés
          /export.*{.*}.*from.*['"]@\/.*['"];?\s*$/gm, // Exports mal formés
          /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}\s*$/gm // Fonctions mal formées
        ];

        const hasProblems = problematicPatterns.some(pattern => {
          const matches = content.match(pattern);
          return matches && matches.some(match => 
            match.includes('undefined') || 
            match.includes('null') ||
            match.trim().endsWith(';') === false
          );
        });

        if (hasProblems) {
          results[file] = false;
          hasErrors = true;
        } else {
          results[file] = true;
        }
      } catch (error) {
        results[file] = false;
        hasErrors = true;
        console.log(`   ⚠️  ${file}: Erreur de lecture - ${error.message}`);
      }
    }
  });

  return {
    success: !hasErrors,
    error: hasErrors ? 'Erreurs de syntaxe détectées' : undefined,
    details: results
  };
}

// Exécution de tous les tests
async function runAllTests() {
  const tests = [
    { name: 'Structure des fichiers', fn: testFileStructure },
    { name: 'Compilation TypeScript', fn: testTypeScriptCompilation },
    { name: 'Imports et dépendances', fn: testImports },
    { name: 'Configuration Supabase', fn: testSupabaseConfig },
    { name: 'Dépendances NPM', fn: testDependencies },
    { name: 'Validation syntaxe', fn: testSyntaxValidation }
  ];

  const results = [];
  let passedTests = 0;

  console.log('🚀 Exécution des tests...\n');

  for (const test of tests) {
    const result = runTest(test.name, test.fn);
    results.push({ name: test.name, ...result });
    
    if (result.success) {
      passedTests++;
    }
  }

  // Résumé des résultats
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests réussis: ${passedTests}/${tests.length}`);
  console.log(`❌ Tests échoués: ${tests.length - passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 Tous les tests sont passés ! Le système Realtime unifié est prêt.');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Démarrer l\'application: npm run dev');
    console.log('2. Tester la connexion Realtime dans l\'éditeur');
    console.log('3. Vérifier les logs de debug en mode développement');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
    console.log('\n🔧 Actions recommandées:');
    results.forEach(result => {
      if (!result.success) {
        console.log(`- ${result.name}: ${result.error || 'Vérifier manuellement'}`);
      }
    });
  }

  // Créer un rapport de test
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passedTests,
    failedTests: tests.length - passedTests,
    results: results.map(r => ({
      name: r.name,
      success: r.success,
      error: r.error,
      details: r.details
    }))
  };

  const reportPath = 'TEST-UNIFIED-REALTIME-REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Rapport de test créé: ${reportPath}`);

  return passedTests === tests.length;
}

// Exécuter les tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Erreur lors de l\'exécution des tests:', error);
  process.exit(1);
});
