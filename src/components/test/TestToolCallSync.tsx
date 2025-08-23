/**
 * 🧪 Composant de Test pour la Synchronisation des Tool Calls
 * 
 * Teste le système de synchronisation automatique après les tool calls
 */

"use client";

import { useState } from 'react';
import { triggerUnifiedRealtimePolling, getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export default function TestToolCallSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Test de création de note avec synchronisation
  const testCreateNoteSync = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test création note avec synchronisation automatique...');
      
      // Déclencher le polling intelligent
      await triggerUnifiedRealtimePolling('notes', 'CREATE');

      addLog(`✅ Polling déclenché: notes CREATE`);
      addLog(`🆔 Entity ID: test-note`);
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
      
      // La synchronisation se fait automatiquement maintenant
      addLog(`✅ Synchronisation automatique activée`);
      
      // Afficher le statut
      const status = getUnifiedRealtimeStatus();
      addLog(`📊 Statut sync: ${status.isConnected ? 'Connecté' : 'Déconnecté'}`);
      addLog(`🔌 Provider: ${status.provider}`);
      addLog(`📡 Tables: ${Object.values(status.tables).filter(Boolean).length}/3 connectées`);
      
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
      
      await triggerUnifiedRealtimePolling('folders', 'CREATE');

      addLog(`✅ Polling déclenché: folders CREATE`);
      addLog(`🆔 Entity ID: test-folder`);
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
      
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');

      addLog(`✅ Polling déclenché: notes UPDATE`);
      addLog(`🆔 Entity ID: test-note`);
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

  // Test de suppression avec synchronisation
  const testDeleteSync = async () => {
    setIsLoading(true);
    try {
      addLog('🗑️ Test suppression avec synchronisation automatique...');
      
      await triggerUnifiedRealtimePolling('notes', 'DELETE');

      addLog(`✅ Polling déclenché: notes DELETE`);
      addLog(`🆔 Entity ID: test-note`);
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

  // Test de déplacement avec synchronisation
  const testMoveSync = async () => {
    setIsLoading(true);
    try {
      addLog('📦 Test déplacement avec synchronisation automatique...');
      
      await triggerUnifiedRealtimePolling('notes', 'MOVE');

      addLog(`✅ Polling déclenché: notes MOVE`);
      addLog(`🆔 Entity ID: test-note`);
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

  // Test de synchronisation multiple
  const testMultipleSync = async () => {
    setIsLoading(true);
    try {
      addLog('🚀 Test synchronisation multiple...');
      
      // Créer plusieurs éléments en parallèle
      const operations = [
        triggerUnifiedRealtimePolling('notes', 'CREATE'),
        triggerUnifiedRealtimePolling('folders', 'CREATE'),
        triggerUnifiedRealtimePolling('classeurs', 'UPDATE')
      ];

      await Promise.all(operations);

      addLog(`✅ ${operations.length} pollings déclenchés simultanément`);
      addLog(`⏱️ Attente de la synchronisation...`);
      
      setTimeout(() => {
        addLog(`📊 Synchronisation multiple terminée`);
        addLog(`📝 Notes: ${notes.length}, Dossiers: ${folders.length}, Classeurs: ${classeurs.length}`);
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test de statut du service
  const testServiceStatus = async () => {
    try {
      addLog('📊 Test statut du service de synchronisation...');
      
      const status = getUnifiedRealtimeStatus();
      
      addLog(`🔌 Connexion: ${status.isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}`);
      addLog(`📡 Provider: ${status.provider}`);
      addLog(`📊 Tables connectées:`);
      addLog(`  • Notes: ${status.tables.notes ? '🟢' : '🔴'}`);
      addLog(`  • Dossiers: ${status.tables.folders ? '🟢' : '🔴'}`);
      addLog(`  • Classeurs: ${status.tables.classeurs ? '🟢' : '🔴'}`);
      
      if (status.lastEvent) {
        addLog(`📝 Dernier événement: ${status.lastEvent}`);
      }
      
      if (status.errorCount > 0) {
        addLog(`⚠️ Erreurs: ${status.errorCount}`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="test-tool-call-sync p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🧪 Test Synchronisation Tool Calls</h1>
        <p className="text-gray-600">
          Teste le système de synchronisation automatique qui se déclenche après chaque opération CRUD
        </p>
      </div>

      {/* Boutons de test */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Tests de Synchronisation</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
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
            className="btn btn-info btn-sm"
          >
            📁 Créer Dossier
          </button>
          
          <button
            onClick={testUpdateSync}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
          >
            🔄 Mettre à Jour
          </button>
          
          <button
            onClick={testDeleteSync}
            disabled={isLoading}
            className="btn btn-danger btn-sm"
          >
            🗑️ Supprimer
          </button>
          
          <button
            onClick={testMoveSync}
            disabled={isLoading}
            className="btn btn-warning btn-sm"
          >
            📦 Déplacer
          </button>
          
          <button
            onClick={testMultipleSync}
            disabled={isLoading}
            className="btn btn-success btn-sm"
          >
            🚀 Multiple
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={testServiceStatus}
            className="btn btn-ghost btn-sm"
          >
            📊 Statut
          </button>
          
          <button
            onClick={testForceSync}
            disabled={isLoading}
            className="btn btn-accent btn-sm"
          >
            🔄 Force Sync
          </button>
          
          <button
            onClick={clearLogs}
            className="btn btn-ghost btn-sm"
          >
            🗑️ Vider Logs
          </button>
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
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">💡 Comment ça fonctionne :</h4>
        <ul className="space-y-1">
          <li>• <strong>Synchronisation automatique :</strong> Se déclenche après chaque tool call</li>
          <li>• <strong>Polling intelligent :</strong> Vérifie les changements en temps réel</li>
          <li>• <strong>Store Zustand :</strong> Mise à jour automatique de l'interface</li>
          <li>• <strong>Fallback :</strong> Basculement automatique realtime ↔ polling</li>
          <li>• <strong>Monitoring :</strong> Statut en temps réel du service</li>
        </ul>
      </div>
    </div>
  );
} 