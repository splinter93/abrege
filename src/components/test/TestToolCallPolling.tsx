/**
 * 🧪 Composant de Test pour le Polling des Tool Calls
 * 
 * Teste le système de polling intelligent déclenché par les tool calls
 */

"use client";

import { useState } from 'react';
import { triggerUnifiedRealtimePolling } from '@/services/unifiedRealtimeService';

export default function TestToolCallPolling() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const testUserId = 'test-user-123';

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testCreateNote = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note avec polling intelligent...');
      
      // Simuler la création d'une note via tool call
      await triggerUnifiedRealtimePolling('notes', 'CREATE');

      addLog(`✅ Polling déclenché: notes CREATE`);
      addLog(`🆔 Entity ID: test-note`);
      addLog(`👤 User ID: ${testUserId.substring(0, 8)}...`);
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
      
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');

      addLog(`✅ Polling déclenché: notes UPDATE`);
      addLog(`🆔 Entity ID: test-note`);
      addLog(`⏱️ Délai: 500ms`);
      
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
      
      await triggerUnifiedRealtimePolling('notes', 'DELETE');

      addLog(`✅ Polling déclenché: notes DELETE`);
      addLog(`🆔 Entity ID: test-note`);
      addLog(`⏱️ Délai: 0ms (priorité haute)`);
      
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
      
      await triggerUnifiedRealtimePolling('folders', 'CREATE');

      addLog(`✅ Polling déclenché: folders CREATE`);
      addLog(`🆔 Entity ID: test-folder`);
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
      
      await triggerUnifiedRealtimePolling('folders', 'MOVE');

      addLog(`✅ Polling déclenché: folders MOVE`);
      addLog(`🆔 Entity ID: test-folder`);
      addLog(`⏱️ Délai: 800ms`);
      
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
      
      await triggerUnifiedRealtimePolling('classeurs', 'CREATE');

      addLog(`✅ Polling déclenché: classeurs CREATE`);
      addLog(`🆔 Entity ID: test-classeur`);
      addLog(`⏱️ Délai: 2 secondes`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('✏️ Test mise à jour classeur avec polling intelligent...');
      
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');

      addLog(`✅ Polling déclenché: classeurs UPDATE`);
      addLog(`🆔 Entity ID: test-classeur`);
      addLog(`⏱️ Délai: 800ms`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('🗑️ Test suppression classeur avec polling intelligent...');
      
      await triggerUnifiedRealtimePolling('classeurs', 'DELETE');

      addLog(`✅ Polling déclenché: classeurs DELETE`);
      addLog(`🆔 Entity ID: test-classeur`);
      addLog(`⏱️ Délai: 0ms (priorité haute)`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleOperations = async () => {
    setIsLoading(true);
    try {
      addLog('🚀 Test opérations multiples avec polling intelligent...');
      
      // Créer une note
      await triggerUnifiedRealtimePolling('notes', 'CREATE');
      addLog('✅ Polling notes CREATE déclenché');
      
      // Créer un dossier
      await triggerUnifiedRealtimePolling('folders', 'CREATE');
      addLog('✅ Polling folders CREATE déclenché');
      
      // Mettre à jour le classeur
      await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');
      addLog('✅ Polling classeurs UPDATE déclenché');
      
      addLog('🎉 Tous les pollings ont été déclenchés avec succès !');
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Polling des Tool Calls</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">📋 Description</h2>
        <p className="text-gray-600">
          Ce composant teste le système de polling intelligent déclenché automatiquement 
          après chaque exécution de tool call. Le polling se déclenche immédiatement 
          et met à jour l'interface en temps réel.
        </p>
      </div>

      {/* Boutons de Test */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCreateNote}
          disabled={isLoading}
          className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📝'} Créer Note
        </button>
        
        <button
          onClick={testUpdateNote}
          disabled={isLoading}
          className="p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '✏️'} Mettre à Jour Note
        </button>
        
        <button
          onClick={testDeleteNote}
          disabled={isLoading}
          className="p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '🗑️'} Supprimer Note
        </button>
        
        <button
          onClick={testCreateFolder}
          disabled={isLoading}
          className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📁'} Créer Dossier
        </button>
        
        <button
          onClick={testMoveFolder}
          disabled={isLoading}
          className="p-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📦'} Déplacer Dossier
        </button>
        
        <button
          onClick={testCreateClasseur}
          disabled={isLoading}
          className="p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📚'} Créer Classeur
        </button>
        
        <button
          onClick={testUpdateClasseur}
          disabled={isLoading}
          className="p-3 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '✏️'} Mettre à Jour Classeur
        </button>
        
        <button
          onClick={testDeleteClasseur}
          disabled={isLoading}
          className="p-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '🗑️'} Supprimer Classeur
        </button>
        
        <button
          onClick={testMultipleOperations}
          disabled={isLoading}
          className="p-3 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 col-span-2"
        >
          {isLoading ? '⏳' : '🚀'} Test Opérations Multiples
        </button>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <button
          onClick={clearLogs}
          className="p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          🗑️ Effacer les Logs
        </button>
      </div>

      {/* Logs */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">📝 Logs en Temps Réel</h2>
        <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">Aucun test exécuté</p>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 