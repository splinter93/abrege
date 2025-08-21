"use client";

import { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour vérifier qu'il n'y a plus de duplication lors de la création de notes
 */
export default function TestNoteDuplication() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testCreateNoteWithoutDuplication = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note sans duplication...');
      
      // État initial
      const initialNoteCount = Object.keys(notes).length;
      addLog(`📊 Notes initiales: ${initialNoteCount}`);
      
      // Créer une note
      const noteData = {
        source_title: `Test Anti-Duplication ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Cette note teste la prévention de duplication'
      };

      addLog('📝 Création de la note...');
      const result = await v2UnifiedApi.createNote(noteData, 'test-user');
      
      // Attendre un peu pour le polling
      addLog('⏳ Attente du polling intelligent...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Vérifier l'état final
      const finalNoteCount = Object.keys(notes).length;
      const expectedCount = initialNoteCount + 1;
      
      addLog(`📊 Notes finales: ${finalNoteCount} (attendues: ${expectedCount})`);
      
      if (finalNoteCount === expectedCount) {
        addLog('✅ SUCCÈS: Pas de duplication détectée !');
      } else {
        addLog('❌ ÉCHEC: Duplication détectée !');
        addLog(`   - Différence: ${finalNoteCount - expectedCount} notes en trop`);
      }
      
      // Vérifier les IDs des notes
      const noteIds = Object.keys(notes);
      const duplicateIds = noteIds.filter(id => 
        noteIds.filter(noteId => notes[noteId].source_title === notes[id].source_title).length > 1
      );
      
      if (duplicateIds.length > 0) {
        addLog('🚨 DÉTECTION: Notes avec le même titre trouvées:');
        duplicateIds.forEach(id => {
          addLog(`   - ID: ${id}, Titre: ${notes[id].source_title}`);
        });
      } else {
        addLog('✅ Vérification: Aucune note dupliquée détectée');
      }
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleNotes = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création de plusieurs notes...');
      
      const initialCount = Object.keys(notes).length;
      addLog(`📊 Notes initiales: ${initialCount}`);
      
      // Créer 3 notes rapidement
      const promises: Promise<any>[] = [];
      for (let i = 1; i <= 3; i++) {
        const noteData = {
          source_title: `Note Multiple ${i} - ${Date.now()}`,
          notebook_id: 'test-notebook',
          markdown_content: `Contenu de la note ${i}`
        };
        
        promises.push(v2UnifiedApi.createNote(noteData, 'test-user'));
        addLog(`📝 Création note ${i}...`);
      }
      
      await Promise.all(promises);
      addLog('⏳ Attente du polling intelligent...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalCount = Object.keys(notes).length;
      const expectedCount = initialCount + 3;
      
      addLog(`📊 Notes finales: ${finalCount} (attendues: ${expectedCount})`);
      
      if (finalCount === expectedCount) {
        addLog('✅ SUCCÈS: Création multiple sans duplication !');
      } else {
        addLog('❌ ÉCHEC: Duplication lors de la création multiple');
      }
      
    } catch (error) {
      addLog(`❌ Erreur lors du test multiple: ${error}`);
    } finally {
      setIsLoading(false);
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
        addLog(`   • ${note.source_title} (${note.id.slice(0, 8)}...) ${note._optimistic ? '[OPTIMISTIC]' : ''}`);
      });
    }
  };

  const clearStore = () => {
    const store = useFileSystemStore.getState();
    store.setNotes([]);
    store.setFolders([]);
    store.setClasseurs([]);
    addLog('🗑️ Store complètement vidé');
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Anti-Duplication des Notes</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCreateNoteWithoutDuplication}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600"
        >
          {isLoading ? '⏳ Test...' : '🧪 Test Création Simple'}
        </button>
        
        <button
          onClick={testMultipleNotes}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-600"
        >
          {isLoading ? '⏳ Test...' : '📝 Test Création Multiple'}
        </button>
        
        <button
          onClick={showStoreStatus}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          📊 Status Store
        </button>
        
        <button
          onClick={clearStore}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          🗑️ Vider Store
        </button>
        
        <button
          onClick={clearLogs}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          🧹 Vider Logs
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
                  • {note.source_title} (ID: {note.id.slice(0, 8)}...) {note._optimistic ? '🔄 [OPTIMISTIC]' : '✅ [REAL]'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Logs de test */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">📋 Logs de Test Anti-Duplication</h3>
          <span className="text-sm text-gray-500">
            {testResults.length} messages
          </span>
        </div>
        <div className="space-y-1 text-sm font-mono max-h-96 overflow-y-auto bg-gray-50 p-3 rounded">
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun log disponible. Lancez un test pour vérifier la prévention de duplication.
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