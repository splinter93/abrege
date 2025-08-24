"use client";

import { useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { getUnifiedRealtimeStatus } from '@/services/unifiedRealtimeService';

/**
 * Composant de debug pour diagnostiquer les suppressions
 */
export default function TestDeleteDebug() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<any>(null);
  
  const { notes, folders, classeurs } = useFileSystemStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const checkRealtimeStatus = () => {
    const status = getUnifiedRealtimeStatus();
    setRealtimeStatus(status);
    addLog(`📊 Status Realtime: ${JSON.stringify(status, null, 2)}`);
  };

  const testDeleteWithDebug = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression avec debug complet...');
    
    try {
      // 1. Vérifier le statut du service
      checkRealtimeStatus();
      
      // 2. Vérifier l'état initial du store
      const startNotes = Object.keys(notes).length;
      const startFolders = Object.keys(folders).length;
      const startClasseurs = Object.keys(classeurs).length;
      
      addLog(`📊 État initial - Notes: ${startNotes}, Dossiers: ${startFolders}, Classeurs: ${startClasseurs}`);
      
      if (startNotes === 0) {
        addLog('❌ Aucune note disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      // 3. Sélectionner une note à supprimer
      const noteToDelete = Object.values(notes)[0];
      addLog(`🎯 Note à supprimer: ${noteToDelete.source_title} (${noteToDelete.id})`);
      
      // 4. Supprimer la note via l'API
      addLog('🗑️ Suppression de la note via API...');
      const deleteResult = await fetch(`/api/v2/note/${noteToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Note supprimée via API');
      
      // 5. Vérifier l'état immédiat après suppression
      setTimeout(() => {
        const immediateNotes = Object.keys(useFileSystemStore.getState().notes).length;
        addLog(`📊 État immédiat après suppression - Notes: ${immediateNotes}`);
        
        if (immediateNotes < startNotes) {
          addLog('✅ Suppression optimiste visible immédiatement');
        } else {
          addLog('❌ Suppression optimiste non visible');
        }
      }, 100);
      
      // 6. Attendre le polling et vérifier
      setTimeout(() => {
        const afterPollingNotes = Object.keys(useFileSystemStore.getState().notes).length;
        addLog(`📊 État après polling - Notes: ${afterPollingNotes}`);
        
        if (afterPollingNotes < startNotes) {
          addLog('✅ Suppression confirmée par polling !');
        } else {
          addLog('❌ Suppression non confirmée par polling');
        }
        
        // 7. Vérifier le statut final
        checkRealtimeStatus();
        
        setIsRunning(false);
      }, 3000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression: ${error}`);
      setIsRunning(false);
    }
  };

  const testPollingManual = async () => {
    addLog('🔄 Test polling manuel...');
    
    try {
      // Tester le polling des notes
      const response = await fetch('/api/v2/notes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`,
          'X-Client-Type': 'debug'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`📊 Données polling notes: ${JSON.stringify(data, null, 2)}`);
      } else {
        addLog(`❌ Erreur polling notes: ${response.statusText}`);
      }
      
      // Tester le polling des classeurs avec contenu
      const responseClasseurs = await fetch('/api/v2/classeurs/with-content', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`,
          'X-Client-Type': 'debug'
        }
      });
      
      if (responseClasseurs.ok) {
        const dataClasseurs = await responseClasseurs.json();
        addLog(`📊 Données polling classeurs: ${JSON.stringify(dataClasseurs, null, 2)}`);
      } else {
        addLog(`❌ Erreur polling classeurs: ${responseClasseurs.statusText}`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur test polling manuel: ${error}`);
    }
  };

  const testDirectPolling = async () => {
    addLog('🎯 Test déclenchement direct du polling...');
    
    try {
      // Importer et tester directement le service
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      
      addLog('🔄 Déclenchement polling notes.DELETE...');
      await triggerUnifiedRealtimePolling('notes', 'DELETE');
      addLog('✅ Polling déclenché');
      
      // Attendre un peu et vérifier
      setTimeout(() => {
        const currentNotes = Object.keys(useFileSystemStore.getState().notes).length;
        addLog(`📊 Notes après polling direct: ${currentNotes}`);
        checkRealtimeStatus();
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test polling direct: ${error}`);
    }
  };

  const testServiceInitialization = async () => {
    addLog('🔧 Test initialisation du service...');
    
    try {
      // 1. Vérifier le statut actuel
      const status = getUnifiedRealtimeStatus();
      addLog(`📊 Status actuel: ${JSON.stringify(status, null, 2)}`);
      
      // 2. Vérifier si le service est initialisé
      if (status.provider === 'none') {
        addLog('❌ Service non initialisé !');
        addLog('🔧 Tentative d\'initialisation...');
        
        // Importer et initialiser le service
        const { initializeUnifiedRealtime } = await import('@/services/unifiedRealtimeService');
        
        const success = await initializeUnifiedRealtime({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          userId: 'test-user',
          userToken: 'test-token',
          debug: true
        });
        
        if (success) {
          addLog('✅ Service initialisé avec succès');
          checkRealtimeStatus();
        } else {
          addLog('❌ Échec de l\'initialisation du service');
        }
      } else {
        addLog(`✅ Service initialisé avec le provider: ${status.provider}`);
      }
      
    } catch (error) {
      addLog(`❌ Erreur test initialisation: ${error}`);
    }
  };

  const forceInitializeAndTest = async () => {
    addLog('🚀 Force initialisation et test immédiat...');
    
    try {
      // 1. Forcer l'initialisation du service
      const { initializeUnifiedRealtime } = await import('@/services/unifiedRealtimeService');
      
      const success = await initializeUnifiedRealtime({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        userId: 'test-user',
        userToken: 'test-token',
        debug: true
      });
      
      if (!success) {
        addLog('❌ Échec de l\'initialisation');
        return;
      }
      
      addLog('✅ Service initialisé');
      
      // 2. Vérifier le statut
      checkRealtimeStatus();
      
      // 3. Tester immédiatement le polling
      setTimeout(async () => {
        addLog('🔄 Test polling immédiat après initialisation...');
        
        try {
          const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
          await triggerUnifiedRealtimePolling('notes', 'CREATE');
          addLog('✅ Polling testé avec succès');
          
          // Vérifier le statut final
          checkRealtimeStatus();
        } catch (error) {
          addLog(`❌ Erreur test polling: ${error}`);
        }
      }, 1000);
      
    } catch (error) {
      addLog(`❌ Erreur force initialisation: ${error}`);
    }
  };

  const testSimpleDelete = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression simple (sans dépendance store)...');
    
    try {
      // 1. Vérifier l'état initial
      const startNotes = Object.keys(notes).length;
      addLog(`📊 Notes avant suppression: ${startNotes}`);
      
      if (startNotes === 0) {
        addLog('❌ Aucune note disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      // 2. Sélectionner une note à supprimer
      const noteToDelete = Object.values(notes)[0];
      addLog(`🎯 Note à supprimer: ${noteToDelete.source_title} (${noteToDelete.id})`);
      
      // 3. Supprimer directement via l'API (sans passer par V2UnifiedApi)
      addLog('🗑️ Suppression directe via API...');
      const deleteResult = await fetch(`/api/v2/note/${noteToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test-token'}`
        }
      });
      
      if (!deleteResult.ok) {
        addLog(`❌ Erreur suppression: ${deleteResult.statusText}`);
        setIsRunning(false);
        return;
      }
      
      addLog('✅ Note supprimée via API');
      
      // 4. Attendre et vérifier
      setTimeout(() => {
        const currentNotes = Object.keys(useFileSystemStore.getState().notes).length;
        addLog(`📊 Notes après suppression: ${currentNotes}`);
        
        if (currentNotes < startNotes) {
          addLog('✅ Suppression visible en temps réel !');
        } else {
          addLog('❌ Suppression non visible en temps réel');
        }
        
        setIsRunning(false);
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test suppression simple: ${error}`);
      setIsRunning(false);
    }
  };

  const testV2UnifiedApiDelete = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test suppression via V2UnifiedApi (corrigé)...');
    
    try {
      // 1. Vérifier l'état initial
      const startNotes = Object.keys(notes).length;
      addLog(`📊 Notes avant suppression: ${startNotes}`);
      
      if (startNotes === 0) {
        addLog('❌ Aucune note disponible pour le test');
        setIsRunning(false);
        return;
      }
      
      // 2. Sélectionner une note à supprimer
      const noteToDelete = Object.values(notes)[0];
      addLog(`🎯 Note à supprimer: ${noteToDelete.source_title} (${noteToDelete.id})`);
      
      // 3. Supprimer via V2UnifiedApi (maintenant corrigé)
      addLog('🗑️ Suppression via V2UnifiedApi...');
      
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      const result = await v2Api.deleteNote(noteToDelete.id);
      
      if (result.success) {
        addLog('✅ Note supprimée via V2UnifiedApi');
      } else {
        addLog(`❌ Erreur V2UnifiedApi: ${result.error}`);
        setIsRunning(false);
        return;
      }
      
      // 4. Attendre et vérifier
      setTimeout(() => {
        const currentNotes = Object.keys(useFileSystemStore.getState().notes).length;
        addLog(`📊 Notes après suppression V2UnifiedApi: ${currentNotes}`);
        
        if (currentNotes < startNotes) {
          addLog('✅ Suppression V2UnifiedApi visible en temps réel !');
        } else {
          addLog('❌ Suppression V2UnifiedApi non visible en temps réel');
        }
        
        setIsRunning(false);
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur test V2UnifiedApi: ${error}`);
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  // Surveiller les changements du store
  useEffect(() => {
    addLog(`📊 Store mis à jour - Notes: ${Object.keys(notes).length}, Dossiers: ${Object.keys(folders).length}, Classeurs: ${Object.keys(classeurs).length}`);
  }, [notes, folders, classeurs]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🐛 Debug des Suppressions
        </h2>
        <p className="text-gray-600">
          Diagnostic complet pour identifier pourquoi les suppressions ne sont pas visibles en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button
          onClick={testDeleteWithDebug}
          disabled={isRunning}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          🧪 Test Suppression avec Debug
        </button>
        
        <button
          onClick={testPollingManual}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          🔄 Test Polling Manuel
        </button>
        
        <button
          onClick={testDirectPolling}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          🎯 Test Polling Direct
        </button>
        
        <button
          onClick={testServiceInitialization}
          disabled={isRunning}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          🔧 Test Initialisation Service
        </button>

        <button
          onClick={forceInitializeAndTest}
          disabled={isRunning}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          🚀 Force Initialisation et Test
        </button>

        <button
          onClick={testSimpleDelete}
          disabled={isRunning}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          🧪 Test Suppression Simple
        </button>

        <button
          onClick={testV2UnifiedApiDelete}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          🧪 Test Suppression V2UnifiedApi
        </button>

        <button
          onClick={checkRealtimeStatus}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          📊 Vérifier Status Realtime
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">📊 État du Store</h3>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <div className="bg-gray-100 p-3 rounded text-sm">
          <div>📝 Notes: {Object.keys(notes).length}</div>
          <div>📁 Dossiers: {Object.keys(folders).length}</div>
          <div>📚 Classeurs: {Object.keys(classeurs).length}</div>
        </div>
      </div>

      {realtimeStatus && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">📡 Status Realtime</h3>
          <div className="bg-blue-100 p-3 rounded text-sm">
            <pre className="text-xs overflow-auto">{JSON.stringify(realtimeStatus, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
        {testResults.length === 0 ? (
          <div className="text-gray-500">Aucun test exécuté...</div>
        ) : (
          testResults.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
} 