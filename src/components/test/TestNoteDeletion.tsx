"use client";

import { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedPolling, getUnifiedPollingStatus } from '@/services/unifiedPollingService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test spécifique pour la suppression des notes avec polling
 */
export default function TestNoteDeletion() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testCreateNoteForDeletion = async () => {
    setIsLoading(true);
    try {
      addLog('📝 Création d\'une note pour test de suppression...');
      
      const noteData = {
        source_title: `Note à supprimer ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Cette note sera supprimée pour tester le polling'
      };

      const result = await v2UnifiedApi.createNote(noteData, 'test-user');
      addLog(`✅ Note créée: ${result.note.source_title} (ID: ${result.note.id})`);
      addLog(`📊 Total notes dans le store: ${Object.keys(notes).length + 1}`);
      
    } catch (error) {
      addLog(`❌ Erreur création note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteNote = async () => {
    if (Object.keys(notes).length === 0) {
      addLog('❌ Aucune note disponible pour la suppression');
      return;
    }

    setIsLoading(true);
    try {
      const noteId = Object.keys(notes)[0];
      const note = notes[noteId];
      
      addLog(`🗑️ Test suppression note: "${note.source_title}"`);
      addLog(`📊 Notes avant suppression: ${Object.keys(notes).length}`);
      
      // Supprimer la note
      await v2UnifiedApi.deleteNote(noteId, 'test-user');
      addLog(`✅ Note supprimée via API V2`);
      
      // Vérifier le store immédiatement
      const storeAfterDelete = useFileSystemStore.getState();
      addLog(`📊 Notes après suppression immédiate: ${Object.keys(storeAfterDelete.notes).length}`);
      
      // Attendre le polling
      addLog(`⏳ Attente du polling intelligent...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Vérifier le store après polling
      const storeAfterPolling = useFileSystemStore.getState();
      addLog(`📊 Notes après polling: ${Object.keys(storeAfterPolling.notes).length}`);
      
      if (Object.keys(storeAfterPolling.notes).length === Object.keys(notes).length - 1) {
        addLog(`✅ SUCCÈS: Le polling a bien détecté la suppression !`);
      } else {
        addLog(`❌ ÉCHEC: Le polling n'a pas détecté la suppression`);
        addLog(`   - Avant: ${Object.keys(notes).length} notes`);
        addLog(`   - Après polling: ${Object.keys(storeAfterPolling.notes).length} notes`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur suppression note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPollingManuel = async () => {
    try {
      addLog('🔄 Test polling manuel pour notes...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'DELETE',
        entityId: 'test-polling',
        delay: 500
      });
      
      addLog(`✅ Polling manuel terminé: ${result.success ? 'Succès' : 'Échec'}`);
      addLog(`📊 ${result.dataCount || 0} notes récupérées`);
      
      if (result.error) {
        addLog(`❌ Erreur polling: ${result.error}`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur polling manuel: ${error}`);
    }
  };

  const showStoreStatus = () => {
    const store = useFileSystemStore.getState();
    addLog(`📊 État du store:`);
    addLog(`   - Notes: ${Object.keys(store.notes).length}`);
    addLog(`   - Dossiers: ${Object.keys(store.folders).length}`);
    addLog(`   - Classeurs: ${Object.keys(store.classeurs).length}`);
    
    if (Object.keys(store.notes).length > 0) {
      addLog(`📝 Détail des notes:`);
      Object.values(store.notes).forEach(note => {
        addLog(`   • ${note.source_title} (${note.id.slice(0, 8)}...)`);
      });
    }
  };

  const showPollingStatus = () => {
    const status = getUnifiedPollingStatus();
    addLog(`📊 Status Polling V2:`);
    addLog(`   - Polling actif: ${status.isPolling ? 'Oui' : 'Non'}`);
    addLog(`   - Queue: ${status.queueLength} éléments`);
    addLog(`   - Résultats: ${status.lastResults.size} entités`);
    
    status.lastResults.forEach((result, key) => {
      addLog(`     • ${key}: ${result.success ? '✅' : '❌'} (${result.dataCount || 0} éléments)`);
    });
  };

  const clearStore = () => {
    const store = useFileSystemStore.getState();
    store.setNotes([]);
    store.setFolders([]);
    store.setClasseurs([]);
    addLog('🗑️ Store complètement vidé');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Suppression Notes + Polling</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCreateNoteForDeletion}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600"
        >
          {isLoading ? '⏳ Création...' : '📝 Créer Note Test'}
        </button>
        
        <button
          onClick={testDeleteNote}
          disabled={isLoading || Object.keys(notes).length === 0}
          className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-red-600"
        >
          🗑️ Supprimer Note + Test Polling
        </button>
        
        <button
          onClick={testPollingManuel}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          🔄 Test Polling Manuel
        </button>
        
        <button
          onClick={showPollingStatus}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          📊 Status Polling
        </button>
        
        <button
          onClick={showStoreStatus}
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        >
          📊 Status Store
        </button>
        
        <button
          onClick={clearStore}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          🗑️ Vider Store
        </button>
      </div>

      {/* État actuel */}
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2">📊 État actuel du store:</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>📝 Notes: {Object.keys(notes).length}</div>
          <div>📁 Dossiers: {Object.keys(folders).length}</div>
          <div>📚 Classeurs: {Object.keys(classeurs).length}</div>
        </div>
        
        {Object.keys(notes).length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium mb-2">📝 Notes disponibles:</h4>
            <ul className="space-y-1">
              {Object.values(notes).map(note => (
                <li key={note.id} className="text-sm bg-white p-2 rounded">
                  • {note.source_title} (ID: {note.id.slice(0, 8)}...)
                </li>
              ))}
            </ul>
          </div>
        )}
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
              Aucun log disponible. Créez une note puis testez la suppression.
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