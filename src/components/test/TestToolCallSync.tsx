"use client";

import React, { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { triggerUnifiedPolling } from '@/services/unifiedPollingService';
import { forceUnifiedPollingSync, getUnifiedPollingStatus } from '@/services/unifiedPollingService';

/**
 * Composant de test simple pour vérifier la synchronisation du polling intelligent
 * avec le store Zustand
 */
export default function TestToolCallSync() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Récupérer l'état du store
  const notes = useFileSystemStore((state) => Object.values(state.notes));
  const folders = useFileSystemStore((state) => Object.values(state.folders));
  const classeurs = useFileSystemStore((state) => Object.values(state.classeurs));

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  // Test de création de note avec synchronisation
  const testCreateNoteSync = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note avec synchronisation automatique...');
      
      // Déclencher le polling intelligent
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'CREATE',
        entityId: `note-test-${Date.now()}`,
        userId: 'test-user-123',
        delay: 1000
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Attente de la synchronisation...`);
      
      // Attendre que la synchronisation se fasse
      setTimeout(() => {
        addLog(`📊 Synchronisation terminée`);
        addLog(`📝 Notes dans le store: ${notes.length}`);
        addLog(`📁 Dossiers dans le store: ${folders.length}`);
        addLog(`📚 Classeurs dans le store: ${classeurs.length}`);
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test de synchronisation forcée
  const testForceSync = async () => {
    setIsLoading(true);
    try {
      addLog('🔄 Test synchronisation forcée...');
      
      await forceUnifiedPollingSync();
      addLog(`✅ Synchronisation forcée terminée`);
      
      // Afficher le statut
      const status = getUnifiedPollingStatus();
      addLog(`📊 Statut sync: ${status.isActive ? 'Actif' : 'Inactif'}`);
      addLog(`⏰ Dernière sync: ${new Date(status.lastSyncTime).toLocaleTimeString()}`);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test de création de dossier avec synchronisation
  const testCreateFolderSync = async () => {
    setIsLoading(true);
    try {
      addLog('📁 Test création dossier avec synchronisation automatique...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'folders',
        operation: 'CREATE',
        entityId: `folder-test-${Date.now()}`,
        userId: 'test-user-123',
        delay: 800
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Attente de la synchronisation...`);
      
      setTimeout(() => {
        addLog(`📊 Synchronisation terminée`);
        addLog(`📁 Dossiers dans le store: ${folders.length}`);
      }, 1500);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test de mise à jour avec synchronisation
  const testUpdateSync = async () => {
    setIsLoading(true);
    try {
      addLog('🔄 Test mise à jour avec synchronisation automatique...');
      
      const result = await triggerUnifiedPolling({
        entityType: 'notes',
        operation: 'UPDATE',
        entityId: `note-update-${Date.now()}`,
        userId: 'test-user-123',
        delay: 500
      });

      addLog(`✅ Polling déclenché: ${result.entityType} ${result.operation}`);
      addLog(`🆔 Entity ID: ${result.entityId}`);
      addLog(`⏱️ Attente de la synchronisation...`);
      
      setTimeout(() => {
        addLog(`📊 Synchronisation terminée`);
        addLog(`📝 Notes dans le store: ${notes.length}`);
      }, 1000);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Afficher le statut actuel du store
  const showStoreStatus = () => {
    addLog(`📊 Statut actuel du store:`);
    addLog(`  📝 Notes: ${notes.length}`);
    addLog(`  📁 Dossiers: ${folders.length}`);
    addLog(`  📚 Classeurs: ${classeurs.length}`);
    
    if (notes.length > 0) {
      addLog(`  📝 Dernière note: ${notes[notes.length - 1].source_title || 'Sans titre'}`);
    }
    
    if (folders.length > 0) {
      addLog(`  📁 Dernier dossier: ${folders[folders.length - 1].name || 'Sans nom'}`);
    }
  };

  return (
    <div className="test-tool-call-sync p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🧪 Test Synchronisation Polling Intelligent</h1>
        <p className="text-gray-600">
          Teste la synchronisation automatique entre le polling intelligent et le store Zustand
        </p>
      </div>

      {/* Boutons de test */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Tests de Synchronisation</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button
            onClick={testCreateNoteSync}
            disabled={isLoading}
            className="btn btn-primary btn-sm"
          >
            📝 Créer Note
          </button>
          
          <button
            onClick={testCreateFolderSync}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
          >
            📁 Créer Dossier
          </button>
          
          <button
            onClick={testUpdateSync}
            disabled={isLoading}
            className="btn btn-info btn-sm"
          >
            🔄 Mettre à Jour
          </button>
          
          <button
            onClick={testForceSync}
            disabled={isLoading}
            className="btn btn-warning btn-sm"
          >
            ⚡ Sync Forcée
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={showStoreStatus}
            className="btn btn-ghost btn-sm"
          >
            📊 Statut Store
          </button>
          
          <button
            onClick={clearLogs}
            className="btn btn-ghost btn-sm"
          >
            🗑️ Vider Logs
          </button>
        </div>
      </div>

      {/* Statut du store */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📊 État Actuel du Store</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Notes:</span> {notes.length}
          </div>
          <div>
            <span className="font-medium">Dossiers:</span> {folders.length}
          </div>
          <div>
            <span className="font-medium">Classeurs:</span> {classeurs.length}
          </div>
        </div>
      </div>

      {/* Logs de test */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">📋 Logs de Test</h3>
          <span className="text-sm text-gray-500">
            {testResults.length} messages
          </span>
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

      {/* Informations */}
      <div className="text-sm text-gray-600 bg-green-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">💡 Comment ça fonctionne :</h4>
        <ul className="space-y-1">
          <li>• <strong>Polling Intelligent</strong> : Se déclenche automatiquement après chaque tool call</li>
          <li>• <strong>Synchronisation</strong> : Met à jour le store Zustand toutes les secondes</li>
          <li>• <strong>Store Zustand</strong> : L'interface se met à jour automatiquement</li>
          <li>• <strong>Temps Réel</strong> : Plus besoin de recharger la page !</li>
        </ul>
      </div>
    </div>
  );
} 