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
      await triggerUnifiedRealtimePolling('notes', 'CREATE');
      addLog('✅ Notes: Polling déclenché');
      
      // Test 2: Polling des dossiers
      addLog('📁 Test 2: Polling des dossiers...');
      await triggerUnifiedRealtimePolling('folders', 'CREATE');
      addLog('✅ Dossiers: Polling déclenché');
      
      // Test 3: Polling des classeurs
      addLog('📚 Test 3: Polling des classeurs...');
      await triggerUnifiedRealtimePolling('classeurs', 'CREATE');
      addLog('✅ Classeurs: Polling déclenché');
      
      // Test 4: Polling simultané
      addLog('⚡ Test 4: Polling simultané...');
      const promises = [
        triggerUnifiedRealtimePolling('notes', 'UPDATE'),
        triggerUnifiedRealtimePolling('folders', 'UPDATE'),
        triggerUnifiedRealtimePolling('classeurs', 'UPDATE')
      ];
      
      await Promise.all(promises);
      addLog('✅ Polling simultané terminé');
      
      addLog('🎉 Test complet terminé avec succès !');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testDeleteRealtime = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression temps réel...');
    
    try {
      // Créer d'abord une note de test
      const testNote = {
        source_title: `Test Delete ${Date.now()}`,
        notebook_id: Object.keys(classeurs)[0] || 'test',
        markdown_content: 'Note de test pour suppression'
      };
      
      addLog('📝 Création note de test...');
      const createResult = await fetch('/api/v2/note/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testNote)
      });
      
      if (!createResult.ok) {
        addLog('❌ Erreur création note de test');
        setIsRunning(false);
        return;
      }
      
      const createdNote = await createResult.json();
      addLog(`✅ Note créée: ${createdNote.note.id}`);
      
      // Attendre que la note apparaisse dans le store
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const noteId = createdNote.note.id;
      const startCount = Object.keys(notes).length;
      addLog(`📊 Notes avant suppression: ${startCount}`);
      
      // Supprimer la note
      addLog('🗑️ Suppression de la note...');
      const deleteResult = await fetch(`/api/v2/note/${noteId}/delete`, {
        method: 'DELETE'
      });
      
      if (!deleteResult.ok) {
        addLog('❌ Erreur suppression note');
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Note supprimée via API');
      
      // Vérifier que la suppression est visible en temps réel
      let checks = 0;
      const maxChecks = 10;
      const checkInterval = setInterval(() => {
        checks++;
        const currentCount = Object.keys(notes).length;
        const noteStillExists = notes[noteId];
        
        addLog(`🔍 Vérification ${checks}/${maxChecks} - Notes: ${currentCount}, Note existe: ${noteStillExists ? 'OUI' : 'NON'}`);
        
        if (!noteStillExists && currentCount < startCount) {
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
          onClick={testDeleteRealtime}
          disabled={isRunning}
          className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-purple-600"
        >
          🧪 Test Suppression Temps Réel
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
                <span className={`font-mono ${status.isConnected ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.isConnected ? '🟢 Connecté' : '⚪ Déconnecté'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Provider:</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {status.provider}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Dernier événement:</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {status.lastEvent || 'Aucun'}
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