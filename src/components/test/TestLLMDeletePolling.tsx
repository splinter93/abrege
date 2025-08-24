"use client";

import { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

/**
 * Composant de test spécifique pour vérifier que les suppressions LLM sont bien visibles en temps réel
 */
export default function TestLLMDeletePolling() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testLLMDeleteNote = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression note via LLM...');
    
    try {
      const notesArray = Object.values(notes);
      if (notesArray.length === 0) {
        addLog('❌ Aucune note disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      const noteToDelete = notesArray[0];
      const startCount = notesArray.length;
      addLog(`📊 Notes avant suppression LLM: ${startCount}`);
      addLog(`🎯 Note à supprimer: ${noteToDelete.source_title} (${noteToDelete.id})`);
      
      // Simuler une suppression LLM en appelant directement l'API
      addLog('🤖 Suppression via API (simulation LLM)...');
      const deleteResult = await fetch(`/api/v2/note/${noteToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`,
          'X-Client-Type': 'llm' // Simuler un appel LLM
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Note supprimée via API (simulation LLM)');
      addLog('⏳ Attente de la synchronisation temps réel...');
      
      // Attendre la synchronisation
      setTimeout(() => {
        const currentNotes = Object.values(useFileSystemStore.getState().notes);
        const endCount = currentNotes.length;
        addLog(`📊 Notes après suppression LLM: ${endCount}`);
        
        if (endCount < startCount) {
          addLog('✅ Suppression LLM visible en temps réel !');
        } else {
          addLog('❌ Suppression LLM non visible en temps réel');
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression LLM note: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testLLMDeleteFolder = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression dossier via LLM...');
    
    try {
      const foldersArray = Object.values(folders);
      if (foldersArray.length === 0) {
        addLog('❌ Aucun dossier disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      const folderToDelete = foldersArray[0];
      const startCount = foldersArray.length;
      addLog(`📊 Dossiers avant suppression LLM: ${startCount}`);
      addLog(`🎯 Dossier à supprimer: ${folderToDelete.name} (${folderToDelete.id})`);
      
      // Simuler une suppression LLM en appelant directement l'API
      addLog('🤖 Suppression via API (simulation LLM)...');
      const deleteResult = await fetch(`/api/v2/folder/${folderToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`,
          'X-Client-Type': 'llm' // Simuler un appel LLM
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Dossier supprimé via API (simulation LLM)');
      addLog('⏳ Attente de la synchronisation temps réel...');
      
      // Attendre la synchronisation
      setTimeout(() => {
        const currentFolders = Object.values(useFileSystemStore.getState().folders);
        const endCount = currentFolders.length;
        addLog(`📊 Dossiers après suppression LLM: ${endCount}`);
        
        if (endCount < startCount) {
          addLog('✅ Suppression LLM visible en temps réel !');
        } else {
          addLog('❌ Suppression LLM non visible en temps réel');
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression LLM dossier: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testLLMDeleteClasseur = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression classeur via LLM...');
    
    try {
      const classeursArray = Object.values(classeurs);
      if (classeursArray.length === 0) {
        addLog('❌ Aucun classeur disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      const classeurToDelete = classeursArray[0];
      const startCount = classeursArray.length;
      addLog(`📊 Classeurs avant suppression LLM: ${startCount}`);
      addLog(`🎯 Classeur à supprimer: ${classeurToDelete.name} (${classeurToDelete.id})`);
      
      // Simuler une suppression LLM en appelant directement l'API
      addLog('🤖 Suppression via API (simulation LLM)...');
      const deleteResult = await fetch(`/api/v2/classeur/${classeurToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`,
          'X-Client-Type': 'llm' // Simuler un appel LLM
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Classeur supprimé via API (simulation LLM)');
      addLog('⏳ Attente de la synchronisation temps réel...');
      
      // Attendre la synchronisation
      setTimeout(() => {
        const currentClasseurs = Object.values(useFileSystemStore.getState().classeurs);
        const endCount = currentClasseurs.length;
        addLog(`📊 Classeurs après suppression LLM: ${endCount}`);
        
        if (endCount < startCount) {
          addLog('✅ Suppression LLM visible en temps réel !');
        } else {
          addLog('❌ Suppression LLM non visible en temps réel');
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression LLM classeur: ${error}`);
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
          🤖 Test du Polling des Suppressions LLM
        </h2>
        <p className="text-gray-600">
          Testez que les suppressions effectuées par le LLM sont bien visibles en temps réel dans l'interface.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button
          onClick={testLLMDeleteNote}
          disabled={isRunning}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          🤖 Test Suppression Note LLM
        </button>
        
        <button
          onClick={testLLMDeleteFolder}
          disabled={isRunning}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          🤖 Test Suppression Dossier LLM
        </button>
        
        <button
          onClick={testLLMDeleteClasseur}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          🤖 Test Suppression Classeur LLM
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