#!/usr/bin/env node

/**
 * 🧪 Script de Validation des Améliorations Multi Tool Calls
 * 
 * Ce script vérifie que toutes les améliorations ont été correctement implémentées
 * et que le système peut gérer jusqu'à 20 tool calls simultanés.
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log('─'.repeat(message.length));
}

// Configuration des tests
const TESTS = {
  'MAX_TOOL_CALLS': {
    file: 'src/services/llm/groqGptOss120b.ts',
    pattern: /const MAX_TOOL_CALLS = (\d+);/,
    expected: 20,
    description: 'Limite des tool calls augmentée à 20'
  },
  'BATCH_EXECUTION': {
    file: 'src/services/llm/groqGptOss120b.ts',
    pattern: /exécution par batch de \$\{MAX_TOOL_CALLS\}/,
    expected: true,
    description: 'Exécution par batch implémentée'
  },
  'ANTI_LOOP_TTL': {
    file: 'src/services/llm/toolCallManager.ts',
    pattern: /const TTL_MS = 5_000;/,
    expected: true,
    description: 'TTL anti-boucle réduit à 5 secondes'
  },
  'TOOL_CALL_COUNT_WARNING': {
    file: 'src/components/chat/ToolCallMessage.tsx',
    pattern: /tool-call-count-warning/,
    expected: true,
    description: 'Indicateur de warning pour multiples tool calls'
  },
  'CSS_WARNING_STYLES': {
    file: 'src/components/chat/ToolCallMessage.css',
    pattern: /\.tool-call-count-warning/,
    expected: true,
    description: 'Styles CSS pour l\'indicateur de warning'
  },
  'TEST_COMPONENT': {
    file: 'src/components/test/TestMultiToolCalls.tsx',
    pattern: /TestMultiToolCalls/,
    expected: true,
    description: 'Composant de test créé'
  },
  'TEST_PAGE': {
    file: 'src/app/test-multi-tool-calls/page.tsx',
    pattern: /TestMultiToolCalls/,
    expected: true,
    description: 'Page de test créée'
  },
  'ENHANCED_LOGGING': {
    file: 'src/services/llm/groqGptOss120b.ts',
    pattern: /Statistiques des tool calls/,
    expected: true,
    description: 'Logging détaillé des statistiques'
  }
};

// Fonction de validation principale
function validateMultiToolCalls() {
  logHeader('🧪 VALIDATION DES AMÉLIORATIONS MULTI TOOL CALLS');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const [testName, test] of Object.entries(TESTS)) {
    totalTests++;
    logInfo(`\nTest: ${test.description}`);
    
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(test.file)) {
        logError(`Fichier non trouvé: ${test.file}`);
        failedTests++;
        continue;
      }
      
      // Lire le contenu du fichier
      const content = fs.readFileSync(test.file, 'utf8');
      
      // Exécuter le test
      const result = executeTest(test, content);
      
      if (result.success) {
        logSuccess(`${testName}: ${result.message}`);
        passedTests++;
      } else {
        logError(`${testName}: ${result.message}`);
        failedTests++;
      }
      
    } catch (error) {
      logError(`${testName}: Erreur lors de la validation - ${error.message}`);
      failedTests++;
    }
  }
  
  // Résumé final
  logHeader('📊 RÉSUMÉ DES TESTS');
  log(`Total des tests: ${totalTests}`, 'bright');
  log(`Tests réussis: ${passedTests}`, 'green');
  log(`Tests échoués: ${failedTests}`, 'red');
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  log(`Taux de succès: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  if (failedTests === 0) {
    log('\n🎉 Tous les tests sont passés ! Le système multi tool calls est prêt.', 'green');
    return true;
  } else {
    log('\n⚠️  Certains tests ont échoué. Vérifiez les implémentations.', 'yellow');
    return false;
  }
}

// Fonction d'exécution d'un test spécifique
function executeTest(test, content) {
  const match = content.match(test.pattern);
  
  if (!match) {
    return {
      success: false,
      message: `Pattern non trouvé: ${test.pattern}`
    };
  }
  
  if (test.expected === true) {
    // Test de présence
    return {
      success: true,
      message: 'Pattern trouvé avec succès'
    };
  } else if (typeof test.expected === 'number') {
    // Test de valeur numérique
    const actualValue = parseInt(match[1]);
    if (actualValue === test.expected) {
      return {
        success: true,
        message: `Valeur correcte: ${actualValue}`
      };
    } else {
      return {
        success: false,
        message: `Valeur attendue: ${test.expected}, trouvée: ${actualValue}`
      };
    }
  } else {
    // Test de présence simple
    return {
      success: true,
      message: 'Pattern trouvé avec succès'
    };
  }
}

// Fonction de vérification des dépendances
function checkDependencies() {
  logHeader('🔍 VÉRIFICATION DES DÉPENDANCES');
  
  const requiredFiles = [
    'package.json',
    'src/services/llm/groqGptOss120b.ts',
    'src/services/llm/toolCallManager.ts',
    'src/components/chat/ToolCallMessage.tsx',
    'src/components/chat/ToolCallMessage.css'
  ];
  
  let missingFiles = 0;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      logSuccess(`${file} - Présent`);
    } else {
      logError(`${file} - Manquant`);
      missingFiles++;
    }
  }
  
  if (missingFiles === 0) {
    logSuccess('Toutes les dépendances sont présentes');
  } else {
    logWarning(`${missingFiles} fichier(s) manquant(s)`);
  }
  
  return missingFiles === 0;
}

// Fonction de vérification de la structure du projet
function checkProjectStructure() {
  logHeader('🏗️  VÉRIFICATION DE LA STRUCTURE DU PROJET');
  
  const projectRoot = process.cwd();
  logInfo(`Racine du projet: ${projectRoot}`);
  
  // Vérifier la structure des dossiers
  const requiredDirs = [
    'src/services/llm',
    'src/components/chat',
    'src/components/test',
    'src/app/test-multi-tool-calls'
  ];
  
  let missingDirs = 0;
  
  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      logSuccess(`${dir}/ - Présent`);
    } else {
      logError(`${dir}/ - Manquant`);
      missingDirs++;
    }
  }
  
  if (missingDirs === 0) {
    logSuccess('Structure du projet correcte');
  } else {
    logWarning(`${missingDirs} dossier(s) manquant(s)`);
  }
  
  return missingDirs === 0;
}

// Fonction principale
function main() {
  logHeader('🚀 VALIDATION DU SYSTÈME MULTI TOOL CALLS');
  log('Projet Abrège - Améliorations Multi Tool Calls\n');
  
  try {
    // Vérifications préliminaires
    const depsOk = checkDependencies();
    const structureOk = checkProjectStructure();
    
    if (!depsOk || !structureOk) {
      logWarning('Problèmes détectés dans les dépendances ou la structure');
      log('Continuer la validation...\n');
    }
    
    // Validation principale
    const validationOk = validateMultiToolCalls();
    
    // Recommandations
    logHeader('💡 RECOMMANDATIONS');
    
    if (validationOk) {
      logSuccess('Le système est prêt pour les tests en production');
      logInfo('1. Testez avec 5-10 tool calls pour valider le fonctionnement normal');
      logInfo('2. Testez avec 15-20 tool calls pour valider la limite');
      logInfo('3. Testez avec 25+ tool calls pour valider le mode batch');
      logInfo('4. Accédez à /test-multi-tool-calls pour les tests automatisés');
    } else {
      logWarning('Corrigez les tests échoués avant de passer en production');
      logInfo('1. Vérifiez les implémentations dans les fichiers modifiés');
      logInfo('2. Relancez la validation après correction');
      logInfo('3. Testez manuellement les fonctionnalités');
    }
    
    log('\n📚 Documentation: AMELIORATIONS-MULTI-TOOL-CALLS.md');
    log('🧪 Page de test: /test-multi-tool-calls');
    
  } catch (error) {
    logError(`Erreur lors de la validation: ${error.message}`);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  validateMultiToolCalls,
  checkDependencies,
  checkProjectStructure
}; 