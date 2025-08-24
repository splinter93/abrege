'use client';
import React, { useState, useEffect } from 'react';
import { useToolCallSync } from '@/hooks/useToolCallSync';
import { useChatStore } from '@/store/useChatStore';
import { simpleLogger as logger } from '@/utils/logger';

const TestToolCallSync: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('En attente...');
  const { currentSession } = useChatStore();

  // Hook de synchronisation des tool calls
  const { 
    syncToolCalls, 
    startAutoSync, 
    stopAutoSync, 
    checkPendingSync, 
    isAutoSyncing 
  } = useToolCallSync({
    autoSync: false, // Désactiver la synchronisation automatique pour le test
    onToolCallsSynced: (toolCalls, toolResults) => {
      logger.info('[TestToolCallSync] 🔄 Tool calls synchronisés:', { toolCalls, toolResults });
      setTestResult(`✅ Synchronisation réussie: ${toolCalls.length} tool calls, ${toolResults.length} résultats`);
    }
  });

  const testManualSync = async () => {
    setIsLoading(true);
    setTestResult('');
    setSyncStatus('Synchronisation manuelle en cours...');

    try {
      logger.info('[TestToolCallSync] 🧪 Test de synchronisation manuelle...');
      
      if (!currentSession?.id) {
        throw new Error('Aucune session active');
      }

      const result = await syncToolCalls();
      
      if (result.success) {
        setTestResult(`✅ Synchronisation manuelle réussie: ${result.toolCalls?.length || 0} tool calls, ${result.toolResults?.length || 0} résultats`);
        setSyncStatus('Synchronisation manuelle terminée');
      } else {
        setTestResult(`❌ Échec synchronisation: ${result.error}`);
        setSyncStatus('Échec synchronisation');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      setTestResult(`❌ Erreur: ${errorMsg}`);
      setSyncStatus('Erreur');
      logger.error('[TestToolCallSync] ❌ Erreur test synchronisation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAutoSync = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      logger.info('[TestToolCallSync] 🧪 Test de synchronisation automatique...');
      
      if (!currentSession?.id) {
        throw new Error('Aucune session active');
      }

      if (isAutoSyncing) {
        stopAutoSync();
        setTestResult('🛑 Synchronisation automatique arrêtée');
        setSyncStatus('Synchronisation automatique arrêtée');
      } else {
        startAutoSync();
        setTestResult('🚀 Synchronisation automatique démarrée');
        setSyncStatus('Synchronisation automatique active');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      setTestResult(`❌ Erreur: ${errorMsg}`);
      logger.error('[TestToolCallSync] ❌ Erreur test auto-sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testCheckPending = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      logger.info('[TestToolCallSync] 🧪 Test de vérification des données en attente...');
      
      if (!currentSession?.id) {
        throw new Error('Aucune session active');
      }

      const hasPending = await checkPendingSync();
      
      if (hasPending) {
        setTestResult('🔍 Données en attente de synchronisation détectées');
        setSyncStatus('Données en attente');
      } else {
        setTestResult('🔍 Aucune donnée en attente de synchronisation');
        setSyncStatus('Aucune donnée en attente');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      setTestResult(`❌ Erreur: ${errorMsg}`);
      logger.error('[TestToolCallSync] ❌ Erreur vérification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testFullSync = async () => {
    setIsLoading(true);
    setTestResult('');
    setSyncStatus('Synchronisation complète en cours...');

    try {
      logger.info('[TestToolCallSync] 🧪 Test de synchronisation complète...');
      
      if (!currentSession?.id) {
        throw new Error('Aucune session active');
      }

      // 1. Vérifier s'il y a des données en attente
      const hasPending = await checkPendingSync();
      
      if (hasPending) {
        // 2. Synchroniser manuellement
        const result = await syncToolCalls();
        
        if (result.success) {
          setTestResult(`✅ Synchronisation complète réussie: ${result.toolCalls?.length || 0} tool calls, ${result.toolResults?.length || 0} résultats`);
          setSyncStatus('Synchronisation complète terminée');
        } else {
          setTestResult(`❌ Échec synchronisation complète: ${result.error}`);
          setSyncStatus('Échec synchronisation complète');
        }
      } else {
        setTestResult('🔍 Aucune donnée à synchroniser');
        setSyncStatus('Aucune donnée à synchroniser');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      setTestResult(`❌ Erreur: ${errorMsg}`);
      setSyncStatus('Erreur');
      logger.error('[TestToolCallSync] ❌ Erreur synchronisation complète:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour mettre à jour le statut
  useEffect(() => {
    if (isAutoSyncing) {
      setSyncStatus('Synchronisation automatique active');
    }
  }, [isAutoSyncing]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        🧪 Test de Synchronisation des Tool Calls
      </h1>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">📋 Informations de Session</h2>
        <div className="text-sm text-blue-700">
          <p><strong>Session active:</strong> {currentSession?.id || 'Aucune'}</p>
          <p><strong>Nom session:</strong> {currentSession?.name || 'N/A'}</p>
          <p><strong>Messages dans le thread:</strong> {currentSession?.thread?.length || 0}</p>
          <p><strong>Statut synchronisation:</strong> {syncStatus}</p>
          <p><strong>Auto-sync:</strong> {isAutoSyncing ? '🟢 Actif' : '🔴 Inactif'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={testManualSync}
          disabled={isLoading || !currentSession?.id}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? '⏳ Test en cours...' : '🔄 Test Synchronisation Manuelle'}
        </button>

        <button
          onClick={testAutoSync}
          disabled={isLoading || !currentSession?.id}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? '⏳ Test en cours...' : (isAutoSyncing ? '🛑 Arrêter Auto-Sync' : '🚀 Démarrer Auto-Sync')}
        </button>

        <button
          onClick={testCheckPending}
          disabled={isLoading || !currentSession?.id}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? '⏳ Test en cours...' : '🔍 Vérifier Données en Attente'}
        </button>

        <button
          onClick={testFullSync}
          disabled={isLoading || !currentSession?.id}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? '⏳ Test en cours...' : '🎯 Test Synchronisation Complète'}
        </button>
      </div>

      {testResult && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">📊 Résultat du Test</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{testResult}</div>
        </div>
      )}

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">ℹ️ Instructions</h2>
        <div className="text-sm text-yellow-700">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Créez d'abord une session de chat</strong> pour tester la synchronisation</li>
            <li><strong>Utilisez des tool calls</strong> dans le chat pour générer des données à synchroniser</li>
            <li><strong>Testez la synchronisation manuelle</strong> pour récupérer les tool calls depuis la DB</li>
            <li><strong>Activez l'auto-sync</strong> pour une synchronisation continue en arrière-plan</li>
            <li><strong>Vérifiez les données en attente</strong> pour détecter les nouvelles données</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">🔧 Fonctionnalités Testées</h2>
        <div className="text-sm text-gray-700">
          <p><strong>✅ Synchronisation manuelle</strong> - Récupère les tool calls depuis la DB</p>
          <p><strong>✅ Synchronisation automatique</strong> - Met à jour en arrière-plan</p>
          <p><strong>✅ Détection des données en attente</strong> - Vérifie s'il y a de nouvelles données</p>
          <p><strong>✅ Synchronisation complète</strong> - Vérifie puis synchronise si nécessaire</p>
          <p><strong>✅ Non-intrusif</strong> - N'altère PAS la logique d'exécution LLM</p>
        </div>
      </div>
    </div>
  );
};

export default TestToolCallSync; 