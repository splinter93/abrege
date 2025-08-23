"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';

export default function TestNoOptimistic() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { classeurs, folders, notes } = useFileSystemStore();
  const v2Api = V2UnifiedApi.getInstance();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Classeurs: ${Object.keys(classeurs).length}, Folders: ${Object.keys(folders).length}, Notes: ${Object.keys(notes).length}`);
  }, [classeurs, folders, notes]);

  const testCreateNote = async () => {
    setIsLoading(true);
    addLog(`📝 Test création note sans optimiste`);
    
    try {
      const result = await v2Api.createNote({
        source_title: 'Note Test Sans Optimiste',
        markdown_content: '# Test\n\nCette note est créée sans mise à jour optimiste.',
        notebook_id: Object.keys(classeurs)[0] || 'test-id'
      });
      
      if (result.success) {
        addLog(`✅ Note créée avec succès: ${result.note.source_title}`);
        addLog(`⏱️ Durée: ${result.duration}ms`);
        addLog(`🎯 Note ajoutée au store via polling automatique`);
      } else {
        addLog(`❌ Erreur création note: ${result.error}`);
      }
    } catch (error) {
      addLog(`💥 Exception lors de la création: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolder = async () => {
    setIsLoading(true);
    addLog(`📂 Test création dossier sans optimiste`);
    
    try {
      const result = await v2Api.createFolder({
        name: 'Dossier Test Sans Optimiste',
        notebook_id: Object.keys(classeurs)[0] || 'test-id'
      });
      
      if (result.success) {
        addLog(`✅ Dossier créé avec succès: ${result.folder.name}`);
        addLog(`⏱️ Durée: ${result.duration}ms`);
        addLog(`🎯 Dossier ajouté au store via polling automatique`);
      } else {
        addLog(`❌ Erreur création dossier: ${result.error}`);
      }
    } catch (error) {
      addLog(`💥 Exception lors de la création: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateClasseur = async () => {
    setIsLoading(true);
    addLog(`📁 Test création classeur sans optimiste`);
    
    try {
      const result = await v2Api.createClasseur({
        name: 'Classeur Test Sans Optimiste',
        description: 'Test du système sans optimiste'
      });
      
      if (result.success) {
        addLog(`✅ Classeur créé avec succès: ${result.classeur.name}`);
        addLog(`⏱️ Durée: ${result.duration}ms`);
        addLog(`🎯 Classeur ajouté au store via polling automatique`);
      } else {
        addLog(`❌ Erreur création classeur: ${result.error}`);
      }
    } catch (error) {
      addLog(`💥 Exception lors de la création: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🧹 Test Système Sans Optimiste
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎯 Tests de Création</h2>
            
            <div className="space-y-3">
              <button
                onClick={testCreateNote}
                disabled={isLoading || Object.keys(classeurs).length === 0}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Création...' : '📝 Créer Note (Sans Optimiste)'}
              </button>
              
              <button
                onClick={testCreateFolder}
                disabled={isLoading || Object.keys(classeurs).length === 0}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Création...' : '📂 Créer Dossier (Sans Optimiste)'}
              </button>
              
              <button
                onClick={testCreateClasseur}
                disabled={isLoading}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Création...' : '📁 Créer Classeur (Sans Optimiste)'}
              </button>
              
              <button
                onClick={clearLogs}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                🗑️ Effacer Logs
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📊 État du Store</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>📁 Classeurs:</span>
                <span className="font-mono">{Object.keys(classeurs).length}</span>
              </div>
              <div className="flex justify-between">
                <span>📂 Dossiers:</span>
                <span className="font-mono">{Object.keys(folders).length}</span>
              </div>
              <div className="flex justify-between">
                <span>📝 Notes:</span>
                <span className="font-mono">{Object.keys(notes).length}</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <div className="font-semibold mb-2">🔍 Détails:</div>
              <div>Classeurs: {Object.keys(classeurs).slice(0, 3).join(', ')}...</div>
              <div>Dossiers: {Object.keys(folders).slice(0, 3).join(', ')}...</div>
              <div>Notes: {Object.keys(notes).slice(0, 3).join(', ')}...</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📋 Logs des Tests Sans Optimiste</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                Aucun log pour le moment. Cliquez sur un bouton de création pour tester le système sans optimiste.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">🎯 Objectif du Test</h3>
          <p className="text-green-800 text-sm">
            Cette page teste que le système fonctionne <strong>SANS les mises à jour optimistes obsolètes</strong>. 
            Toutes les créations passent maintenant par l'API + polling automatique, garantissant une synchronisation 
            parfaite entre le serveur et le client.
          </p>
        </div>
      </div>
    </div>
  );
} 