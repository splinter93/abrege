"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';
import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';

export default function TestPollingFixes() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { classeurs, folders, notes } = useFileSystemStore();
  const v2Api = V2UnifiedApi.getInstance();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Classeurs: ${Object.keys(classeurs).length}, Dossiers: ${Object.keys(folders).length}, Notes: ${Object.keys(notes).length}`);
  }, [classeurs, folders, notes]);

  const testCreateClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('🏗️ Test création classeur...');
      
      const result = await v2Api.createClasseur({
        name: `Test Classeur ${Date.now()}`,
        description: 'Classeur de test pour polling'
      });
      
      addLog(`✅ Classeur créé: ${result.classeur.name} (ID: ${result.classeur.id})`);
      addLog(`⏱️ Durée: ${result.duration}ms`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteClasseur = async () => {
    setIsLoading(true);
    try {
      const classeursArray = Object.values(classeurs);
      if (classeursArray.length === 0) {
        addLog('❌ Aucun classeur à supprimer');
        return;
      }

      const classeurToDelete = classeursArray[classeursArray.length - 1];
      addLog(`🗑️ Test suppression classeur: ${classeurToDelete.name}`);
      
      const result = await v2Api.deleteClasseur(classeurToDelete.id);
      
      addLog(`✅ Classeur supprimé: ${classeurToDelete.name}`);
      if ('duration' in result) {
        addLog(`⏱️ Durée: ${result.duration}ms`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateNote = async () => {
    setIsLoading(true);
    try {
      const classeursArray = Object.values(classeurs);
      if (classeursArray.length === 0) {
        addLog('❌ Aucun classeur disponible pour créer une note');
        return;
      }

      const classeur = classeursArray[0];
      addLog(`📝 Test création note dans classeur: ${classeur.name}`);
      
      const result = await v2Api.createNote({
        source_title: `Test Note ${Date.now()}`,
        notebook_id: classeur.id,
        markdown_content: '# Test Note\n\nCeci est une note de test.'
      });
      
      addLog(`✅ Note créée: ${result.note.source_title} (ID: ${result.note.id})`);
      addLog(`⏱️ Durée: ${result.duration}ms`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteNote = async () => {
    setIsLoading(true);
    try {
      const notesArray = Object.values(notes);
      if (notesArray.length === 0) {
        addLog('❌ Aucune note à supprimer');
        return;
      }

      const noteToDelete = notesArray[notesArray.length - 1];
      addLog(`🗑️ Test suppression note: ${noteToDelete.source_title}`);
      
      const result = await v2Api.deleteNote(noteToDelete.id);
      
      addLog(`✅ Note supprimée: ${noteToDelete.source_title}`);
      addLog(`⏱️ Durée: ${result.duration}ms`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolder = async () => {
    setIsLoading(true);
    try {
      const classeursArray = Object.values(classeurs);
      if (classeursArray.length === 0) {
        addLog('❌ Aucun classeur disponible pour créer un dossier');
        return;
      }

      const classeur = classeursArray[0];
      addLog(`📁 Test création dossier dans classeur: ${classeur.name}`);
      
      const result = await v2Api.createFolder({
        name: `Test Dossier ${Date.now()}`,
        notebook_id: classeur.id
      });
      
      addLog(`✅ Dossier créé: ${result.folder.name} (ID: ${result.folder.id})`);
      addLog(`⏱️ Durée: ${result.duration}ms`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteFolder = async () => {
    setIsLoading(true);
    try {
      const foldersArray = Object.values(folders);
      if (foldersArray.length === 0) {
        addLog('❌ Aucun dossier à supprimer');
        return;
      }

      const folderToDelete = foldersArray[foldersArray.length - 1];
      addLog(`🗑️ Test suppression dossier: ${folderToDelete.name}`);
      
      const result = await v2Api.deleteFolder(folderToDelete.id);
      
      addLog(`✅ Dossier supprimé: ${folderToDelete.name}`);
      if ('duration' in result) {
        addLog(`⏱️ Durée: ${result.duration}ms`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testManualPolling = async () => {
    setIsLoading(true);
    try {
      addLog('🔄 Test polling manuel...');
      
      await Promise.all([
        triggerUnifiedRealtimePolling('classeurs', 'UPDATE'),
        triggerUnifiedRealtimePolling('folders', 'UPDATE'),
        triggerUnifiedRealtimePolling('notes', 'UPDATE')
      ]);
      
      addLog('✅ Polling manuel terminé');
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = () => {
    const status = getUnifiedRealtimeStatus();
    addLog(`📊 Status Realtime: ${status.provider} - Connected: ${status.isConnected}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Test des Corrections de Polling</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de contrôle */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🎮 Tests de Polling</h2>
          
          <div className="space-y-3">
            <button
              onClick={testCreateClasseur}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              🏗️ Créer Classeur
            </button>
            
            <button
              onClick={testDeleteClasseur}
              disabled={isLoading}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              🗑️ Supprimer Classeur
            </button>
            
            <button
              onClick={testCreateNote}
              disabled={isLoading}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              📝 Créer Note
            </button>
            
            <button
              onClick={testDeleteNote}
              disabled={isLoading}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              🗑️ Supprimer Note
            </button>
            
            <button
              onClick={testCreateFolder}
              disabled={isLoading}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              📁 Créer Dossier
            </button>
            
            <button
              onClick={testDeleteFolder}
              disabled={isLoading}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              🗑️ Supprimer Dossier
            </button>
            
            <hr className="my-4" />
            
            <button
              onClick={testManualPolling}
              disabled={isLoading}
              className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              🔄 Polling Manuel
            </button>
            
            <button
              onClick={getStatusInfo}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              📊 Status Realtime
            </button>
            
            <button
              onClick={() => setLogs([])}
              className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              🧹 Vider les logs
            </button>
          </div>
        </div>
        
        {/* État du store */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📊 État du Store</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800">📚 Classeurs ({Object.keys(classeurs).length})</h3>
              <div className="text-sm text-blue-600 mt-2">
                {Object.values(classeurs).map(c => (
                  <div key={c.id} className="truncate">
                    • {c.name} ({c.id.slice(0, 8)}...)
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded">
              <h3 className="font-semibold text-purple-800">📁 Dossiers ({Object.keys(folders).length})</h3>
              <div className="text-sm text-purple-600 mt-2">
                {Object.values(folders).slice(0, 5).map(f => (
                  <div key={f.id} className="truncate">
                    • {f.name} ({f.id.slice(0, 8)}...)
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded">
              <h3 className="font-semibold text-green-800">📝 Notes ({Object.keys(notes).length})</h3>
              <div className="text-sm text-green-600 mt-2">
                {Object.values(notes).slice(0, 5).map(n => (
                  <div key={n.id} className="truncate">
                    • {n.source_title} ({n.id.slice(0, 8)}...)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Logs */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📝 Logs de Test</h2>
        <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500">Aucun log pour le moment...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 