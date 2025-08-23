"use client";

import { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedPolling, getUnifiedPollingStatus } from '@/services/unifiedPollingService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour la création de notes V2 avec le nouveau système de polling
 */
export default function TestV2NotesCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, addNote } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testCreateNoteV2 = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note V2 avec nouveau système...');
      
      const noteData = {
        source_title: `Note Test V2 ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Contenu de test V2'
      };

      addLog('📝 Appel API V2...');
      const result = await v2UnifiedApi.createNote(noteData, 'test-user');
      addLog(`✅ Note créée: ${result.note.source_title}`);
      
      // Vérifier que la note est dans le store
      const store = useFileSystemStore.getState();
      const noteInStore = store.notes[result.note.id];
      
      if (noteInStore) {
        addLog(`✅ Note dans le store: ${noteInStore.source_title}`);
      } else {
        addLog(`❌ Note PAS dans le store !`);
      }
      
      addLog(`📊 Total notes dans le store: ${Object.keys(store.notes).length}`);
      
    } catch (error) {
      addLog(`❌ Erreur création note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPollingV2 = async () => {
    try {
      addLog('🔄 Test polling V2 manuel...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'CREATE',
        entityId: 'test-polling',
        delay: 500
      });
      
      addLog(`✅ Polling V2 terminé: ${result.success ? 'Succès' : 'Échec'}`);
      if (result.dataCount !== undefined) {
        addLog(`📊 ${result.dataCount} notes récupérées`);
      }
      if (result.error) {
        addLog(`❌ Erreur: ${result.error}`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur polling V2: ${error}`);
    }
  };

  const testPollingFolders = async () => {
    try {
      addLog('📁 Test polling dossiers V2...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'folders',
        operation: 'CREATE',
        entityId: 'test-polling-folders',
        delay: 500
      });
      
      addLog(`✅ Polling dossiers V2 terminé: ${result.success ? 'Succès' : 'Échec'}`);
      if (result.dataCount !== undefined) {
        addLog(`📊 ${result.dataCount} dossiers récupérés`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur polling dossiers: ${error}`);
    }
  };

  const showPollingStatus = () => {
    const status = getUnifiedPollingStatus();
    addLog(`📊 Status Polling V2:`);
    addLog(`  - Polling actif: ${status.isPolling ? 'Oui' : 'Non'}`);
    addLog(`  - Queue: ${status.queueLength} éléments`);
    addLog(`  - Résultats: ${status.lastResults.size} entités`);
    
    status.lastResults.forEach((result, key) => {
      addLog(`    • ${key}: ${result.success ? '✅' : '❌'} (${result.dataCount || 0} éléments)`);
    });
  };

  const clearStore = () => {
    const store = useFileSystemStore.getState();
    store.setNotes([]);
    addLog('🗑️ Store vidé');
  };

  const showStoreStatus = () => {
    const store = useFileSystemStore.getState();
    addLog(`📊 Store: ${Object.keys(store.notes).length} notes`);
    Object.values(store.notes).forEach(note => {
      addLog(`  - ${note.source_title} (${note.id})`);
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Création Notes V2 + Polling Intelligent</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCreateNoteV2}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? '⏳ Création...' : '📝 Créer Note V2'}
        </button>
        
        <button
          onClick={testPollingV2}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          🔄 Test Polling Notes V2
        </button>
        
        <button
          onClick={testPollingFolders}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          📁 Test Polling Dossiers V2
        </button>
        
        <button
          onClick={showPollingStatus}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          📊 Status Polling V2
        </button>
        
        <button
          onClick={showStoreStatus}
          className="bg-indigo-500 text-white px-4 py-2 rounded"
        >
          📊 Status Store
        </button>
        
        <button
          onClick={clearStore}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          🗑️ Vider Store
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2">📊 État actuel du store:</h3>
        <p>Notes dans le store: {Object.keys(notes).length}</p>
        {Object.keys(notes).length > 0 && (
          <ul className="mt-2 space-y-1">
            {Object.values(notes).map(note => (
              <li key={note.id} className="text-sm">
                • {note.source_title} (ID: {note.id.slice(0, 8)}...)
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">📋 Logs de test:</h3>
        <div className="space-y-1 text-sm font-mono max-h-96 overflow-y-auto">
          {testResults.map((log, index) => (
            <div key={index} className="p-1 bg-gray-50 rounded">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 