import React, { useState } from 'react';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';

/**
 * Composant de test simple pour vérifier la suppression
 */
export default function TestTrashDelete() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [noteId, setNoteId] = useState('');

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const testDeleteNote = async () => {
    if (isRunning || !noteId.trim()) return;
    
    setIsRunning(true);
    addLog(`🧪 Test suppression note: ${noteId}`);
    
    try {
      const v2Api = V2UnifiedApi.getInstance();
      const result = await v2Api.deleteNote(noteId);
      
      if (result.success) {
        addLog(`✅ Note supprimée avec succès en ${result.duration}ms`);
        addLog(`📝 Résultat: ${JSON.stringify(result)}`);
      } else {
        addLog(`❌ Échec suppression: ${result.error}`);
      }
      
    } catch (error) {
      addLog(`💥 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      if (error instanceof Error && error.stack) {
        addLog(`📚 Stack: ${error.stack.substring(0, 200)}...`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Suppression Note</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          ID de la note à supprimer:
        </label>
        <input
          type="text"
          value={noteId}
          onChange={(e) => setNoteId(e.target.value)}
          placeholder="Entrez l'ID d'une note existante"
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-6">
        <button
          onClick={testDeleteNote}
          disabled={isRunning || !noteId.trim()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isRunning ? '⏳ Suppression...' : '🗑️ Tester Suppression'}
        </button>

        <button
          onClick={clearLogs}
          className="ml-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🗑️ Effacer Logs
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">📋 Logs de Test</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">Aucun log pour le moment...</div>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>💡 <strong>Instructions:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Entrez l'ID d'une note existante dans votre système</li>
          <li>Cliquez sur "Tester Suppression"</li>
          <li>La note sera mise en corbeille (pas supprimée définitivement)</li>
          <li>Vérifiez les logs pour voir le résultat</li>
        </ul>
      </div>
    </div>
  );
}
