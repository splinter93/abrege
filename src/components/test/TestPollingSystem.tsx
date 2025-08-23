"use client";

import { useState, useEffect } from 'react';
import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus, stopUnifiedRealtimeService } from '@/services/unifiedRealtimeService';
import { useFileSystemStore } from '@/store/useFileSystemStore';

/**
 * Composant de test complet pour le système de polling intelligent V2
 */
export default function TestPollingSystem() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<any>(null);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Monitoring en temps réel du statut
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = getUnifiedRealtimeStatus();
      setStatus(currentStatus);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const runFullTest = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🚀 Démarrage du test complet du système de polling V2...');
    
    try {
      // Test 1: Polling des notes
      addLog('📝 Test 1: Polling des notes...');
      const notesResult = await triggerUnifiedRealtimePolling('notes', 'CREATE');
      addLog(`✅ Notes: ${notesResult.success ? 'Succès' : 'Échec'} - ${notesResult.dataCount || 0} éléments`);
      
      // Test 2: Polling des dossiers
      addLog('📁 Test 2: Polling des dossiers...');
      const foldersResult = await triggerUnifiedRealtimePolling('folders', 'CREATE');
      addLog(`✅ Dossiers: ${foldersResult.success ? 'Succès' : 'Échec'} - ${foldersResult.dataCount || 0} éléments`);
      
      // Test 3: Polling des classeurs
      addLog('📚 Test 3: Polling des classeurs...');
      const classeursResult = await triggerUnifiedRealtimePolling('classeurs', 'CREATE');
      addLog(`✅ Classeurs: ${classeursResult.success ? 'Succès' : 'Échec'} - ${classeursResult.dataCount || 0} éléments`);
      
      // Test 4: Polling simultané
      addLog('⚡ Test 4: Polling simultané...');
      const promises = [
        triggerUnifiedRealtimePolling('notes', 'UPDATE'),
        triggerUnifiedRealtimePolling('folders', 'UPDATE'),
        triggerUnifiedRealtimePolling('classeurs', 'UPDATE')
      ];
      
      const results = await Promise.all(promises);
      results.forEach((result, index) => {
        const types = ['notes', 'dossiers', 'classeurs'];
        addLog(`✅ ${types[index]} simultané: ${result.success ? 'Succès' : 'Échec'}`);
      });
      
      addLog('🎉 Test complet terminé avec succès !');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testQueuePriority = async () => {
    addLog('🎯 Test de priorité de la queue...');
    
    // Ajouter des opérations dans un ordre spécifique
    const operations = [
      { entityType: 'notes', operation: 'CREATE', priority: 'Basse' },
      { entityType: 'folders', operation: 'UPDATE', priority: 'Moyenne' },
      { entityType: 'classeurs', operation: 'DELETE', priority: 'Haute' }
    ];
    
    for (const op of operations) {
      addLog(`📋 Ajout: ${op.entityType} ${op.operation} (${op.priority})`);
      triggerUnifiedRealtimePolling({
        entityType: op.entityType as any,
        operation: op.operation as any,
        entityId: `test-${op.entityType}`,
        delay: 100
      });
    }
    
    addLog('⏳ Attente du traitement de la queue...');
  };

  const clearLogs = () => {
    setTestResults([]);
    addLog('🧹 Logs effacés');
  };

  const stopService = () => {
    stopUnifiedRealtimeService();
    addLog('🛑 Service de polling arrêté');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Complet - Système de Polling Intelligent V2</h1>
      
      {/* Contrôles de test */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={runFullTest}
          disabled={isRunning}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-600"
        >
          {isRunning ? '⏳ Test en cours...' : '🚀 Test Complet'}
        </button>
        
        <button
          onClick={testQueuePriority}
          disabled={isRunning}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600"
        >
          🎯 Test Priorité Queue
        </button>
        
        <button
          onClick={stopService}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          🛑 Arrêter Service
        </button>
        
        <button
          onClick={clearLogs}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          🧹 Effacer Logs
        </button>
      </div>

      {/* Monitoring en temps réel */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Statut du service */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">📊 Statut du Service</h3>
          {status && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-mono ${status.isPolling ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.isPolling ? '🟢 Polling actif' : '⚪ En attente'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Queue:</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {status.queueLength} éléments
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Résultats:</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {status.lastResults.size} entités
                </span>
              </div>
            </div>
          )}
        </div>

        {/* État du store */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">💾 État du Store</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Notes:</span>
              <span className="font-mono bg-green-100 px-2 py-1 rounded">
                {Object.keys(notes).length}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Dossiers:</span>
              <span className="font-mono bg-green-100 px-2 py-1 rounded">
                {Object.keys(folders).length}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Classeurs:</span>
              <span className="font-mono bg-green-100 px-2 py-1 rounded">
                {Object.keys(classeurs).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Derniers résultats de polling */}
      {status && status.lastResults.size > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-3">📈 Derniers Résultats de Polling</h3>
          <div className="grid grid-cols-3 gap-4">
            {Array.from(status.lastResults.entries()).map(([key, result]: [string, any]) => (
              <div key={key} className="bg-white p-3 rounded border">
                <div className="font-medium capitalize text-sm">{key}</div>
                <div className={`text-lg ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.success ? '✅' : '❌'}
                </div>
                {result.dataCount !== undefined && (
                  <div className="text-xs text-gray-600">
                    {result.dataCount} éléments
                  </div>
                )}
                {result.error && (
                  <div className="text-xs text-red-600 truncate" title={result.error}>
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs de test */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">📋 Logs de Test</h3>
          <span className="text-sm text-gray-500">
            {testResults.length} messages
          </span>
        </div>
        <div className="space-y-1 text-sm font-mono max-h-96 overflow-y-auto bg-gray-50 p-3 rounded">
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun log disponible. Lancez un test pour commencer.
            </div>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="p-2 bg-white rounded border-l-4 border-blue-400">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 