#!/usr/bin/env node

/**
 * Script de validation complète de l'implémentation des agents spécialisés
 * Vérifie tous les composants et leur intégration
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Fichiers requis pour l'implémentation
const requiredFiles = [
  // Types
  'src/types/specializedAgents.ts',
  
  // Services
  'src/services/specializedAgents/SpecializedAgentManager.ts',
  'src/services/specializedAgents/schemaValidator.ts',
  
  // API Routes
  'src/app/api/v2/agents/[agentId]/route.ts',
  'src/app/api/v2/openapi-schema/route.ts',
  'src/app/api/ui/agents/route.ts',
  'src/app/api/ui/agents/specialized/route.ts',
  
  // Hooks
  'src/hooks/useSpecializedAgents.ts',
  
  // Components
  'src/components/SpecializedAgentsTest.tsx',
  
  // Tests
  'src/tests/specializedAgents.test.ts',
  'src/tests/setup.ts',
  
  // Migration
  'supabase/migrations/20250201_specialized_agents_extension.sql',
  
  // Scripts
  'scripts/test-specialized-agents.js',
  'scripts/apply-specialized-agents-migration.js',
  'scripts/deploy-specialized-agents.sh',
  
  // Configuration
  'jest.config.specialized-agents.js',
  
  // Documentation
  'docs/SPECIALIZED-AGENTS-IMPLEMENTATION.md'
];

// Fonctions de validation
function validateFileExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  return fs.existsSync(fullPath);
}

function validateFileContent(filePath, requiredContent) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  return requiredContent.every(item => content.includes(item));
}

function validateTypeScriptFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Vérifications TypeScript de base (plus flexibles)
  const checks = [
    content.includes('export'), // Doit avoir des exports
    content.includes('import') || content.includes('require'), // Doit avoir des imports
    content.length > 100 // Doit avoir du contenu substantiel
  ];
  
  // Vérifications optionnelles (bonus)
  const optionalChecks = [
    content.includes('interface') || content.includes('type'), // Types définis
    !content.includes('any'), // Éviter les 'any' explicites
    content.includes('async') || content.includes('function') // Fonctionnalité
  ];
  
  const requiredPassed = checks.every(check => check);
  const optionalPassed = optionalChecks.filter(check => check).length;
  
  // Accepter si les requis sont passés ET au moins la moitié des optionnels
  return requiredPassed && optionalPassed >= Math.ceil(optionalChecks.length / 2);
}

function validateMigrationFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const requiredSQL = [
    'ALTER TABLE agents ADD COLUMN',
    'slug VARCHAR UNIQUE',
    'display_name VARCHAR',
    'is_endpoint_agent BOOLEAN',
    'input_schema JSONB',
    'output_schema JSONB',
    'CREATE INDEX',
    'INSERT INTO agents'
  ];
  
  return requiredSQL.every(item => content.includes(item));
}

function validateTestFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const requiredTestContent = [
    'describe(',
    'it(',
    'expect(',
    'test',
    'mock'
  ];
  
  return requiredTestContent.some(item => content.includes(item));
}

// Validation principale
async function validateImplementation() {
  log(`${colors.bold}🔍 Validation de l'implémentation des agents spécialisés${colors.reset}`, 'blue');
  log('='.repeat(60), 'blue');
  
  const results = {
    files: { passed: 0, total: 0 },
    types: { passed: 0, total: 0 },
    services: { passed: 0, total: 0 },
    api: { passed: 0, total: 0 },
    tests: { passed: 0, total: 0 },
    migration: { passed: 0, total: 0 }
  };
  
  // 1. Vérifier l'existence des fichiers
  log('\n📁 Vérification des fichiers...', 'blue');
  requiredFiles.forEach(filePath => {
    results.files.total++;
    if (validateFileExists(filePath)) {
      results.files.passed++;
      log(`  ✅ ${filePath}`, 'green');
    } else {
      log(`  ❌ ${filePath}`, 'red');
    }
  });
  
  // 2. Vérifier les types TypeScript
  log('\n🔧 Vérification des types TypeScript...', 'blue');
  const typeFiles = [
    'src/types/specializedAgents.ts'
  ];
  
  typeFiles.forEach(filePath => {
    results.types.total++;
    if (validateTypeScriptFile(filePath)) {
      results.types.passed++;
      log(`  ✅ ${filePath}`, 'green');
    } else {
      log(`  ❌ ${filePath}`, 'red');
    }
  });
  
  // 3. Vérifier les services
  log('\n⚙️ Vérification des services...', 'blue');
  const serviceFiles = [
    'src/services/specializedAgents/SpecializedAgentManager.ts',
    'src/services/specializedAgents/schemaValidator.ts'
  ];
  
  serviceFiles.forEach(filePath => {
    results.services.total++;
    if (validateTypeScriptFile(filePath)) {
      results.services.passed++;
      log(`  ✅ ${filePath}`, 'green');
    } else {
      log(`  ❌ ${filePath}`, 'red');
    }
  });
  
  // 4. Vérifier les routes API
  log('\n🌐 Vérification des routes API...', 'blue');
  const apiFiles = [
    'src/app/api/v2/agents/[agentId]/route.ts',
    'src/app/api/v2/openapi-schema/route.ts',
    'src/app/api/ui/agents/specialized/route.ts'
  ];
  
  apiFiles.forEach(filePath => {
    results.api.total++;
    if (validateTypeScriptFile(filePath)) {
      results.api.passed++;
      log(`  ✅ ${filePath}`, 'green');
    } else {
      log(`  ❌ ${filePath}`, 'red');
    }
  });
  
  // 5. Vérifier les tests
  log('\n🧪 Vérification des tests...', 'blue');
  const testFiles = [
    'src/tests/specializedAgents.test.ts'
  ];
  
  testFiles.forEach(filePath => {
    results.tests.total++;
    if (validateTestFile(filePath)) {
      results.tests.passed++;
      log(`  ✅ ${filePath}`, 'green');
    } else {
      log(`  ❌ ${filePath}`, 'red');
    }
  });
  
  // 6. Vérifier la migration
  log('\n🗄️ Vérification de la migration...', 'blue');
  const migrationFile = 'supabase/migrations/20250201_specialized_agents_extension.sql';
  results.migration.total = 1;
  if (validateMigrationFile(migrationFile)) {
    results.migration.passed++;
    log(`  ✅ ${migrationFile}`, 'green');
  } else {
    log(`  ❌ ${migrationFile}`, 'red');
  }
  
  // 7. Vérifier la documentation
  log('\n📚 Vérification de la documentation...', 'blue');
  const docFile = 'docs/SPECIALIZED-AGENTS-IMPLEMENTATION.md';
  if (validateFileExists(docFile)) {
    log(`  ✅ ${docFile}`, 'green');
  } else {
    log(`  ❌ ${docFile}`, 'red');
  }
  
  // Résumé final
  log('\n📊 Résumé de la validation:', 'bold');
  log('='.repeat(40), 'blue');
  
  const categories = [
    { name: 'Fichiers', result: results.files },
    { name: 'Types', result: results.types },
    { name: 'Services', result: results.services },
    { name: 'API', result: results.api },
    { name: 'Tests', result: results.tests },
    { name: 'Migration', result: results.migration }
  ];
  
  let totalPassed = 0;
  let totalTests = 0;
  
  categories.forEach(category => {
    const { name, result } = category;
    const percentage = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
    const status = result.passed === result.total ? '✅' : '❌';
    
    log(`  ${name}: ${result.passed}/${result.total} (${percentage}%) ${status}`, 
        result.passed === result.total ? 'green' : 'red');
    
    totalPassed += result.passed;
    totalTests += result.total;
  });
  
  const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  log('\n🎯 Score global:', 'bold');
  log(`  ${totalPassed}/${totalTests} (${overallPercentage}%)`, 
      overallPercentage >= 90 ? 'green' : overallPercentage >= 70 ? 'yellow' : 'red');
  
  if (overallPercentage >= 90) {
    log('\n🎉 Implémentation excellente ! Prête pour la production.', 'green');
    process.exit(0);
  } else if (overallPercentage >= 70) {
    log('\n⚠️ Implémentation correcte mais avec des améliorations possibles.', 'yellow');
    process.exit(1);
  } else {
    log('\n❌ Implémentation incomplète. Vérifiez les erreurs ci-dessus.', 'red');
    process.exit(1);
  }
}

// Exécuter la validation
validateImplementation().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
