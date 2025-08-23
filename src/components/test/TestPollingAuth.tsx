"use client";

import React, { useState, useEffect } from 'react';
import { 
  triggerUnifiedPolling, 
  startUnifiedPollingSync, 
  stopUnifiedPollingSync, 
  setUnifiedPollingAuthToken, 
  getUnifiedPollingStatus 
} from '@/services/unifiedPollingService';
import { useAuth } from '@/hooks/useAuth';

/**
 * Composant de test pour valider l'authentification du système de polling
 * Permet de tester que le polling fonctionne avec authentification
 */
export default function TestPollingAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [pollingStatus, setPollingStatus] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { user } = useAuth();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Mettre à jour les statuts en temps réel
  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(getUnifiedPollingStatus());
      setPollingStatus(getUnifiedPollingStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Récupérer le token d'authentification
  useEffect(() => {
    const getAuthToken = async () => {
      if (!user?.id) return;
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.access_token) {
          addLog('❌ Erreur récupération session Supabase');
          return;
        }
        
        setAuthToken(session.access_token);
        addLog('✅ Token d\'authentification récupéré depuis Supabase');
        
        // Définir le token dans le service de synchronisation
        setUnifiedPollingAuthToken(session.access_token);
        addLog('✅ Token défini dans le service de synchronisation');
        
      } catch (error) {
        addLog(`❌ Erreur récupération token: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    getAuthToken();
  }, [user?.id]);

  const testAuthTokenRetrieval = () => {
    addLog('🔧 Test de récupération du token d\'authentification...');
    
    if (authToken) {
      addLog(`   ✅ Token présent: ${authToken.substring(0, 20)}...`);
      addLog(`   📏 Longueur: ${authToken.length} caractères`);
      addLog(`   🔐 Format: ${authToken.startsWith('eyJ') ? 'JWT valide' : 'Format inattendu'}`);
    } else {
      addLog('   ❌ Aucun token disponible');
    }
  };

  const testPollingWithAuth = async () => {
    if (!authToken) {
      addLog('❌ Impossible de tester le polling sans token d\'authentification');
      return;
    }

    setIsLoading(true);
    try {
      addLog('🧪 Test du polling avec authentification...');
      
      // Tester le polling pour chaque type d'entité avec le token
      const entityTypes = ['notes', 'folders', 'classeurs', 'files'];
      
      for (const entityType of entityTypes) {
        addLog(`   🔄 Test polling ${entityType} avec auth...`);
        
        const result = await triggerUnifiedPolling({
          entityType: entityType as any,
          operation: 'CREATE',
          entityId: `${entityType}-${Date.now()}`,
          userId: user?.id || 'test-user',
          delay: 500,
          authToken: authToken // ✅ CORRECTION: Transmettre le token
        });
        
        if (result.success) {
          addLog(`   ✅ Polling ${entityType} déclenché avec succès`);
        } else {
          addLog(`   ❌ Polling ${entityType} échoué: ${result.error}`);
        }
        
        // Attendre un peu entre chaque test
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      addLog('🎉 Test du polling avec authentification terminé');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSyncServiceWithAuth = async () => {
    if (!authToken) {
      addLog('❌ Impossible de tester la synchronisation sans token d\'authentification');
      return;
    }

    setIsLoading(true);
    try {
      addLog('🧪 Test du service de synchronisation avec authentification...');
      
      // Démarrer la synchronisation
      addLog('   🚀 Démarrage de la synchronisation...');
      startUnifiedPollingSync();
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier le statut
      const status = getUnifiedPollingStatus();
      addLog(`   📊 Statut de la synchronisation: ${status.isPolling ? 'Actif' : 'Inactif'}`);
      
      // Arrêter la synchronisation
      addLog('   🛑 Arrêt de la synchronisation...');
      stopUnifiedPollingSync();
      
      addLog('🎉 Test du service de synchronisation avec authentification terminé');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCompleteWorkflowWithAuth = async () => {
    if (!authToken) {
      addLog('❌ Impossible de tester le workflow complet sans token d\'authentification');
      return;
    }

    setIsLoading(true);
    try {
      addLog('🧪 Test du workflow complet avec authentification...');
      
      // 1. Démarrer la synchronisation
      addLog('   1️⃣ Démarrage de la synchronisation...');
      startUnifiedPollingSync();
      
      // 2. Déclencher plusieurs pollings avec authentification
      addLog('   2️⃣ Déclenchement de plusieurs pollings avec auth...');
      
      const operations = [
        { entityType: 'notes', operation: 'CREATE' },
        { entityType: 'folders', operation: 'CREATE' },
        { entityType: 'classeurs', operation: 'UPDATE' }
      ];
      
      for (const op of operations) {
        await triggerUnifiedPolling({
          entityType: op.entityType as any,
          operation: op.operation as any,
          entityId: `${op.entityType}-${Date.now()}`,
          userId: user?.id || 'test-user',
          delay: 300,
          authToken: authToken // ✅ CORRECTION: Transmettre le token
        });
        
        addLog(`      ✅ Polling ${op.entityType} ${op.operation} déclenché avec auth`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 3. Attendre et vérifier
      addLog('   3️⃣ Attente et vérification...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalStatus = getUnifiedPollingStatus();
      addLog(`      📊 Statut final: ${finalStatus.totalPollings} pollings, ${finalStatus.successfulPollings} succès`);
      
      // 4. Arrêter la synchronisation
      addLog('   4️⃣ Arrêt de la synchronisation...');
      stopUnifiedPollingSync();
      
      addLog('🎉 Test du workflow complet avec authentification terminé avec succès !');
      
    } catch (error) {
      addLog(`❌ Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="test-polling-auth p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🧪 Test de l'Authentification du Système de Polling
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Statut en temps réel */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-3">📊 Statut en Temps Réel</h2>
          
          <div className="mb-3">
            <h3 className="font-medium text-gray-700">Authentification</h3>
            <div className="text-sm text-gray-600">
              Token: <span className={authToken ? 'text-green-600' : 'text-red-600'}>
                {authToken ? '🟢 Présent' : '🔴 Absent'}
              </span>
            </div>
            {authToken && (
              <div className="text-xs text-gray-500 font-mono mt-1">
                {authToken.substring(0, 20)}...
              </div>
            )}
          </div>
          
          {syncStatus && (
            <div className="mb-3">
              <h3 className="font-medium text-gray-700">Synchronisation</h3>
              <div className="text-sm text-gray-600">
                Statut: <span className={syncStatus.isPolling ? 'text-green-600' : 'text-red-600'}>
                  {syncStatus.isPolling ? '🟢 Actif' : '🔴 Inactif'}
                </span>
              </div>
            </div>
          )}
          
          {pollingStatus && (
            <div>
              <h3 className="font-medium text-gray-700">Polling</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>En cours: <span className="font-mono">{pollingStatus.isPolling ? '🟢 Oui' : '🔴 Non'}</span></div>
                <div>Queue: <span className="font-mono">{pollingStatus.queueLength}</span></div>
                <div>Total: <span className="font-mono">{pollingStatus.totalPollings}</span></div>
                <div>Succès: <span className="font-mono text-green-600">{pollingStatus.successfulPollings}</span></div>
                <div>Échecs: <span className="font-mono text-red-600">{pollingStatus.failedPollings}</span></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Boutons de test */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-3">🧪 Tests Disponibles</h2>
          
          <div className="space-y-2">
            <button
              onClick={testAuthTokenRetrieval}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              🔐 Test Récupération Token
            </button>
            
            <button
              onClick={testPollingWithAuth}
              disabled={isLoading || !authToken}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              🔄 Test Polling avec Auth
            </button>
            
            <button
              onClick={testSyncServiceWithAuth}
              disabled={isLoading || !authToken}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              🔗 Test Sync avec Auth
            </button>
            
            <button
              onClick={testCompleteWorkflowWithAuth}
              disabled={isLoading || !authToken}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              🚀 Test Workflow Complet avec Auth
            </button>
          </div>
          
          <button
            onClick={clearLogs}
            className="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            🗑️ Effacer les Logs
          </button>
        </div>
      </div>
      
      {/* Logs de test */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-3">📋 Logs de Test</h2>
        
        <div className="bg-gray-100 p-3 rounded font-mono text-sm h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun test exécuté. Cliquez sur un bouton de test pour commencer.
            </div>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📖 Instructions de Test</h3>
        <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
          <li>Attendez que le token d'authentification soit récupéré automatiquement</li>
          <li>Testez la récupération du token d'authentification</li>
          <li>Testez le polling avec authentification</li>
          <li>Testez le service de synchronisation avec authentification</li>
          <li>Exécutez le workflow complet pour valider l'ensemble</li>
        </ol>
      </div>
    </div>
  );
} 