"use client";

import { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour le système de polling unifié
 * Teste toutes les opérations CRUD avec polling unifié
 */
export default function TestIntelligentPolling() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs, addNote, addFolder, addClasseur } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testCreateNote = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note avec polling intelligent...');
      
      const noteData = {
        source_title: `Note Test ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Contenu de test'
      };

      const result = await v2UnifiedApi.createNote(noteData);
      addLog(`✅ Note créée: ${result.note.source_title}`);
      addLog(`🔄 Polling intelligent déclenché pour notes`);
      
    } catch (error) {
      addLog(`❌ Erreur création note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolder = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création dossier avec polling intelligent...');
      
      const folderData = {
        name: `Dossier Test ${Date.now()}`,
        notebook_id: 'test-notebook'
      };

      const result = await v2UnifiedApi.createFolder(folderData);
      addLog(`✅ Dossier créé: ${result.folder.name}`);
      addLog(`🔄 Polling intelligent déclenché pour dossiers`);
      
    } catch (error) {
      addLog(`❌ Erreur création dossier: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création classeur avec polling intelligent...');
      
      const classeurData = {
        name: `Classeur Test ${Date.now()}`,
        description: 'Description de test'
      };

      const result = await v2UnifiedApi.createClasseur(classeurData);
      addLog(`✅ Classeur créé: ${result.classeur.name}`);
      addLog(`🔄 Polling intelligent déclenché pour classeurs`);
      
    } catch (error) {
      addLog(`❌ Erreur création classeur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMoveNote = async () => {
    if (Object.keys(notes).length === 0) {
      addLog('❌ Aucune note disponible pour le test de déplacement');
      return;
    }

    setIsLoading(true);
    try {
      const noteId = Object.keys(notes)[0];
      const note = notes[noteId];
      
      addLog(`🧪 Test déplacement note "${note.source_title}" avec polling intelligent...`);
      
      await v2UnifiedApi.moveNote(noteId, null);
      addLog(`✅ Note déplacée vers la racine`);
      addLog(`🔄 Polling intelligent déclenché pour notes`);
      
    } catch (error) {
      addLog(`❌ Erreur déplacement note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteNote = async () => {
    if (Object.keys(notes).length === 0) {
      addLog('❌ Aucune note disponible pour le test de suppression');
      return;
    }

    setIsLoading(true);
    try {
      const noteId = Object.keys(notes)[0];
      const note = notes[noteId];
      
      addLog(`🧪 Test suppression note "${note.source_title}" avec polling intelligent...`);
      
      await v2UnifiedApi.deleteNote(noteId);
      addLog(`✅ Note supprimée`);
      addLog(`🔄 Polling intelligent déclenché pour notes`);
      
    } catch (error) {
      addLog(`❌ Erreur suppression note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="test-intelligent-polling p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Polling Intelligent</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">📊 État actuel</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>📝 Notes: {Object.keys(notes).length}</div>
          <div>📁 Dossiers: {Object.keys(folders).length}</div>
          <div>📚 Classeurs: {Object.keys(classeurs).length}</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">🚀 Tests CRUD avec Polling Intelligent</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={testCreateNote}
            disabled={isLoading}
            className="btn btn-primary"
          >
            📝 Créer Note
          </button>
          
          <button
            onClick={testCreateFolder}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            📁 Créer Dossier
          </button>
          
          <button
            onClick={testCreateClasseur}
            disabled={isLoading}
            className="btn btn-accent"
          >
            📚 Créer Classeur
          </button>
          
          <button
            onClick={testMoveNote}
            disabled={isLoading || Object.keys(notes).length === 0}
            className="btn btn-info"
          >
            📦 Déplacer Note
          </button>
          
          <button
            onClick={testDeleteNote}
            disabled={isLoading || Object.keys(notes).length === 0}
            className="btn btn-error"
          >
            🗑️ Supprimer Note
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">📋 Logs de Test</h3>
          <button
            onClick={clearLogs}
            className="btn btn-sm btn-outline"
          >
            🗑️ Vider
          </button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">
              Aucun test effectué. Cliquez sur un bouton pour commencer.
            </p>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>💡 Le polling intelligent se déclenche automatiquement après chaque action CRUD</p>
        <p>⏱️ Délai de 1 seconde avant le polling pour laisser la base se synchroniser</p>
        <p>🔄 Une seule synchronisation par action, pas de polling continu</p>
      </div>
    </div>
  );
} 