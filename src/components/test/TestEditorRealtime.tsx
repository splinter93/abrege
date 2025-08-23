"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedRealtimePolling } from '@/services/unifiedRealtimeService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour vérifier que le temps réel fonctionne dans l'éditeur
 */
export default function TestEditorRealtime() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Notes: ${Object.keys(notes).length}, Dossiers: ${Object.keys(folders).length}, Classeurs: ${Object.keys(classeurs).length}`);
  }, [notes, folders, classeurs]);

  const testPollingNotes = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test polling des notes...');
      
      const result = await triggerUnifiedRealtimePolling('notes', 'UPDATE');

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId || 'N/A'}`);
      addLog(`⏱️ Délai: 1 seconde`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPollingFolders = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test polling des dossiers...');
      
      const result = await triggerUnifiedRealtimePolling('folders', 'UPDATE');

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId || 'N/A'}`);
      addLog(`⏱️ Délai: 1 seconde`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPollingClasseurs = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test polling des classeurs...');
      
      const result = await triggerUnifiedRealtimePolling('classeurs', 'UPDATE');

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId || 'N/A'}`);
      addLog(`⏱️ Délai: 1 seconde`);
      
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
    <div className="fixed bottom-4 right-4 z-50 bg-white border rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">🧪 Test Temps Réel Éditeur</h3>
        <button
          onClick={clearLogs}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Effacer
        </button>
      </div>
      
      <div className="space-y-2 mb-3">
        <button
          onClick={testPollingNotes}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Polling Notes
        </button>
        
        <button
          onClick={testPollingFolders}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Polling Dossiers
        </button>
        
        <button
          onClick={testPollingClasseurs}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Polling Classeurs
        </button>
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        📊 Store: {Object.keys(notes).length} notes, {Object.keys(folders).length} dossiers, {Object.keys(classeurs).length} classeurs
      </div>
      
      <div className="max-h-32 overflow-y-auto text-xs space-y-1">
        {testResults.map((result, index) => (
          <div key={index} className="text-gray-700">
            {result}
          </div>
        ))}
      </div>
    </div>
  );
} 