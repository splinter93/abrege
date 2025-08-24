"use client";

import { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedRealtimePolling } from '@/services/unifiedRealtimeService';

/**
 * Composant de test spécifique pour le polling des notes et dossiers
 */
export default function TestNotesFoldersPolling() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testNotesPolling = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test polling des notes...');
    
    try {
      const notesArray = Object.values(notes);
      addLog(`📊 Notes disponibles: ${notesArray.length}`);
      
      if (notesArray.length === 0) {
        addLog('❌ Aucune note disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      // Test du polling des notes
      addLog('🔄 Déclenchement du polling des notes...');
      await triggerUnifiedRealtimePolling('notes', 'CREATE');
      addLog('✅ Polling des notes déclenché');
      
    } catch (error) {
      addLog(`❌ Erreur test polling notes: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testFoldersPolling = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test polling des dossiers...');
    
    try {
      const foldersArray = Object.values(folders);
      addLog(`📊 Dossiers disponibles: ${foldersArray.length}`);
      
      if (foldersArray.length === 0) {
        addLog('❌ Aucun dossier disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      // Test du polling des dossiers
      addLog('🔄 Déclenchement du polling des dossiers...');
      await triggerUnifiedRealtimePolling('folders', 'CREATE');
      addLog('✅ Polling des dossiers déclenché');
      
    } catch (error) {
      addLog(`❌ Erreur test polling dossiers: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testNotesDeletion = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression note en temps réel...');
    
    try {
      const notesArray = Object.values(notes);
      if (notesArray.length === 0) {
        addLog('❌ Aucune note disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      const noteToDelete = notesArray[0];
      const startCount = notesArray.length;
      addLog(`📊 Notes avant suppression: ${startCount}`);
      addLog(`🎯 Note à supprimer: ${noteToDelete.source_title} (${noteToDelete.id})`);
      
      // Supprimer la note via l'API
      addLog('🗑️ Suppression de la note via API...');
      const deleteResult = await fetch(`/api/v2/note/${noteToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Note supprimée via API');
      addLog('⏳ Attente de la synchronisation temps réel...');
      
      // Attendre la synchronisation
      setTimeout(() => {
        const currentNotes = Object.values(useFileSystemStore.getState().notes);
        const endCount = currentNotes.length;
        addLog(`📊 Notes après suppression: ${endCount}`);
        
        if (endCount < startCount) {
          addLog('✅ Suppression visible en temps réel !');
        } else {
          addLog('❌ Suppression non visible en temps réel');
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression note: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testFoldersDeletion = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression dossier en temps réel...');
    
    try {
      const foldersArray = Object.values(folders);
      if (foldersArray.length === 0) {
        addLog('❌ Aucun dossier disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      const folderToDelete = foldersArray[0];
      const startCount = foldersArray.length;
      addLog(`📊 Dossiers avant suppression: ${startCount}`);
      addLog(`🎯 Dossier à supprimer: ${folderToDelete.name} (${folderToDelete.id})`);
      
      // Supprimer le dossier via l'API
      addLog('🗑️ Suppression du dossier via API...');
      const deleteResult = await fetch(`/api/v2/folder/${folderToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Dossier supprimé via API');
      addLog('⏳ Attente de la synchronisation temps réel...');
      
      // Attendre la synchronisation
      setTimeout(() => {
        const currentFolders = Object.values(useFileSystemStore.getState().folders);
        const endCount = currentFolders.length;
        addLog(`📊 Dossiers après suppression: ${endCount}`);
        
        if (endCount < startCount) {
          addLog('✅ Suppression visible en temps réel !');
        } else {
          addLog('❌ Suppression non visible en temps réel');
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression dossier: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Notes: ${Object.keys(notes).length}, Dossiers: ${Object.keys(folders).length}, Classeurs: ${Object.keys(classeurs).length}`);
  }, [notes, folders, classeurs]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Test du Polling des Notes et Dossiers
        </h2>
        <p className="text-gray-600">
          Testez en temps réel la suppression des notes et dossiers avec le nouveau système de polling intelligent.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testNotesPolling}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          🔄 Test Polling Notes
        </button>
        
        <button
          onClick={testFoldersPolling}
          disabled={isRunning}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          🔄 Test Polling Dossiers
        </button>
        
        <button
          onClick={testNotesDeletion}
          disabled={isRunning}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          🗑️ Test Suppression Note
        </button>
        
        <button
          onClick={testFoldersDeletion}
          disabled={isRunning}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          🗑️ Test Suppression Dossier
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">📊 État du Store</h3>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <div className="bg-gray-100 p-3 rounded text-sm">
          <div>📝 Notes: {Object.keys(notes).length}</div>
          <div>📁 Dossiers: {Object.keys(folders).length}</div>
          <div>📚 Classeurs: {Object.keys(classeurs).length}</div>
        </div>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
        {testResults.length === 0 ? (
          <div className="text-gray-500">Aucun test exécuté...</div>
        ) : (
          testResults.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
} 