"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';

export default function TestPollingComplete() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { classeurs, folders, notes } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Classeurs: ${Object.keys(classeurs).length}, Folders: ${Object.keys(folders).length}, Notes: ${Object.keys(notes).length}`);
  }, [classeurs, folders, notes]);

  const testEndpoint = async (endpoint: string, method: string, body?: any) => {
    setIsLoading(true);
    addLog(`🚀 Test ${method} ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const result = await response.json();
      
      if (response.ok) {
        addLog(`✅ ${method} ${endpoint} - Succès`);
        if (result.success) {
          addLog(`📝 Réponse: ${JSON.stringify(result, null, 2)}`);
        }
      } else {
        addLog(`❌ ${method} ${endpoint} - Erreur ${response.status}: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      addLog(`💥 ${method} ${endpoint} - Exception: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAllEndpoints = async () => {
    addLog('🧪 DÉBUT DES TESTS COMPLETS DE TOUS LES ENDPOINTS');
    
    // Test des créations
    addLog('📝 Test des endpoints de création...');
    await testEndpoint('/api/v2/classeur/create', 'POST', {
      name: 'Test Classeur Polling',
      description: 'Test du polling automatique'
    });
    
    await testEndpoint('/api/v2/folder/create', 'POST', {
      name: 'Test Folder Polling',
      notebook_id: Object.keys(classeurs)[0] || 'test-id'
    });
    
    await testEndpoint('/api/v2/note/create', 'POST', {
      source_title: 'Test Note Polling',
      markdown_content: '# Test\n\nContenu de test pour le polling',
      notebook_id: Object.keys(classeurs)[0] || 'test-id'
    });
    
    // Test des mises à jour
    addLog('🔄 Test des endpoints de mise à jour...');
    if (Object.keys(notes).length > 0) {
      const noteId = Object.keys(notes)[0];
      await testEndpoint(`/api/v2/note/${noteId}/update`, 'PUT', {
        source_title: 'Note Mise à Jour - Polling Test'
      });
      
      await testEndpoint(`/api/v2/note/${noteId}/add-content`, 'POST', {
        content: '\n\n## Nouveau contenu ajouté\n\nTest du polling automatique.'
      });
    }
    
    // Test des suppressions
    addLog('🗑️ Test des endpoints de suppression...');
    if (Object.keys(notes).length > 0) {
      const noteId = Object.keys(notes)[0];
      await testEndpoint(`/api/v2/note/${noteId}/delete`, 'DELETE');
    }
    
    if (Object.keys(folders).length > 0) {
      const folderId = Object.keys(folders)[0];
      await testEndpoint(`/api/v2/folder/${folderId}/delete`, 'DELETE');
    }
    
    if (Object.keys(classeurs).length > 0) {
      const classeurId = Object.keys(classeurs)[0];
      await testEndpoint(`/api/v2/classeur/${classeurId}/delete`, 'DELETE');
    }
    
    addLog('✅ TOUS LES TESTS TERMINÉS');
  };

  const checkPollingStatus = async () => {
    try {
      const status = await getUnifiedRealtimeStatus();
      addLog(`📊 Statut du polling: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      addLog(`❌ Erreur lors de la vérification du statut: ${error}`);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🧪 Test Complet du Système de Polling
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎯 Actions de Test</h2>
            
            <div className="space-y-3">
              <button
                onClick={testAllEndpoints}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Tests en cours...' : '🧪 Tester TOUS les Endpoints'}
              </button>
              
              <button
                onClick={checkPollingStatus}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                📊 Vérifier Statut Polling
              </button>
              
              <button
                onClick={clearLogs}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                🗑️ Effacer Logs
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📊 État du Store</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>📁 Classeurs:</span>
                <span className="font-mono">{Object.keys(classeurs).length}</span>
              </div>
              <div className="flex justify-between">
                <span>📂 Dossiers:</span>
                <span className="font-mono">{Object.keys(folders).length}</span>
              </div>
              <div className="flex justify-between">
                <span>📝 Notes:</span>
                <span className="font-mono">{Object.keys(notes).length}</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <div className="font-semibold mb-2">🔍 Détails:</div>
              <div>Classeurs: {Object.keys(classeurs).slice(0, 3).join(', ')}...</div>
              <div>Dossiers: {Object.keys(folders).slice(0, 3).join(', ')}...</div>
              <div>Notes: {Object.keys(notes).slice(0, 3).join(', ')}...</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📋 Logs des Tests</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Aucun log pour le moment. Cliquez sur "Tester TOUS les Endpoints" pour commencer.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🎯 Objectif des Tests</h3>
          <p className="text-blue-800 text-sm">
            Cette page teste que <strong>TOUS</strong> les endpoints API V2 déclenchent automatiquement le polling 
            après chaque opération (CREATE, UPDATE, DELETE). Chaque action doit être visible immédiatement 
            dans l'interface sans rafraîchissement manuel.
          </p>
        </div>
      </div>
    </div>
  );
} 