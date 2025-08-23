"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export default function TestDeletePolling() {
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

  const testDelete = async (type: 'note' | 'folder' | 'classeur') => {
    setIsLoading(true);
    addLog(`🗑️ Test suppression ${type}`);
    
    try {
      let id: string;
      let endpoint: string;
      
      switch (type) {
        case 'note':
          if (Object.keys(notes).length === 0) {
            addLog(`❌ Aucune note disponible pour la suppression`);
            setIsLoading(false);
            return;
          }
          id = Object.keys(notes)[0];
          endpoint = `/api/v2/note/${id}/delete`;
          break;
        case 'folder':
          if (Object.keys(folders).length === 0) {
            addLog(`❌ Aucun dossier disponible pour la suppression`);
            setIsLoading(false);
            return;
          }
          id = Object.keys(folders)[0];
          endpoint = `/api/v2/folder/${id}/delete`;
          break;
        case 'classeur':
          if (Object.keys(classeurs).length === 0) {
            addLog(`❌ Aucun classeur disponible pour la suppression`);
            setIsLoading(false);
            return;
          }
          id = Object.keys(classeurs)[0];
          endpoint = `/api/v2/classeur/${id}/delete`;
          break;
      }
      
      addLog(`🎯 Suppression de ${type} avec ID: ${id}`);
      addLog(`🔗 Endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        addLog(`✅ Suppression ${type} réussie`);
        addLog(`📝 Réponse: ${JSON.stringify(result, null, 2)}`);
        
        // Vérifier que le store a été mis à jour
        setTimeout(() => {
          const currentStore = useFileSystemStore.getState();
          const currentCount = type === 'note' ? Object.keys(currentStore.notes).length 
                             : type === 'folder' ? Object.keys(currentStore.folders).length
                             : Object.keys(currentStore.classeurs).length;
          
          addLog(`🔍 Vérification store après 1s - ${type}s restants: ${currentCount}`);
          
          if (currentCount === 0) {
            addLog(`✅ Store correctement mis à jour - ${type} supprimé du store`);
          } else {
            addLog(`❌ Store non mis à jour - ${type} toujours présent dans le store`);
          }
        }, 1000);
        
      } else {
        addLog(`❌ Erreur suppression ${type}: ${response.status} - ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      addLog(`💥 Exception lors de la suppression ${type}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🗑️ Test Spécifique des Suppressions + Polling
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎯 Tests de Suppression</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => testDelete('note')}
                disabled={isLoading || Object.keys(notes).length === 0}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Suppression...' : `🗑️ Supprimer Note (${Object.keys(notes).length} disponible)`}
              </button>
              
              <button
                onClick={() => testDelete('folder')}
                disabled={isLoading || Object.keys(folders).length === 0}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Suppression...' : `🗑️ Supprimer Dossier (${Object.keys(folders).length} disponible)`}
              </button>
              
              <button
                onClick={() => testDelete('classeur')}
                disabled={isLoading || Object.keys(classeurs).length === 0}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Suppression...' : `🗑️ Supprimer Classeur (${Object.keys(classeurs).length} disponible)`}
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
          <h2 className="text-xl font-semibold mb-4">📋 Logs des Tests de Suppression</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                Aucun log pour le moment. Cliquez sur un bouton de suppression pour tester le polling en temps réel.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">🎯 Objectif du Test</h3>
          <p className="text-red-800 text-sm">
            Cette page teste spécifiquement que les <strong>suppressions</strong> déclenchent bien le polling 
            automatiquement et que le store Zustand est mis à jour en temps réel. 
            Chaque suppression doit être visible immédiatement dans l'interface sans rafraîchissement manuel.
          </p>
        </div>
      </div>
    </div>
  );
} 