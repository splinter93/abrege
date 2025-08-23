/**
 * 🧪 Composant de Test pour le Système Realtime Unifié
 * 
 * Teste toutes les fonctionnalités du nouveau système unifié
 */

"use client";

import { useState } from 'react';
import { useUnifiedRealtime } from '@/hooks/useUnifiedRealtime';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export default function TestUnifiedRealtime() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs } = useFileSystemStore();
  
  // Utiliser le hook unifié
  const { 
    isConnected, 
    provider, 
    status, 
    triggerPolling, 
    isLoading: realtimeLoading, 
    error: realtimeError 
  } = useUnifiedRealtime({
    autoInitialize: true,
    debug: true
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testCreateNote = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note avec realtime unifié...');
      
      const noteData = {
        source_title: `Note Test ${Date.now()}`,
        notebook_id: 'test-notebook',
        markdown_content: 'Contenu de test'
      };

      const result = await v2UnifiedApi.createNote(noteData);
      addLog(`✅ Note créée: ${result.note.source_title}`);
      
      // Déclencher le polling immédiat
      await triggerPolling('notes', 'CREATE');
      addLog(`🔄 Polling immédiat déclenché pour notes`);
      
    } catch (error) {
      addLog(`❌ Erreur création note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolder = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création dossier avec realtime unifié...');
      
      const folderData = {
        name: `Dossier Test ${Date.now()}`,
        notebook_id: 'test-notebook'
      };

      const result = await v2UnifiedApi.createFolder(folderData);
      addLog(`✅ Dossier créé: ${result.folder.name}`);
      
      // Déclencher le polling immédiat
      await triggerPolling('folders', 'CREATE');
      addLog(`🔄 Polling immédiat déclenché pour dossiers`);
      
    } catch (error) {
      addLog(`❌ Erreur création dossier: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateClasseur = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création classeur avec realtime unifié...');
      
      const classeurData = {
        name: `Classeur Test ${Date.now()}`,
        description: 'Description de test'
      };

      const result = await v2UnifiedApi.createClasseur(classeurData);
      addLog(`✅ Classeur créé: ${result.classeur.name}`);
      
      // Déclencher le polling immédiat
      await triggerPolling('classeurs', 'CREATE');
      addLog(`🔄 Polling immédiat déclenché pour classeurs`);
      
    } catch (error) {
      addLog(`❌ Erreur création classeur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateNote = async () => {
    if (Object.keys(notes).length === 0) {
      addLog('❌ Aucune note disponible pour le test de mise à jour');
      return;
    }

    setIsLoading(true);
    try {
      const noteId = Object.keys(notes)[0];
      const note = notes[noteId];
      
      addLog(`🧪 Test mise à jour note "${note.source_title}" avec realtime unifié...`);
      
      const updateData = {
        source_title: `${note.source_title} - Mis à jour ${Date.now()}`
      };

      await v2UnifiedApi.updateNote(noteId, updateData);
      addLog(`✅ Note mise à jour: ${updateData.source_title}`);
      
      // Déclencher le polling immédiat
      await triggerPolling('notes', 'UPDATE');
      addLog(`🔄 Polling immédiat déclenché pour notes`);
      
    } catch (error) {
      addLog(`❌ Erreur mise à jour note: ${error}`);
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
      
      addLog(`🧪 Test suppression note "${note.source_title}" avec realtime unifié...`);
      
      await v2UnifiedApi.deleteNote(noteId);
      addLog(`✅ Note supprimée: ${note.source_title}`);
      
      // Déclencher le polling immédiat
      await triggerPolling('notes', 'DELETE');
      addLog(`🔄 Polling immédiat déclenché pour notes`);
      
    } catch (error) {
      addLog(`❌ Erreur suppression note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testManualPolling = async () => {
    try {
      addLog('🧪 Test polling manuel...');
      
      await triggerPolling('notes', 'UPDATE');
      addLog('✅ Polling notes déclenché');
      
      await triggerPolling('folders', 'UPDATE');
      addLog('✅ Polling dossiers déclenché');
      
      await triggerPolling('classeurs', 'UPDATE');
      addLog('✅ Polling classeurs déclenché');
      
    } catch (error) {
      addLog(`❌ Erreur polling manuel: ${error}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Système Realtime Unifié</h1>
      
      {/* Statut du Service */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">📊 Statut du Service</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Connexion:</strong> {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}</p>
            <p><strong>Provider:</strong> {provider === 'realtime' ? '🟢 Supabase Realtime' : provider === 'polling' ? '🟡 Polling Intelligent' : '🔴 Aucun'}</p>
            <p><strong>Chargement:</strong> {realtimeLoading ? '⏳ En cours...' : '✅ Terminé'}</p>
          </div>
          <div>
            <p><strong>Tables connectées:</strong></p>
            <ul className="ml-4">
              <li>Notes: {status.tables.notes ? '🟢' : '🔴'}</li>
              <li>Dossiers: {status.tables.folders ? '🟢' : '🔴'}</li>
              <li>Classeurs: {status.tables.classeurs ? '🟢' : '🔴'}</li>
            </ul>
            {status.lastEvent && (
              <p><strong>Dernier événement:</strong> {status.lastEvent}</p>
            )}
            {status.errorCount > 0 && (
              <p className="text-red-600"><strong>Erreurs:</strong> {status.errorCount}</p>
            )}
          </div>
        </div>
        {realtimeError && (
          <div className="mt-3 p-3 bg-red-100 text-red-700 rounded">
            <strong>Erreur:</strong> {realtimeError}
          </div>
        )}
      </div>

      {/* Boutons de Test */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCreateNote}
          disabled={isLoading}
          className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📝'} Créer Note
        </button>
        
        <button
          onClick={testCreateFolder}
          disabled={isLoading}
          className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📁'} Créer Dossier
        </button>
        
        <button
          onClick={testCreateClasseur}
          disabled={isLoading}
          className="p-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '📚'} Créer Classeur
        </button>
        
        <button
          onClick={testUpdateNote}
          disabled={isLoading || Object.keys(notes).length === 0}
          className="p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '✏️'} Mettre à Jour Note
        </button>
        
        <button
          onClick={testDeleteNote}
          disabled={isLoading || Object.keys(notes).length === 0}
          className="p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading ? '⏳' : '🗑️'} Supprimer Note
        </button>
        
        <button
          onClick={testManualPolling}
          disabled={isLoading}
          className="p-3 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          🔄 Polling Manuel
        </button>
      </div>

      {/* Statistiques */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">📈 Statistiques</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{Object.keys(notes).length}</p>
            <p className="text-sm text-gray-600">Notes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{Object.keys(folders).length}</p>
            <p className="text-sm text-gray-600">Dossiers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{Object.keys(classeurs).length}</p>
            <p className="text-sm text-gray-600">Classeurs</p>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">📝 Logs en Temps Réel</h2>
        <div className="bg-white p-3 rounded border max-h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">Aucun test exécuté</p>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 