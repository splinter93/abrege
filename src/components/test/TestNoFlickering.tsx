"use client";

import { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour vérifier qu'il n'y a plus de clignotement lors de la création
 */
export default function TestNoFlickering() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testCreateNoteWithoutFlickering = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note sans clignotement...');
      
      // État initial
      const initialNoteCount = Object.keys(notes).length;
      addLog(`📊 Notes initiales: ${initialNoteCount}`);
      
      // Créer une note
      const noteData = {
        source_title: `Test Anti-Clignotement ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Cette note teste la prévention du clignotement'
      };

      addLog('📝 Création de la note...');
      const result = await v2UnifiedApi.createNote(noteData, 'test-user');
      
      // Vérifier immédiatement
      const immediateNoteCount = Object.keys(notes).length;
      addLog(`📊 Notes immédiatement après création: ${immediateNoteCount}`);
      
      // Attendre un peu pour voir s'il y a des changements
      addLog('⏳ Attente de 3 secondes pour observer le comportement...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Vérifier l'état final
      const finalNoteCount = Object.keys(notes).length;
      const expectedCount = initialNoteCount + 1;
      
      addLog(`📊 Notes finales: ${finalNoteCount} (attendues: ${expectedCount})`);
      
      if (finalNoteCount === expectedCount) {
        addLog('✅ SUCCÈS: Pas de clignotement détecté !');
        addLog('   - Note créée une seule fois');
        addLog('   - Store stable après création');
      } else {
        addLog('❌ ÉCHEC: Comportement anormal détecté');
        addLog(`   - Différence: ${finalNoteCount - expectedCount} notes`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolderWithoutFlickering = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création dossier sans clignotement...');
      
      // État initial
      const initialFolderCount = Object.keys(folders).length;
      addLog(`📊 Dossiers initiaux: ${initialFolderCount}`);
      
      // Créer un dossier
      const folderData = {
        name: `Test Anti-Clignotement ${Date.now()}`,
        notebook_id: 'test-notebook'
      };

      addLog('📁 Création du dossier...');
      const result = await v2UnifiedApi.createFolder(folderData, 'test-user');
      
      // Vérifier immédiatement
      const immediateFolderCount = Object.keys(folders).length;
      addLog(`📊 Dossiers immédiatement après création: ${immediateFolderCount}`);
      
      // Attendre un peu pour voir s'il y a des changements
      addLog('⏳ Attente de 3 secondes pour observer le comportement...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Vérifier l'état final
      const finalFolderCount = Object.keys(folders).length;
      const expectedCount = initialFolderCount + 1;
      
      addLog(`📊 Dossiers finaux: ${finalFolderCount} (attendus: ${expectedCount})`);
      
      if (finalFolderCount === expectedCount) {
        addLog('✅ SUCCÈS: Pas de clignotement détecté !');
        addLog('   - Dossier créé une seule fois');
        addLog('   - Store stable après création');
      } else {
        addLog('❌ ÉCHEC: Comportement anormal détecté');
        addLog(`   - Différence: ${finalFolderCount - expectedCount} dossiers`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error}`);
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
    
    if (Object.keys(store.folders).length > 0) {
      addLog(`📁 Détail des dossiers:`);
      Object.values(store.folders).forEach(folder => {
        addLog(`   • ${folder.name} (${folder.id.slice(0, 8)}...) ${folder._optimistic ? '[OPTIMISTIC]' : ''}`);
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
      <h1 className="text-2xl font-bold mb-6">🧪 Test Anti-Clignotement</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCreateNoteWithoutFlickering}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600"
        >
          {isLoading ? '⏳ Test...' : '📝 Test Note Sans Clignotement'}
        </button>
        
        <button
          onClick={testCreateFolderWithoutFlickering}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-600"
        >
          {isLoading ? '⏳ Test...' : '📁 Test Dossier Sans Clignotement'}
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
        
        {Object.keys(folders).length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium mb-2">📁 Dossiers disponibles:</h4>
            <ul className="space-y-1">
              {Object.values(folders).map(folder => (
                <li key={folder.id} className="text-sm bg-white p-2 rounded">
                  • {folder.name} (ID: {folder.id.slice(0, 8)}...) {folder._optimistic ? '🔄 [OPTIMISTIC]' : '✅ [REAL]'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Logs de test */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">📋 Logs de Test Anti-Clignotement</h3>
          <span className="text-sm text-gray-500">
            {testResults.length} messages
          </span>
        </div>
        <div className="space-y-1 text-sm font-mono max-h-96 overflow-y-auto bg-gray-50 p-3 rounded">
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun log disponible. Lancez un test pour vérifier l'absence de clignotement.
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