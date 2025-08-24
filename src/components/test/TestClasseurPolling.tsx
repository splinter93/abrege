"use client";

import { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedRealtimePolling } from '@/services/unifiedRealtimeService';

/**
 * Composant de test spécifique pour le polling des classeurs
 */
export default function TestClasseurPolling() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testClasseurPolling = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test polling des classeurs...');
    
    try {
      // Test 1: Polling CREATE
      addLog('📚 Test 1: Polling CREATE classeurs...');
      await triggerUnifiedRealtimePolling('classeurs', 'CREATE');
      addLog('✅ Polling CREATE déclenché');
      
      // Test 2: Polling UPDATE
      addLog('✏️ Test 2: Polling UPDATE classeurs...');
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');
      addLog('✅ Polling UPDATE déclenché');
      
      // Test 3: Polling DELETE
      addLog('🗑️ Test 3: Polling DELETE classeurs...');
      await triggerUnifiedRealtimePolling('classeurs', 'DELETE');
      addLog('✅ Polling DELETE déclenché');
      
      addLog('🎉 Tests de polling terminés !');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testClasseurDeletion = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression classeur en temps réel...');
    
    try {
      const classeursArray = Object.values(classeurs);
      if (classeursArray.length === 0) {
        addLog('❌ Aucun classeur disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      const classeurToDelete = classeursArray[0];
      const startCount = classeursArray.length;
      addLog(`📊 Classeurs avant suppression: ${startCount}`);
      addLog(`🎯 Classeur à supprimer: ${classeurToDelete.name} (${classeurToDelete.id})`);
      
      // Supprimer le classeur via l'API
      addLog('🗑️ Suppression du classeur via API...');
      const deleteResult = await fetch(`/api/v2/classeur/${classeurToDelete.id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!deleteResult.ok) {
        addLog('❌ Erreur suppression classeur');
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Classeur supprimé via API');
      
      // Vérifier que la suppression est visible en temps réel
      let checks = 0;
      const maxChecks = 15;
      const checkInterval = setInterval(() => {
        checks++;
        const currentClasseurs = useFileSystemStore.getState().classeurs;
        const currentCount = Object.keys(currentClasseurs).length;
        const classeurStillExists = currentClasseurs[classeurToDelete.id];
        
        addLog(`🔍 Vérification ${checks}/${maxChecks} - Classeurs: ${currentCount}, Classeur existe: ${classeurStillExists ? 'OUI' : 'NON'}`);
        
        if (!classeurStillExists && currentCount < startCount) {
          addLog('🎯 SUPPRESSION DÉTECTÉE EN TEMPS RÉEL !');
          clearInterval(checkInterval);
          setIsRunning(false);
        } else if (checks >= maxChecks) {
          addLog('⏰ Timeout - Suppression non détectée');
          clearInterval(checkInterval);
          setIsRunning(false);
        }
      }, 500);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression: ${error}`);
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
    addLog('🧹 Logs effacés');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Polling des Classeurs</h1>
      
      {/* Contrôles de test */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={testClasseurPolling}
          disabled={isRunning}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-600"
        >
          {isRunning ? '⏳ Test en cours...' : '🚀 Test Polling'}
        </button>
        
        <button
          onClick={testClasseurDeletion}
          disabled={isRunning}
          className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-red-600"
        >
          🗑️ Test Suppression Temps Réel
        </button>
        
        <button
          onClick={clearLogs}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          🧹 Effacer Logs
        </button>
      </div>

      {/* État du store */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-3">💾 État du Store Classeurs</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Classeurs:</span>
            <span className="font-mono bg-green-100 px-2 py-1 rounded">
              {Object.keys(classeurs).length}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Détails:</span>
            <span className="font-mono bg-green-100 px-2 py-1 rounded text-xs">
              {Object.keys(classeurs).length > 0 
                ? Object.values(classeurs).map(c => c.name).join(', ')
                : 'Aucun classeur'
              }
            </span>
          </div>
        </div>
      </div>

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