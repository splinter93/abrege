#!/usr/bin/env node

/**
 * Script de test pour le système de polling intelligent des tool calls
 * Teste toutes les opérations CRUD avec déclenchement automatique du polling
 */

require('dotenv').config({ path: '.env.local' });

console.log('🧪 Test du système de polling intelligent des tool calls\n');

// Simulation du service de polling (pour le test en mode standalone)
class MockToolCallPollingService {
  constructor() {
    this.isPolling = false;
    this.pollingQueue = [];
    this.lastPollingResults = new Map();
    this.activePollings = new Set();
    this.totalPollings = 0;
    this.successfulPollings = 0;
    this.failedPollings = 0;
  }

  async triggerPolling(config) {
    const { entityType, operation, entityId, userId, delay = 1000, priority = this.getDefaultPriority(operation) } = config;
    
    console.log(`🔄 [Mock] Polling déclenché: ${entityType} ${operation}`);
    console.log(`   • Entity ID: ${entityId || 'N/A'}`);
    console.log(`   • User ID: ${userId.substring(0, 8)}...`);
    console.log(`   • Délai: ${delay}ms`);
    console.log(`   • Priorité: ${priority}`);
    
    // Simuler l'ajout à la queue
    this.addToQueueWithPriority({ ...config, delay, priority });
    
    // Simuler le traitement de la queue
    if (!this.isPolling) {
      this.processPollingQueue();
    }
    
    return {
      success: true,
      entityType,
      operation,
      entityId,
      userId,
      timestamp: Date.now(),
      details: { queued: true }
    };
  }

  addToQueueWithPriority(config) {
    const { entityType, operation, entityId, userId } = config;
    const key = `${entityType}_${operation}_${entityId || 'unknown'}_${userId}`;
    
    // Éviter les doublons
    const existingIndex = this.pollingQueue.findIndex(item => 
      `${item.entityType}_${item.operation}_${item.entityId || 'unknown'}_${item.userId}` === key
    );
    
    if (existingIndex !== -1) {
      if (config.priority < this.pollingQueue[existingIndex].priority) {
        this.pollingQueue[existingIndex].priority = config.priority;
        console.log(`   🔄 Priorité mise à jour pour ${key}`);
      }
      return;
    }
    
    this.pollingQueue.push(config);
    this.pollingQueue.sort((a, b) => (a.priority || 5) - (b.priority || 5));
    
    console.log(`   📥 Ajouté à la queue: ${key} (priorité: ${config.priority}, queue: ${this.pollingQueue.length})`);
  }

  getDefaultPriority(operation) {
    const priorities = {
      'DELETE': 1,    // Priorité haute
      'UPDATE': 2,    // Priorité moyenne
      'MOVE': 3,      // Priorité moyenne
      'RENAME': 3,    // Priorité moyenne
      'CREATE': 4     // Priorité basse
    };
    
    return priorities[operation] || 5;
  }

  async processPollingQueue() {
    if (this.pollingQueue.length === 0) {
      this.isPolling = false;
      return;
    }

    this.isPolling = true;
    const config = this.pollingQueue.shift();
    const { entityType, operation, entityId, userId, delay } = config;
    const pollingKey = `${entityType}_${operation}_${entityId || 'unknown'}_${userId}`;
    
    console.log(`\n🚀 [Mock] Traitement du polling: ${pollingKey}`);
    
    this.activePollings.add(pollingKey);
    this.totalPollings++;
    
    try {
      // Simuler le délai
      if (delay > 0) {
        console.log(`   ⏳ Attente ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Simuler l'exécution du polling
      console.log(`   🔍 Exécution du polling pour ${entityType}...`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulation du temps de polling
      
      const result = {
        success: true,
        entityType,
        operation,
        entityId,
        userId,
        timestamp: Date.now(),
        dataCount: Math.floor(Math.random() * 10) + 1
      };
      
      this.lastPollingResults.set(pollingKey, result);
      this.successfulPollings++;
      
      console.log(`   ✅ Polling réussi: ${result.dataCount} éléments récupérés`);
      
    } catch (error) {
      const errorResult = {
        success: false,
        entityType,
        operation,
        entityId,
        userId,
        timestamp: Date.now(),
        error: error.message
      };
      
      this.lastPollingResults.set(pollingKey, errorResult);
      this.failedPollings++;
      
      console.log(`   ❌ Polling échoué: ${error.message}`);
    } finally {
      this.activePollings.delete(pollingKey);
      this.processPollingQueue();
    }
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      queueLength: this.pollingQueue.length,
      lastResults: new Map(this.lastPollingResults),
      activePollings: new Set(this.activePollings),
      totalPollings: this.totalPollings,
      successfulPollings: this.successfulPollings,
      failedPollings: this.failedPollings
    };
  }
}

// Créer une instance du service mock
const mockPollingService = new MockToolCallPollingService();

// Fonction de test pour simuler l'exécution d'un tool
async function simulateToolExecution(toolName, entityType, operation, userId, delay = 1000) {
  console.log(`\n🔧 [Tool] Exécution de ${toolName}...`);
  
  try {
    // Simuler l'exécution du tool
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Simuler le résultat
    const result = {
      success: true,
      [entityType]: {
        id: `${entityType}-${Date.now()}`,
        name: `Test ${entityType}`,
        created_at: new Date().toISOString()
      }
    };
    
    console.log(`   ✅ Tool exécuté avec succès`);
    console.log(`   📊 Résultat:`, result);
    
    // Déclencher le polling intelligent
    const pollingConfig = {
      entityType,
      operation,
      entityId: result[entityType].id,
      userId,
      delay
    };
    
    await mockPollingService.triggerPolling(pollingConfig);
    
    return result;
    
  } catch (error) {
    console.log(`   ❌ Erreur lors de l'exécution du tool: ${error.message}`);
    throw error;
  }
}

// Tests des différentes opérations
async function runTests() {
  const testUserId = 'test-user-123';
  
  console.log('🚀 Démarrage des tests de polling intelligent...\n');
  
  try {
    // Test 1: Création de note
    console.log('📝 Test 1: Création de note');
    await simulateToolExecution('create_note', 'notes', 'CREATE', testUserId, 1000);
    
    // Test 2: Mise à jour de note
    console.log('\n🔄 Test 2: Mise à jour de note');
    await simulateToolExecution('update_note', 'notes', 'UPDATE', testUserId, 500);
    
    // Test 3: Suppression de note
    console.log('\n🗑️ Test 3: Suppression de note');
    await simulateToolExecution('delete_note', 'notes', 'DELETE', testUserId, 0);
    
    // Test 4: Création de dossier
    console.log('\n📁 Test 4: Création de dossier');
    await simulateToolExecution('create_folder', 'folders', 'CREATE', testUserId, 1500);
    
    // Test 5: Déplacement de dossier
    console.log('\n📦 Test 5: Déplacement de dossier');
    await simulateToolExecution('move_folder', 'folders', 'MOVE', testUserId, 800);
    
    // Test 6: Création de classeur
    console.log('\n📚 Test 6: Création de classeur');
    await simulateToolExecution('create_notebook', 'classeurs', 'CREATE', testUserId, 2000);
    
    // Test 7: Opérations multiples simultanées
    console.log('\n⚡ Test 7: Opérations multiples simultanées');
    const operations = [
      { toolName: 'add_content_to_note', entityType: 'notes', operation: 'UPDATE', delay: 300 },
      { toolName: 'update_folder', entityType: 'folders', operation: 'UPDATE', delay: 500 },
      { toolName: 'delete_notebook', entityType: 'classeurs', operation: 'DELETE', delay: 0 },
      { toolName: 'move_note', entityType: 'notes', operation: 'MOVE', delay: 800 },
      { toolName: 'upload_file', entityType: 'files', operation: 'CREATE', delay: 1200 }
    ];
    
    const promises = operations.map(op => 
      simulateToolExecution(op.toolName, op.entityType, op.operation, testUserId, op.delay)
    );
    
    await Promise.all(promises);
    console.log('   ✅ Toutes les opérations simultanées terminées');
    
    // Attendre que tous les pollings soient terminés
    console.log('\n⏳ Attente de la fin de tous les pollings...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Afficher le statut final
    console.log('\n📊 Statut final du service de polling:');
    const status = mockPollingService.getStatus();
    console.log(`   • Polling actif: ${status.isPolling ? 'Oui' : 'Non'}`);
    console.log(`   • Queue: ${status.queueLength} éléments`);
    console.log(`   • Pollings actifs: ${status.activePollings.size}`);
    console.log(`   • Total: ${status.totalPollings}`);
    console.log(`   • Succès: ${status.successfulPollings}`);
    console.log(`   • Échecs: ${status.failedPollings}`);
    
    // Afficher les derniers résultats
    if (status.lastResults.size > 0) {
      console.log('\n📋 Derniers résultats de polling:');
      Array.from(status.lastResults.entries()).slice(0, 5).forEach(([key, result]) => {
        console.log(`   • ${key}: ${result.success ? '✅' : '❌'} (${result.dataCount || 0} éléments)`);
      });
    }
    
    console.log('\n🎉 Tests terminés avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

// Exécuter les tests
runTests().then(() => {
  console.log('\n🏁 Script de test terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Erreur fatale:', error);
  process.exit(1);
}); 