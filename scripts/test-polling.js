#!/usr/bin/env node

/**
 * Script de test pour le système de polling intelligent
 * Usage: node scripts/test-polling.js
 */

const { ClientPollingTrigger } = require('../src/services/clientPollingTrigger');

console.log('🧪 Test du système de polling intelligent\n');

// Simuler le service realtime
const mockRealtimeService = {
  triggerImmediateCheck: async (table, operation) => {
    console.log(`  🔄 Polling ${table} (${operation}) - ${new Date().toLocaleTimeString()}`);
    // Simuler un délai
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    console.log(`  ✅ Polling ${table} terminé`);
  }
};

// Créer une instance de test
const pollingTrigger = new ClientPollingTrigger();

// Remplacer le service realtime par le mock
pollingTrigger.realtimeService = mockRealtimeService;

async function testPolling() {
  console.log('🚀 Test 1: Polling simple pour dossiers');
  await pollingTrigger.triggerFoldersPolling('INSERT');
  
  console.log('\n🚀 Test 2: Polling optimisé pour articles');
  await pollingTrigger.triggerArticlesPolling('INSERT');
  
  console.log('\n🚀 Test 3: Polling intelligent personnalisé');
  await pollingTrigger.triggerIntelligentPolling('folders', 'UPDATE', {
    immediate: 0,
    fast: 50,
    confirm: 100,
    stabilize: 500
  });
  
  console.log('\n🚀 Test 4: Synchronisation complète de classeur');
  await pollingTrigger.triggerClasseurFullSync('test-classeur-id');
  
  // Attendre que tous les polls se terminent
  console.log('\n⏳ Attente de la fin des opérations...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n📊 État final des opérations:');
  const activeOps = pollingTrigger.getActiveOperations();
  console.log(`  Opérations actives: ${activeOps.length}`);
  
  activeOps.forEach(op => {
    console.log(`  - ${op.table} (${op.operation}): ${op.status} - ${op.attempts} tentatives`);
  });
  
  console.log('\n🧹 Nettoyage...');
  pollingTrigger.cleanup();
  
  console.log('\n✅ Tests terminés !');
}

// Exécuter les tests
testPolling().catch(console.error); 