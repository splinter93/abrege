"use client";

import React, { useState } from 'react';
import { triggerUnifiedPolling, getUnifiedPollingStatus } from '@/services/unifiedPollingService';


/**
 * Composant de test pour le système de polling intelligent des tool calls
 * Permet de tester toutes les opérations CRUD avec déclenchement automatique du polling
 */
export default function TestToolCallPolling() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testUserId] = useState('test-user-123');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testCreateNote = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note avec polling intelligent...');
      
      // Simuler la création d'une note via tool call
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'CREATE',
        entityId: `note-${Date.now()}`,
        userId: testUserId,
        delay: 1000
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`👤 User ID: ${result.userId.substring(0, 8)}...`);
      addLog(`⏱️ Délai: 1 seconde`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateNote = async () => {
    setIsLoading(true);
    try {
      addLog('🔄 Test mise à jour note avec polling intelligent...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'UPDATE',
        entityId: `note-${Date.now()}`,
        userId: testUserId,
        delay: 500,
        priority: 2
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Délai: 500ms (priorité: 2)`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteNote = async () => {
    setIsLoading(true);
    try {
      addLog('🗑️ Test suppression note avec polling intelligent...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'DELETE',
        entityId: `note-${Date.now()}`,
        userId: testUserId,
        delay: 0,
        priority: 1
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Délai: 0ms (priorité: 1 - haute)`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolder = async () => {
    setIsLoading(true);
    try {
      addLog('📁 Test création dossier avec polling intelligent...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'folders',
        operation: 'CREATE',
        entityId: `folder-${Date.now()}`,
        userId: testUserId,
        delay: 1500
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Délai: 1.5 secondes`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMoveFolder = async () => {
    setIsLoading(true);
    try {
      addLog('📦 Test déplacement dossier avec polling intelligent...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'folders',
        operation: 'MOVE',
        entityId: `folder-${Date.now()}`,
        userId: testUserId,
        delay: 800,
        priority: 3
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Délai: 800ms (priorité: 3)`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('📚 Test création classeur avec polling intelligent...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'classeurs',
        operation: 'CREATE',
        entityId: `classeur-${Date.now()}`,
        userId: testUserId,
        delay: 2000
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Délai: 2 secondes`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testRenameClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('✏️ Test renommage classeur avec polling intelligent...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'classeurs',
        operation: 'RENAME',
        entityId: `classeur-${Date.now()}`,
        userId: testUserId,
        delay: 300,
        priority: 3
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Délai: 300ms (priorité: 3)`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleOperations = async () => {
    setIsLoading(true);
    try {
      addLog('⚡ Test opérations multiples simultanées...');
      
      const operations = [
        { entityType: 'notes' as const, operation: 'CREATE' as const, delay: 1000 },
        { entityType: 'folders' as const, operation: 'UPDATE' as const, delay: 500 },
        { entityType: 'classeurs' as const, operation: 'DELETE' as const, delay: 0 },
        { entityType: 'notes' as const, operation: 'MOVE' as const, delay: 800 },
        { entityType: 'files' as const, operation: 'CREATE' as const, delay: 1200 }
      ];

      const promises = operations.map((op, index) => 
        triggerUnifiedPolling({
          ...op,
          entityId: `${op.entityType}-${Date.now()}-${index}`,
          userId: testUserId
        })
      );

      const results = await Promise.all(promises);
      
      addLog(`✅ ${results.length} pollings déclenchés simultanément`);
      results.forEach((result, index) => {
        addLog(`  ${index + 1}. ${result.entityType} ${result.operation} (ID: ${result.entityId})`);
      });
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStatus = () => {
    const status = getUnifiedPollingStatus();
    addLog(`📊 Statut du service de polling:`);
    addLog(`  • Polling actif: ${status.isPolling ? 'Oui' : 'Non'}`);
    addLog(`  • Queue: ${status.queueLength} éléments`);
    addLog(`  • Pollings actifs: ${status.activePollings.size}`);
    addLog(`  • Total: ${status.totalPollings}`);
    addLog(`  • Succès: ${status.successfulPollings}`);
    addLog(`  • Échecs: ${status.failedPollings}`);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="test-tool-call-polling p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🧪 Test Polling Intelligent Tool Calls</h1>
        <p className="text-gray-600">
          Teste le système de polling intelligent qui se déclenche automatiquement après chaque opération CRUD
        </p>
      </div>

      {/* Monitor de polling */}
      <div className="mb-6">
  
      </div>

      {/* Boutons de test */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Tests des Opérations CRUD</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button
            onClick={testCreateNote}
            disabled={isLoading}
            className="btn btn-primary btn-sm"
          >
            📝 Créer Note
          </button>
          
          <button
            onClick={testUpdateNote}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
          >
            🔄 Mettre à Jour
          </button>
          
          <button
            onClick={testDeleteNote}
            disabled={isLoading}
            className="btn btn-danger btn-sm"
          >
            🗑️ Supprimer
          </button>
          
          <button
            onClick={testCreateFolder}
            disabled={isLoading}
            className="btn btn-info btn-sm"
          >
            📁 Créer Dossier
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button
            onClick={testMoveFolder}
            disabled={isLoading}
            className="btn btn-warning btn-sm"
          >
            📦 Déplacer
          </button>
          
          <button
            onClick={testCreateClasseur}
            disabled={isLoading}
            className="btn btn-success btn-sm"
          >
            📚 Créer Classeur
          </button>
          
          <button
            onClick={testRenameClasseur}
            disabled={isLoading}
            className="btn btn-accent btn-sm"
          >
            ✏️ Renommer
          </button>
          
          <button
            onClick={testMultipleOperations}
            disabled={isLoading}
            className="btn btn-outline btn-sm"
          >
            ⚡ Multiples
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={testStatus}
            className="btn btn-ghost btn-sm"
          >
            📊 Statut
          </button>
          
          <button
            onClick={clearLogs}
            className="btn btn-ghost btn-sm"
          >
            🗑️ Vider Logs
          </button>
        </div>
      </div>

      {/* Logs de test */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">📋 Logs de Test</h3>
          <span className="text-sm text-gray-500">
            {testResults.length} messages
          </span>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">
              Aucun test effectué. Cliquez sur un bouton pour commencer.
            </p>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Informations */}
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">💡 Comment ça fonctionne :</h4>
        <ul className="space-y-1">
          <li>• <strong>Priorités :</strong> DELETE (1) &gt; UPDATE (2) &gt; MOVE/RENAME (3) &gt; CREATE (4)</li>
          <li>• <strong>Délais :</strong> Configurables pour chaque opération (0ms à plusieurs secondes)</li>
          <li>• <strong>Queue intelligente :</strong> Évite les doublons et respecte les priorités</li>
          <li>• <strong>Retry automatique :</strong> 3 tentatives en cas d'échec</li>
          <li>• <strong>Monitoring temps réel :</strong> Statut complet visible ci-dessus</li>
        </ul>
      </div>
    </div>
  );
} 