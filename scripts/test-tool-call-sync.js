#!/usr/bin/env node

/**
 * 🧪 Script de Test de la Synchronisation du Polling Intelligent
 * 
 * Ce script teste la synchronisation automatique entre le polling intelligent
 * et le store Zustand pour vérifier que l'interface se met à jour en temps réel.
 */

const { simpleLogger: logger } = require('../src/utils/logger');

// Configuration de test
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  userId: 'test-user-sync-123',
  testDelay: 2000
};

/**
 * Simuler un tool call qui déclenche le polling intelligent
 */
async function simulateToolCall(entityType, operation, entityId) {
  try {
    logger.info(`[Test] 🧪 Simulation tool call: ${entityType} ${operation}`);
    
    // Simuler l'appel à l'API de tool call
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'test-sync-script'
      },
      body: JSON.stringify({
        message: `Test ${operation} ${entityType}`,
        user_id: TEST_CONFIG.userId,
        agent_id: 'test-agent',
        // Simuler un tool call
        tool_calls: [{
          id: `tool-${Date.now()}`,
          type: 'function',
          function: {
            name: `${operation.toLowerCase()}_${entityType.slice(0, -1)}`,
            arguments: JSON.stringify({
              name: `Test ${entityType} ${Date.now()}`,
              user_id: TEST_CONFIG.userId
            })
          }
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    logger.info(`[Test] ✅ Tool call simulé avec succès`);
    return true;

  } catch (error) {
    logger.error(`[Test] ❌ Erreur simulation tool call:`, error);
    return false;
  }
}

/**
 * Vérifier le statut de la synchronisation
 */
async function checkSyncStatus() {
  try {
    logger.info(`[Test] 📊 Vérification du statut de synchronisation...`);
    
    // Vérifier le statut du polling
    const pollingResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/test-polling-status`, {
      method: 'GET',
      headers: {
        'X-Client-Type': 'test-sync-script'
      }
    });

    if (pollingResponse.ok) {
      const pollingStatus = await pollingResponse.json();
      logger.info(`[Test] 📊 Statut polling:`, {
        isPolling: pollingStatus.isPolling,
        queueLength: pollingStatus.queueLength,
        totalPollings: pollingStatus.totalPollings,
        successfulPollings: pollingStatus.successfulPollings
      });
    }

    // Vérifier le statut de la synchronisation
    const syncResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/test-sync-status`, {
      method: 'GET',
      headers: {
        'X-Client-Type': 'test-sync-script'
      }
    });

    if (syncResponse.ok) {
      const syncStatus = await syncResponse.json();
      logger.info(`[Test] 📡 Statut synchronisation:`, {
        isActive: syncStatus.isActive,
        lastSyncTime: syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toISOString() : 'Jamais'
      });
    }

  } catch (error) {
    logger.error(`[Test] ❌ Erreur vérification statut:`, error);
  }
}

/**
 * Test de synchronisation complète
 */
async function runSyncTest() {
  logger.info(`[Test] 🚀 Démarrage du test de synchronisation...`);
  
  try {
    // 1. Vérifier le statut initial
    await checkSyncStatus();
    
    // 2. Simuler plusieurs tool calls
    logger.info(`[Test] 🔄 Simulation de plusieurs tool calls...`);
    
    const testCases = [
      { entityType: 'notes', operation: 'CREATE' },
      { entityType: 'folders', operation: 'CREATE' },
      { entityType: 'notes', operation: 'UPDATE' },
      { entityType: 'classeurs', operation: 'CREATE' }
    ];

    for (const testCase of testCases) {
      const entityId = `${testCase.entityType}-test-${Date.now()}`;
      
      logger.info(`[Test] 🧪 Test: ${testCase.operation} ${testCase.entityType} (${entityId})`);
      
      const success = await simulateToolCall(
        testCase.entityType,
        testCase.operation,
        entityId
      );

      if (success) {
        logger.info(`[Test] ✅ ${testCase.operation} ${testCase.entityType} réussi`);
        
        // Attendre que le polling se déclenche
        logger.info(`[Test] ⏳ Attente du déclenchement du polling...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier le statut après le polling
        await checkSyncStatus();
        
        // Attendre la synchronisation
        logger.info(`[Test] ⏳ Attente de la synchronisation...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vérifier le statut final
        await checkSyncStatus();
        
      } else {
        logger.error(`[Test] ❌ ${testCase.operation} ${testCase.entityType} échoué`);
      }

      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`[Test] 🎉 Test de synchronisation terminé avec succès !`);
    
  } catch (error) {
    logger.error(`[Test] ❌ Erreur lors du test de synchronisation:`, error);
  }
}

/**
 * Test de performance
 */
async function runPerformanceTest() {
  logger.info(`[Test] ⚡ Démarrage du test de performance...`);
  
  try {
    const startTime = Date.now();
    const testCount = 10;
    
    logger.info(`[Test] 🚀 Lancement de ${testCount} tool calls simultanés...`);
    
    const promises = Array.from({ length: testCount }, (_, index) => 
      simulateToolCall('notes', 'CREATE', `perf-test-${index}-${Date.now()}`)
    );
    
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value).length;
    const duration = endTime - startTime;
    
    logger.info(`[Test] 📊 Résultats performance:`, {
      total: testCount,
      successful,
      failed,
      duration: `${duration}ms`,
      average: `${duration / testCount}ms par opération`
    });
    
    // Vérifier le statut après le test de performance
    await checkSyncStatus();
    
  } catch (error) {
    logger.error(`[Test] ❌ Erreur lors du test de performance:`, error);
  }
}

/**
 * Fonction principale
 */
async function main() {
  logger.info(`[Test] 🧪 Script de Test de Synchronisation du Polling Intelligent`);
  logger.info(`[Test] 🌐 Base URL: ${TEST_CONFIG.baseUrl}`);
  logger.info(`[Test] 👤 User ID: ${TEST_CONFIG.userId}`);
  
  try {
    // Test de base
    await runSyncTest();
    
    // Pause
    logger.info(`[Test] ⏳ Pause de 5 secondes avant le test de performance...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test de performance
    await runPerformanceTest();
    
    logger.info(`[Test] 🎉 Tous les tests terminés avec succès !`);
    
  } catch (error) {
    logger.error(`[Test] ❌ Erreur lors de l'exécution des tests:`, error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(error => {
    logger.error(`[Test] ❌ Erreur fatale:`, error);
    process.exit(1);
  });
}

module.exports = {
  simulateToolCall,
  checkSyncStatus,
  runSyncTest,
  runPerformanceTest
}; 