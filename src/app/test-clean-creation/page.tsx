"use client";

import { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * 🧪 TEST FINAL - CRÉATION PROPRE SANS CLIGNOTEMENT
 * 
 * Ce test valide que le nettoyage est complet :
 * 1. Pas de double création optimiste
 * 2. Pas de clignotement
 * 3. Flux propre et fluide
 */
export default function TestCleanCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 29)]);
  };

  const monitorStoreChanges = () => {
    let changeCount = 0;
    let lastNoteCount = Object.keys(notes).length;
    
    const unsubscribe = useFileSystemStore.subscribe((state) => {
      const currentNoteCount = Object.keys(state.notes).length;
      if (currentNoteCount !== lastNoteCount) {
        changeCount++;
        addLog(`🔄 Changement store #${changeCount}: ${lastNoteCount} → ${currentNoteCount} notes`);
        lastNoteCount = currentNoteCount;
        
        // Si plus de 2 changements en 3 secondes = clignotement détecté
        if (changeCount > 2) {
          addLog(`❌ CLIGNOTEMENT DÉTECTÉ ! ${changeCount} changements rapides`);
        }
      }
    });
    
    // Arrêter le monitoring après 5 secondes
    setTimeout(() => {
      unsubscribe();
      if (changeCount <= 2) {
        addLog(`✅ SUCCÈS ! Seulement ${changeCount} changements (normal)`);
      }
    }, 5000);
  };

  const testNoteCreationClean = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note NETTOYÉE...');
      
      const initialCount = Object.keys(notes).length;
      addLog(`📊 Notes initiales: ${initialCount}`);
      
      // Démarrer le monitoring des changements
      monitorStoreChanges();
      
      const noteData = {
        source_title: `Note Propre ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Cette note teste la création nettoyée'
      };

      addLog('📝 Création note avec flux nettoyé...');
      
      const startTime = Date.now();
      const result = await v2UnifiedApi.createNote(noteData, 'test-user');
      const duration = Date.now() - startTime;
      
      addLog(`✅ Note créée en ${duration}ms: ${result.note.source_title}`);
      
      // Attendre pour observer le comportement
      addLog('⏳ Observation du comportement pendant 5 secondes...');
      
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFolderCreationClean = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création dossier NETTOYÉE...');
      
      const initialCount = Object.keys(folders).length;
      addLog(`📊 Dossiers initiaux: ${initialCount}`);
      
      const folderData = {
        name: `Dossier Propre ${Date.now()}`,
        notebook_id: 'test-notebook'
      };

      addLog('📁 Création dossier avec flux nettoyé...');
      
      const startTime = Date.now();
      const result = await v2UnifiedApi.createFolder(folderData, 'test-user');
      const duration = Date.now() - startTime;
      
      addLog(`✅ Dossier créé en ${duration}ms: ${result.folder.name}`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testRapidCreation = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création rapide multiple...');
      
      const promises: Promise<any>[] = [];
      for (let i = 1; i <= 3; i++) {
        const noteData = {
          source_title: `Note Rapide ${i} - ${Date.now()}`,
          notebook_id: 'test-notebook',
          markdown_content: `Contenu note ${i}`
        };
        promises.push(v2UnifiedApi.createNote(noteData, 'test-user'));
      }
      
      addLog('🚀 Création de 3 notes simultanées...');
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      addLog(`✅ 3 notes créées en ${duration}ms`);
      results.forEach((result: any, i: number) => {
        addLog(`  • Note ${i+1}: ${result.note.source_title}`);
      });
      
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showCurrentState = () => {
    const notesCount = Object.keys(notes).length;
    const foldersCount = Object.keys(folders).length;
    const classeursCount = Object.keys(classeurs).length;
    
    addLog(`📊 État actuel du store:`);
    addLog(`   • Notes: ${notesCount}`);
    addLog(`   • Dossiers: ${foldersCount}`);
    addLog(`   • Classeurs: ${classeursCount}`);
    
    if (notesCount > 0) {
      addLog(`📝 Dernières notes:`);
      Object.values(notes).slice(-3).forEach(note => {
        const isOptimistic = note._optimistic ? ' [OPTIMISTIC]' : ' [REAL]';
        addLog(`   • ${note.source_title}${isOptimistic}`);
      });
    }
  };

  const clearStore = () => {
    const store = useFileSystemStore.getState();
    store.setNotes([]);
    store.setFolders([]);
    store.setClasseurs([]);
    addLog('🗑️ Store vidé');
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Création Propre (Sans Clignotement)</h1>
      
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <h3 className="font-semibold text-green-800">✅ Nettoyage Effectué</h3>
        <p className="text-green-700">
          • Double création optimiste éliminée<br/>
          • useFolderManagerState laisse V2UnifiedApi gérer l'optimisme<br/>
          • Polling intelligent réactivé avec délai de 2s
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testNoteCreationClean}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-3 rounded disabled:opacity-50 hover:bg-blue-600 font-medium"
        >
          {isLoading ? '⏳ Test...' : '📝 Test Note Propre'}
        </button>
        
        <button
          onClick={testFolderCreationClean}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-3 rounded disabled:opacity-50 hover:bg-green-600 font-medium"
        >
          {isLoading ? '⏳ Test...' : '📁 Test Dossier Propre'}
        </button>
        
        <button
          onClick={testRapidCreation}
          disabled={isLoading}
          className="bg-purple-500 text-white px-4 py-3 rounded disabled:opacity-50 hover:bg-purple-600 font-medium"
        >
          {isLoading ? '⏳ Test...' : '🚀 Test Création Rapide'}
        </button>
        
        <button
          onClick={showCurrentState}
          className="bg-indigo-500 text-white px-4 py-3 rounded hover:bg-indigo-600 font-medium"
        >
          📊 État Store
        </button>
        
        <button
          onClick={clearStore}
          className="bg-red-500 text-white px-4 py-3 rounded hover:bg-red-600 font-medium"
        >
          🗑️ Vider Store
        </button>
        
        <button
          onClick={clearLogs}
          className="bg-gray-500 text-white px-4 py-3 rounded hover:bg-gray-600 font-medium"
        >
          🧹 Vider Logs
        </button>
      </div>

      {/* État en temps réel */}
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2">📊 Store en temps réel:</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-3 rounded">
            <strong>📝 Notes:</strong> {Object.keys(notes).length}
            {Object.keys(notes).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.values(notes).slice(-2).map(note => (
                  <div key={note.id} className="text-xs">
                    • {note.source_title.slice(0, 20)}...
                    <span className="ml-1 text-gray-500">
                      {note._optimistic ? '[OPT]' : '[REAL]'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white p-3 rounded">
            <strong>📁 Dossiers:</strong> {Object.keys(folders).length}
          </div>
          <div className="bg-white p-3 rounded">
            <strong>📚 Classeurs:</strong> {Object.keys(classeurs).length}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">📋 Logs de Test Propre</h3>
          <span className="text-sm text-gray-500">
            {testResults.length} messages
          </span>
        </div>
        <div className="space-y-1 text-sm font-mono max-h-96 overflow-y-auto bg-gray-50 p-3 rounded">
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun log. Lancez un test pour valider le nettoyage.
            </div>
          ) : (
            testResults.map((log, index) => (
              <div 
                key={index} 
                className={`p-2 rounded border-l-4 ${
                  log.includes('❌') ? 'bg-red-50 border-red-400' :
                  log.includes('✅') ? 'bg-green-50 border-green-400' :
                  log.includes('🔄') ? 'bg-yellow-50 border-yellow-400' :
                  'bg-white border-blue-400'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 