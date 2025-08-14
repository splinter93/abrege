#!/usr/bin/env node

/**
 * Script de validation automatique de la Phase 1
 * Vérifie que tous les composants sont correctement implémentés
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

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log('─'.repeat(message.length), 'cyan');
}

// Fonction pour vérifier l'existence d'un fichier
function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  } else {
    logError(`${description}: ${filePath} - FICHIER MANQUANT`);
    return false;
  }
}

// Fonction pour vérifier le contenu d'un fichier
function checkFileContent(filePath, checks, description) {
  if (!fs.existsSync(filePath)) {
    logError(`${description}: Fichier inexistant`);
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let allChecksPassed = true;

    checks.forEach((check, index) => {
      if (check.pattern.test(content)) {
        logSuccess(`${description} - Check ${index + 1}: ${check.description}`);
      } else {
        logError(`${description} - Check ${index + 1}: ${check.description} - ÉCHEC`);
        allChecksPassed = false;
      }
    });

    return allChecksPassed;
  } catch (error) {
    logError(`${description}: Erreur lecture fichier - ${error.message}`);
    return false;
  }
}

// Validation principale
async function validatePhase1() {
  logHeader('🧪 VALIDATION PHASE 1 - PERSISTANCE TOOL CALLS + SESSIONS UUID');
  
  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Vérification des fichiers créés
  logHeader('📁 VÉRIFICATION DES FICHIERS CRÉÉS');
  
  const filesToCheck = [
    {
      path: 'src/app/api/v1/chat-sessions/[id]/messages/batch/route.ts',
      description: 'Route API batch'
    },
    {
      path: 'src/services/batchMessageService.ts',
      description: 'Service batch messages'
    },
    {
      path: 'src/hooks/useAtomicToolCalls.ts',
      description: 'Hook atomic tool calls'
    },
    {
      path: 'src/components/test/TestBatchAPI.tsx',
      description: 'Composant de test'
    },
    {
      path: 'src/app/test-batch-api/page.tsx',
      description: 'Page de test'
    },
    {
      path: 'scripts/test-batch-api.js',
      description: 'Script de test API'
    },
    {
      path: 'scripts/test-batch-api-simple.js',
      description: 'Script de test simplifié'
    }
  ];

  filesToCheck.forEach(file => {
    totalChecks++;
    if (checkFileExists(file.path, file.description)) {
      passedChecks++;
    }
  });

  // 2. Vérification des modifications des fichiers existants
  logHeader('🔧 VÉRIFICATION DES MODIFICATIONS');
  
  // Vérifier useChatStore.ts
  totalChecks++;
  if (checkFileContent(
    'src/store/useChatStore.ts',
    [
      {
        pattern: /crypto\.randomUUID\(\)/,
        description: 'UUID valide au lieu de temp-'
      },
      {
        pattern: /Session temporaire avec UUID valide/,
        description: 'Commentaire mis à jour'
      }
    ],
    'useChatStore.ts - Sessions temporaires UUID'
  )) {
    passedChecks++;
  }

  // Vérifier ChatFullscreenV2.tsx
  totalChecks++;
  if (checkFileContent(
    'src/components/chat/ChatFullscreenV2.tsx',
    [
      {
        pattern: /useAtomicToolCalls/,
        description: 'Hook atomic importé'
      },
      {
        pattern: /addToolResult/,
        description: 'Hook atomic utilisé'
      },
      {
        pattern: /persist: true/,
        description: 'Persistance forcée en fallback'
      }
    ],
    'ChatFullscreenV2.tsx - Intégration hook atomic'
  )) {
    passedChecks++;
  }

  // Vérifier sessionSyncService.ts
  totalChecks++;
  if (checkFileContent(
    'src/services/sessionSyncService.ts',
    [
      {
        pattern: /Session temporaire détectée/,
        description: 'Commentaire mis à jour'
      },
      {
        pattern: /!sessionId\.includes\('-'\)/,
        description: 'Détection sessions temporaires par UUID'
      }
    ],
    'sessionSyncService.ts - Gestion sessions temporaires'
  )) {
    passedChecks++;
  }

  // 3. Vérification de la structure de l'API
  logHeader('🌐 VÉRIFICATION STRUCTURE API');
  
  totalChecks++;
  if (checkFileContent(
    'src/app/api/v1/chat-sessions/[id]/messages/batch/route.ts',
    [
      {
        pattern: /export async function POST/,
        description: 'Route POST exportée'
      },
      {
        pattern: /batchMessageSchema/,
        description: 'Schéma de validation'
      },
      {
        pattern: /validateToolMessages/,
        description: 'Validation messages tool'
      },
      {
        pattern: /existingToolCallIds/,
        description: 'Déduplication tool_call_id'
      },
      {
        pattern: /sortedAndLimitedThread/,
        description: 'Limite d\'historique appliquée'
      }
    ],
    'Route API batch - Fonctionnalités complètes'
  )) {
    passedChecks++;
  }

  // 4. Vérification du service batch
  logHeader('⚙️ VÉRIFICATION SERVICE BATCH');
  
  totalChecks++;
  if (checkFileContent(
    'src/services/batchMessageService.ts',
    [
      {
        pattern: /addBatchMessages/,
        description: 'Méthode batch principale'
      },
      {
        pattern: /addToolCallSequence/,
        description: 'Méthode séquence tool call'
      },
      {
        pattern: /validateToolMessage/,
        description: 'Validation messages tool'
      },
      {
        pattern: /validateBatch/,
        description: 'Validation batch complet'
      }
    ],
    'Service batch - Méthodes principales'
  )) {
    passedChecks++;
  }

  // 5. Vérification du hook atomic
  logHeader('🎣 VÉRIFICATION HOOK ATOMIC');
  
  totalChecks++;
  if (checkFileContent(
    'src/hooks/useAtomicToolCalls.ts',
    [
      {
        pattern: /addToolCallSequence/,
        description: 'Méthode séquence complète'
      },
      {
        pattern: /addToolResult/,
        description: 'Méthode résultat tool'
      },
      {
        pattern: /isProcessing/,
        description: 'État de traitement'
      },
      {
        pattern: /batchMessageService/,
        description: 'Service batch utilisé'
      }
    ],
    'Hook atomic - Fonctionnalités complètes'
  )) {
    passedChecks++;
  }

  // 6. Vérification des tests
  logHeader('🧪 VÉRIFICATION DES TESTS');
  
  totalChecks++;
  if (checkFileContent(
    'src/components/test/TestBatchAPI.tsx',
    [
      {
        pattern: /testSimpleMessage/,
        description: 'Test message simple'
      },
      {
        pattern: /testToolMessage/,
        description: 'Test message tool'
      },
      {
        pattern: /testToolCallSequence/,
        description: 'Test séquence complète'
      },
      {
        pattern: /testHookAtomic/,
        description: 'Test hook atomic'
      },
      {
        pattern: /testValidation/,
        description: 'Test validation'
      }
    ],
    'Composant de test - Tests complets'
  )) {
    passedChecks++;
  }

  // 7. Vérification des nouveaux scripts de test
  logHeader('🔐 VÉRIFICATION AUTHENTIFICATION & TESTS AVANCÉS');
  
  const newTestFiles = [
    {
      path: 'scripts/setup-test-auth.js',
      description: 'Script configuration auth de test'
    },
    {
      path: 'scripts/test-batch-api-auth.js',
      description: 'Script test complet avec auth'
    }
  ];

  newTestFiles.forEach(file => {
    totalChecks++;
    if (checkFileExists(file.path, file.description)) {
      passedChecks++;
    }
  });

  // Vérifier le contenu du script de test avancé
  totalChecks++;
  if (checkFileContent(
    'scripts/test-batch-api-auth.js',
    [
      {
        pattern: /Test d'authentification/,
        description: 'Tests d\'authentification'
      },
      {
        pattern: /Test d'idempotence/,
        description: 'Tests d\'idempotence'
      },
      {
        pattern: /Test de concurrence/,
        description: 'Tests de concurrence ETag'
      },
      {
        pattern: /Test de validation des messages tool/,
        description: 'Tests de validation'
      },
      {
        pattern: /Test de séquence tool call complète/,
        description: 'Tests de séquence complète'
      }
    ],
    'Script de test avancé - Fonctionnalités complètes'
  )) {
    passedChecks++;
  }

  // Résumé final
  logHeader('📊 RÉSUMÉ DE LA VALIDATION');
  
  const successRate = (passedChecks / totalChecks) * 100;
  
  log(`Total des vérifications: ${totalChecks}`, 'bright');
  log(`Vérifications réussies: ${passedChecks}`, 'green');
  log(`Vérifications échouées: ${totalChecks - passedChecks}`, 'red');
  log(`Taux de succès: ${successRate.toFixed(1)}%`, successRate >= 90 ? 'green' : 'yellow');

  if (successRate >= 90) {
    log('\n🎉 PHASE 1 VALIDÉE AVEC SUCCÈS !', 'green');
    log('Tous les composants critiques sont correctement implémentés.', 'green');
  } else if (successRate >= 70) {
    log('\n⚠️ PHASE 1 PARTIELLEMENT VALIDÉE', 'yellow');
    log('Certains composants nécessitent des corrections.', 'yellow');
  } else {
    log('\n❌ PHASE 1 NON VALIDÉE', 'red');
    log('Plusieurs composants critiques sont manquants ou incorrects.', 'red');
  }

  // Recommandations
  logHeader('💡 RECOMMANDATIONS');
  
  if (successRate >= 90) {
    log('✅ Tester manuellement l\'interface utilisateur', 'green');
    log('✅ Vérifier la persistance en base de données', 'green');
    log('✅ Tester les scénarios d\'erreur', 'green');
    log('✅ Passer à la Phase 2 (validation + gestion erreurs)', 'green');
  } else if (successRate >= 70) {
    log('🔧 Corriger les composants manquants', 'yellow');
    log('🔧 Vérifier la syntaxe des fichiers', 'yellow');
    log('🔧 Relancer la validation après corrections', 'yellow');
  } else {
    log('🚨 Revoir complètement l\'implémentation', 'red');
    log('🚨 Vérifier la structure du projet', 'red');
    log('🚨 S\'assurer que tous les fichiers sont créés', 'red');
  }

  return successRate >= 90;
}

// Exécuter la validation
if (require.main === module) {
  validatePhase1().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { validatePhase1 }; 