"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export default function TestLLMPolling() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('Supprime la première note disponible');
  const { classeurs, folders, notes } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Classeurs: ${Object.keys(classeurs).length}, Folders: ${Object.keys(folders).length}, Notes: ${Object.keys(notes).length}`);
  }, [classeurs, folders, notes]);

  const testLLMAction = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    addLog(`🤖 Test action LLM: "${prompt}"`);
    
    try {
      // Simuler l'appel au LLM
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        },
        body: JSON.stringify({
          message: prompt,
          sessionId: 'test-llm-polling-session'
        })
      });
      
      if (response.ok) {
        addLog(`✅ Action LLM exécutée avec succès`);
        
        // Surveiller les changements du store pendant 5 secondes
        const startCount = {
          notes: Object.keys(notes).length,
          folders: Object.keys(folders).length,
          classeurs: Object.keys(classeurs).length
        };
        
        addLog(`📊 Compteurs avant action: Notes=${startCount.notes}, Folders=${startCount.folders}, Classeurs=${startCount.classeurs}`);
        
        // Vérifier les changements toutes les 500ms pendant 5s
        let checks = 0;
        const checkInterval = setInterval(() => {
          checks++;
          const currentStore = useFileSystemStore.getState();
          const currentCount = {
            notes: Object.keys(currentStore.notes).length,
            folders: Object.keys(currentStore.folders).length,
            classeurs: Object.keys(currentStore.classeurs).length
          };
          
          addLog(`🔍 Vérification ${checks}/10 - Notes=${currentCount.notes}, Folders=${currentCount.folders}, Classeurs=${currentCount.classeurs}`);
          
          // Détecter les changements
          if (currentCount.notes !== startCount.notes) {
            addLog(`🎯 CHANGEMENT DÉTECTÉ: Notes ${startCount.notes} → ${currentCount.notes}`);
          }
          if (currentCount.folders !== startCount.folders) {
            addLog(`🎯 CHANGEMENT DÉTECTÉ: Folders ${startCount.folders} → ${currentCount.folders}`);
          }
          if (currentCount.classeurs !== startCount.classeurs) {
            addLog(`🎯 CHANGEMENT DÉTECTÉ: Classeurs ${startCount.classeurs} → ${currentCount.classeurs}`);
          }
          
          if (checks >= 10) {
            clearInterval(checkInterval);
            addLog(`✅ Surveillance terminée après 5 secondes`);
            
            // Résumé final
            const finalStore = useFileSystemStore.getState();
            const finalCount = {
              notes: Object.keys(finalStore.notes).length,
              folders: Object.keys(finalStore.folders).length,
              classeurs: Object.keys(finalStore.classeurs).length
            };
            
            addLog(`📊 RÉSUMÉ FINAL:`);
            addLog(`   Notes: ${startCount.notes} → ${finalCount.notes} (${finalCount.notes - startCount.notes > 0 ? '+' : ''}${finalCount.notes - startCount.notes})`);
            addLog(`   Folders: ${startCount.folders} → ${finalCount.folders} (${finalCount.folders - startCount.folders > 0 ? '+' : ''}${finalCount.folders - startCount.folders})`);
            addLog(`   Classeurs: ${startCount.classeurs} → ${finalCount.classeurs} (${finalCount.classeurs - startCount.classeurs > 0 ? '+' : ''}${finalCount.classeurs - startCount.classeurs})`);
            
            if (finalCount.notes === startCount.notes && 
                finalCount.folders === startCount.folders && 
                finalCount.classeurs === startCount.classeurs) {
              addLog(`❌ AUCUN CHANGEMENT DÉTECTÉ - Le polling du LLM ne fonctionne pas !`);
            } else {
              addLog(`✅ CHANGEMENTS DÉTECTÉS - Le polling du LLM fonctionne !`);
            }
          }
        }, 500);
        
      } else {
        const error = await response.text();
        addLog(`❌ Erreur action LLM: ${response.status} - ${error}`);
      }
    } catch (error) {
      addLog(`💥 Exception lors de l'action LLM: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => setLogs([]);

  const suggestedPrompts = [
    'Supprime la première note disponible',
    'Supprime le premier dossier disponible',
    'Supprime le premier classeur disponible',
    'Crée une nouvelle note de test',
    'Crée un nouveau dossier de test'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🤖 Test du Polling Automatique du LLM
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎯 Test Action LLM</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt pour le LLM:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Ex: Supprime la première note disponible"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Prompts suggérés:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedPrompts.map((suggestedPrompt, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(suggestedPrompt)}
                      className="text-left p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                    >
                      {suggestedPrompt}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={testLLMAction}
                disabled={isLoading || !prompt.trim()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Exécution LLM...' : '🤖 Exécuter Action LLM'}
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
          <h2 className="text-xl font-semibold mb-4">📋 Logs du Test LLM + Polling</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                Aucun log pour le moment. Entrez un prompt et cliquez sur "Exécuter Action LLM" pour tester le polling automatique.
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
        
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🎯 Objectif du Test</h3>
          <p className="text-blue-800 text-sm">
            Cette page teste que le <strong>LLM déclenche automatiquement le polling</strong> après chaque action 
            (création, suppression, modification). Le store Zustand doit être mis à jour en temps réel 
            sans rafraîchissement manuel, même pour les actions du LLM.
          </p>
        </div>
      </div>
    </div>
  );
} 