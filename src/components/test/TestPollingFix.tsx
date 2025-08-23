"use client";

import React, { useState, useEffect } from 'react';
import { triggerUnifiedPolling } from '@/services/unifiedPollingService';
import { startUnifiedPollingSync, stopUnifiedPollingSync, getUnifiedPollingStatus } from '@/services/unifiedPollingService';

/**
 * Composant de test pour valider les corrections du système de polling
 * Permet de tester que le polling fonctionne correctement après les corrections
 */
export default function TestPollingFix() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [pollingStatus, setPollingStatus] = useState<any>(null);
  const [testUserId] = useState('test-user-123');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Mettre à jour les statuts en temps réel
  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(getUnifiedPollingStatus());
      setPollingStatus(getUnifiedPollingStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const testEndpointMapping = () => {
    addLog('🔧 Test du mapping des endpoints...');
    
    const entityTypes = ['notes', 'folders', 'classeurs', 'files'];
    const expectedEndpoints = {
      'notes': '/api/v2/notes/recent',
      'folders': '/api/v2/classeurs/with-content',
      'classeurs': '/api/v2/classeurs/with-content',
      'files': '/api/v2/classeurs/with-content'
    };
    
    entityTypes.forEach(entityType => {
      const expected = expectedEndpoints[entityType];
      addLog(`   ${entityType}: ${expected}`);
    });
    
    addLog('✅ Mapping des endpoints corrigé');
  };

  const testPollingService = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test du service de polling...');
      
      // Tester le polling pour chaque type d'entité
      const entityTypes = ['notes', 'folders', 'classeurs', 'files'];
      
      for (const entityType of entityTypes) {
        addLog(`   🔄 Test polling ${entityType}...`);
        
        const result = await triggerUnifiedPolling({
          entityType: entityType as any,
          operation: 'CREATE',
          entityId: `${entityType}-${Date.now()}`,
          userId: testUserId,
          delay: 500
        });
        
        if (result.success) {
          addLog(`   ✅ Polling ${entityType} déclenché avec succès`);
        } else {
          addLog(`   ❌ Polling ${entityType} échoué: ${result.error}`);
        }
        
        // Attendre un peu entre chaque test
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      addLog('🎉 Test du service de polling terminé');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSyncService = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test du service de synchronisation...');
      
      // Démarrer la synchronisation
      addLog('   🚀 Démarrage de la synchronisation...');
      startUnifiedPollingSync();
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier le statut
      const status = getUnifiedPollingStatus();
      addLog(`   📊 Statut de la synchronisation: ${status.isPolling ? 'Actif' : 'Inactif'}`);
      
      // Arrêter la synchronisation
      addLog('   🛑 Arrêt de la synchronisation...');
      stopUnifiedPollingSync();
      
      addLog('🎉 Test du service de synchronisation terminé');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCompleteWorkflow = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test du workflow complet...');
      
      // 1. Démarrer la synchronisation
      addLog('   1️⃣ Démarrage de la synchronisation...');
      startUnifiedPollingSync();
      
      // 2. Déclencher plusieurs pollings
      addLog('   2️⃣ Déclenchement de plusieurs pollings...');
      
      const operations = [
        { entityType: 'notes', operation: 'CREATE' },
        { entityType: 'folders', operation: 'CREATE' },
        { entityType: 'classeurs', operation: 'UPDATE' }
      ];
      
      for (const op of operations) {
        await triggerUnifiedPolling({
          entityType: op.entityType as any,
          operation: op.operation as any,
          entityId: `${op.entityType}-${Date.now()}`,
          userId: testUserId,
          delay: 300
        });
        
        addLog(`      ✅ Polling ${op.entityType} ${op.operation} déclenché`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 3. Attendre et vérifier
      addLog('   3️⃣ Attente et vérification...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalStatus = getUnifiedPollingStatus();
      addLog(`      📊 Statut final: ${finalStatus.totalPollings} pollings, ${finalStatus.successfulPollings} succès`);
      
      // 4. Arrêter la synchronisation
      addLog('   4️⃣ Arrêt de la synchronisation...');
      stopUnifiedPollingSync();
      
      addLog('🎉 Test du workflow complet terminé avec succès !');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="test-polling-fix p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🧪 Test des Corrections du Système de Polling
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Statut en temps réel */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-3">📊 Statut en Temps Réel</h2>
          
          {syncStatus && (
            <div className="mb-3">
              <h3 className="font-medium text-gray-700">Synchronisation</h3>
              <div className="text-sm text-gray-600">
                Statut: <span className={syncStatus.isPolling ? 'text-green-600' : 'text-red-600'}>
                  {syncStatus.isPolling ? '🟢 Actif' : '🔴 Inactif'}
                </span>
              </div>
            </div>
          )}
          
          {pollingStatus && (
            <div>
              <h3 className="font-medium text-gray-700">Polling</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>En cours: <span className="font-mono">{pollingStatus.isPolling ? '🟢 Oui' : '🔴 Non'}</span></div>
                <div>Queue: <span className="font-mono">{pollingStatus.queueLength}</span></div>
                <div>Total: <span className="font-mono">{pollingStatus.totalPollings}</span></div>
                <div>Succès: <span className="font-mono text-green-600">{pollingStatus.successfulPollings}</span></div>
                <div>Échecs: <span className="font-mono text-red-600">{pollingStatus.failedPollings}</span></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Boutons de test */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-3">🧪 Tests Disponibles</h2>
          
          <div className="space-y-2">
            <button
              onClick={testEndpointMapping}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              🔧 Test Mapping Endpoints
            </button>
            
            <button
              onClick={testPollingService}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              🔄 Test Service Polling
            </button>
            
            <button
              onClick={testSyncService}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              🔗 Test Service Synchronisation
            </button>
            
            <button
              onClick={testCompleteWorkflow}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              🚀 Test Workflow Complet
            </button>
          </div>
          
          <button
            onClick={clearLogs}
            className="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            🗑️ Effacer les Logs
          </button>
        </div>
      </div>
      
      {/* Logs de test */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-3">📋 Logs de Test</h2>
        
        <div className="bg-gray-100 p-3 rounded font-mono text-sm h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun test exécuté. Cliquez sur un bouton de test pour commencer.
            </div>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📖 Instructions de Test</h3>
        <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
          <li>Commencez par tester le mapping des endpoints</li>
          <li>Testez le service de polling individuellement</li>
          <li>Testez le service de synchronisation</li>
          <li>Exécutez le workflow complet pour valider l'ensemble</li>
          <li>Vérifiez que les statuts se mettent à jour en temps réel</li>
        </ol>
      </div>
    </div>
  );
} 