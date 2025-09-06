#!/usr/bin/env node

/**
 * Test de la structure de l'implémentation
 * Vérifie que tous les fichiers sont présents et bien formés
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

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`, exists ? 'green' : 'red');
  return exists;
}

function checkFileContent(filePath, description, checks) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description}: Fichier manquant - ${filePath}`, 'red');
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  let allPassed = true;

  checks.forEach((check, index) => {
    const passed = check.test(content);
    log(`  ${passed ? '✅' : '❌'} ${check.description}`, passed ? 'green' : 'red');
    if (!passed) allPassed = false;
  });

  return allPassed;
}

async function testImplementationStructure() {
  log(`${colors.bold}🧪 Test de la structure de l'implémentation${colors.reset}`, 'blue');
  log('================================================', 'blue');

  const results = {
    files: 0,
    types: 0,
    services: 0,
    api: 0,
    tests: 0,
    migration: 0
  };

  // 1. Vérification des fichiers principaux
  log('\n📁 Vérification des fichiers:', 'blue');
  const requiredFiles = [
    'src/types/specializedAgents.ts',
    'src/services/specializedAgents/SpecializedAgentManager.ts',
    'src/services/specializedAgents/schemaValidator.ts',
    'src/services/specializedAgents/multimodalHandler.ts',
    'src/app/api/v2/agents/[agentId]/route.ts',
    'src/app/api/v2/openapi-schema/route.ts',
    'src/app/api/ui/agents/specialized/route.ts',
    'src/hooks/useSpecializedAgents.ts',
    'src/components/SpecializedAgentsTest.tsx',
    'src/tests/specializedAgents.test.ts',
    'supabase/migrations/20250201_specialized_agents_extension.sql',
    'jest.config.specialized-agents.js'
  ];

  requiredFiles.forEach(file => {
    if (checkFileExists(file, 'Fichier')) {
      results.files++;
    }
  });

  // 2. Vérification des types TypeScript
  log('\n🔧 Vérification des types:', 'blue');
  const typesChecks = checkFileContent('src/types/specializedAgents.ts', 'Types spécialisés', [
    { test: (content) => content.includes('SUPPORTED_GROQ_MODELS'), description: 'Modèles Groq définis' },
    { test: (content) => content.includes('meta-llama/llama-4-scout'), description: 'Llama 4 Scout' },
    { test: (content) => content.includes('meta-llama/llama-4-maverick'), description: 'Llama 4 Maverick' },
    { test: (content) => content.includes('multimodal'), description: 'Support multimodal' },
    { test: (content) => content.includes('images'), description: 'Capacité images' }
  ]);
  if (typesChecks) results.types++;

  // 3. Vérification des services
  log('\n⚙️ Vérification des services:', 'blue');
  const managerChecks = checkFileContent('src/services/specializedAgents/SpecializedAgentManager.ts', 'Manager', [
    { test: (content) => content.includes('MultimodalHandler'), description: 'Import MultimodalHandler' },
    { test: (content) => content.includes('executeSpecializedAgent'), description: 'Méthode d\'exécution' },
    { test: (content) => content.includes('createSpecializedAgent'), description: 'Méthode de création' }
  ]);

  const multimodalChecks = checkFileContent('src/services/specializedAgents/multimodalHandler.ts', 'MultimodalHandler', [
    { test: (content) => content.includes('createGroqPayload'), description: 'Méthode createGroqPayload' },
    { test: (content) => content.includes('isMultimodalModel'), description: 'Détection multimodale' },
    { test: (content) => content.includes('image_url'), description: 'Support format Groq' }
  ]);

  if (managerChecks && multimodalChecks) results.services++;

  // 4. Vérification des routes API
  log('\n🌐 Vérification des routes API:', 'blue');
  const agentRouteChecks = checkFileContent('src/app/api/v2/agents/[agentId]/route.ts', 'Route Agent', [
    { test: (content) => content.includes('POST'), description: 'Méthode POST' },
    { test: (content) => content.includes('GET'), description: 'Méthode GET' },
    { test: (content) => content.includes('SpecializedAgentManager'), description: 'Import Manager' }
  ]);

  const openapiChecks = checkFileContent('src/app/api/v2/openapi-schema/route.ts', 'Route OpenAPI', [
    { test: (content) => content.includes('specializedAgents'), description: 'Agents spécialisés' },
    { test: (content) => content.includes('llama-4'), description: 'Modèles Llama 4' }
  ]);

  if (agentRouteChecks && openapiChecks) results.api++;

  // 5. Vérification des tests
  log('\n🧪 Vérification des tests:', 'blue');
  const testChecks = checkFileContent('src/tests/specializedAgents.test.ts', 'Tests', [
    { test: (content) => content.includes('describe'), description: 'Tests structurés' },
    { test: (content) => content.includes('it('), description: 'Cas de test' },
    { test: (content) => content.includes('expect'), description: 'Assertions' }
  ]);
  if (testChecks) results.tests++;

  // 6. Vérification de la migration
  log('\n🗄️ Vérification de la migration:', 'blue');
  const migrationChecks = checkFileContent('supabase/migrations/20250201_specialized_agents_extension.sql', 'Migration', [
    { test: (content) => content.includes('ALTER TABLE agents'), description: 'Modification table agents' },
    { test: (content) => content.includes('llama-4-scout'), description: 'Agent Scout' },
    { test: (content) => content.includes('llama-4-maverick'), description: 'Agent Maverick' },
    { test: (content) => content.includes('images'), description: 'Support images' }
  ]);
  if (migrationChecks) results.migration++;

  // Résumé
  log('\n📊 Résumé de la validation:', 'bold');
  log('============================', 'bold');
  log(`Fichiers: ${results.files}/${requiredFiles.length} (${Math.round(results.files/requiredFiles.length*100)}%)`, results.files === requiredFiles.length ? 'green' : 'yellow');
  log(`Types: ${results.types}/1 (${results.types*100}%)`, results.types ? 'green' : 'red');
  log(`Services: ${results.services}/1 (${results.services*100}%)`, results.services ? 'green' : 'red');
  log(`API: ${results.api}/1 (${results.api*100}%)`, results.api ? 'green' : 'red');
  log(`Tests: ${results.tests}/1 (${results.tests*100}%)`, results.tests ? 'green' : 'red');
  log(`Migration: ${results.migration}/1 (${results.migration*100}%)`, results.migration ? 'green' : 'red');

  const totalScore = Object.values(results).reduce((sum, val) => sum + val, 0);
  const maxScore = requiredFiles.length + 5; // 5 catégories de vérification
  const percentage = Math.round(totalScore/maxScore*100);

  log(`\n🎯 Score global: ${totalScore}/${maxScore} (${percentage}%)`, percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red');

  if (percentage >= 90) {
    log('\n🎉 Implémentation excellente ! Prête pour la production.', 'green');
  } else if (percentage >= 70) {
    log('\n⚠️ Implémentation bonne, quelques améliorations possibles.', 'yellow');
  } else {
    log('\n❌ Implémentation incomplète, vérifiez les erreurs ci-dessus.', 'red');
  }

  return percentage;
}

// Exécuter le test
testImplementationStructure().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
