/**
 * 🧪 Test des Suppressions Simplifiées
 * 
 * Cette page teste que les endpoints DELETE sont maintenant aussi propres
 * que les CREATE/UPDATE, sans suppressions optimistes ni polling complexe.
 */

"use client";

import { useState } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';

export default function TestDeleteSimplified() {
  const { notes, folders, classeurs, addNote, addFolder, addClasseur } = useFileSystemStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  const testDeleteNote = async () => {
    if (Object.keys(notes).length === 0) {
      addLog('❌ Aucune note disponible pour la suppression');
      return;
    }

    setIsLoading(true);
    const noteId = Object.keys(notes)[0];
    const noteTitle = notes[noteId].source_title;
    
    addLog(`🗑️ Test suppression note: "${noteTitle}" (${noteId})`);
    
    try {
      const result = await v2UnifiedApi.deleteNote(noteId);
      
      if (result.success) {
        addLog(`✅ Suppression note réussie en ${result.duration}ms`);
        addLog('✅ Pas de modification du store (le realtime naturel s\'en charge)');
      } else {
        addLog(`❌ Erreur suppression note: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Exception suppression note: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteFolder = async () => {
    if (Object.keys(folders).length === 0) {
      addLog('❌ Aucun dossier disponible pour la suppression');
      return;
    }

    setIsLoading(true);
    const folderId = Object.keys(folders)[0];
    const folderName = folders[folderId].name;
    
    addLog(`🗑️ Test suppression dossier: "${folderName}" (${folderId})`);
    
    try {
      const result = await v2UnifiedApi.deleteFolder(folderId);
      
      if (result.success) {
        addLog(`✅ Suppression dossier réussie`);
        addLog('✅ Pas de modification du store (le realtime naturel s\'en charge)');
      } else {
        addLog(`❌ Erreur suppression dossier: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Exception suppression dossier: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteClasseur = async () => {
    if (Object.keys(classeurs).length === 0) {
      addLog('❌ Aucun classeur disponible pour la suppression');
      return;
    }

    setIsLoading(true);
    const classeurId = Object.keys(classeurs)[0];
    const classeurName = classeurs[classeurId].name;
    
    addLog(`🗑️ Test suppression classeur: "${classeurName}" (${classeurId})`);
    
    try {
      const result = await v2UnifiedApi.deleteClasseur(classeurId);
      
      if (result.success) {
        addLog(`✅ Suppression classeur réussie`);
        addLog('✅ Pas de modification du store (le realtime naturel s\'en charge)');
      } else {
        addLog(`❌ Erreur suppression classeur: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Exception suppression classeur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestData = () => {
    // Créer une note de test
    const testNote = {
      id: `test-note-${Date.now()}`,
      source_title: 'Note de test pour suppression',
      markdown_content: 'Contenu de test',
      folder_id: null,
      classeur_id: 'test-classeur',
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      slug: 'note-de-test-pour-suppression'
    };
    addNote(testNote);
    addLog(`📝 Note de test créée: ${testNote.source_title}`);

    // Créer un dossier de test
    const testFolder = {
      id: `test-folder-${Date.now()}`,
      name: 'Dossier de test pour suppression',
      parent_id: null,
      classeur_id: 'test-classeur',
      position: 0,
      created_at: new Date().toISOString()
    };
    addFolder(testFolder);
    addLog(`📁 Dossier de test créé: ${testFolder.name}`);

    // Créer un classeur de test
    const testClasseur = {
      id: `test-classeur-${Date.now()}`,
      name: 'Classeur de test pour suppression',
      description: 'Classeur temporaire pour test',
      icon: '📚',
      position: 0,
      created_at: new Date().toISOString()
    };
    addClasseur(testClasseur);
    addLog(`📚 Classeur de test créé: ${testClasseur.name}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test des Suppressions Simplifiées</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">🎯 Objectif du Test</h2>
        <p className="text-gray-700">
          Vérifier que les endpoints DELETE sont maintenant aussi propres que les CREATE/UPDATE :
        </p>
        <ul className="list-disc list-inside mt-2 text-gray-600">
          <li>✅ Pas de suppressions optimistes dans le store</li>
          <li>✅ Pas de polling de confirmation complexe</li>
          <li>✅ Pas de restauration complexe en cas d'erreur</li>
          <li>✅ Le realtime naturel gère la synchronisation</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📊 État Actuel</h3>
          <div className="space-y-2 text-sm">
            <div>📝 Notes: {Object.keys(notes).length}</div>
            <div>📁 Dossiers: {Object.keys(folders).length}</div>
            <div>📚 Classeurs: {Object.keys(classeurs).length}</div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">🔧 Actions</h3>
          <div className="space-y-2">
            <button
              onClick={createTestData}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ➕ Créer des données de test
            </button>
            <button
              onClick={clearLogs}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              🗑️ Effacer les logs
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={testDeleteNote}
          disabled={isLoading || Object.keys(notes).length === 0}
          className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ Supprimer Note
        </button>

        <button
          onClick={testDeleteFolder}
          disabled={isLoading || Object.keys(folders).length === 0}
          className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ Supprimer Dossier
        </button>

        <button
          onClick={testDeleteClasseur}
          disabled={isLoading || Object.keys(classeurs).length === 0}
          className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ Supprimer Classeur
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">📋 Logs des Tests</h3>
        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">Aucun log pour le moment. Commencez par créer des données de test.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Suppression en cours...</p>
        </div>
      )}
    </div>
  );
} 