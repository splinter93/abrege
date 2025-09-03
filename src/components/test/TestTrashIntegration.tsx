import React, { useState } from 'react';
import { TrashService } from '@/services/trashService';
import { useTrash } from '@/hooks/useTrash';

/**
 * Composant de test pour vérifier l'intégration de la corbeille
 */
export default function TestTrashIntegration() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { items, statistics, loading, error } = useTrash();

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const testTrashService = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test du service TrashService...');
    
    try {
      // Test 1: Récupérer les éléments de la corbeille
      addLog('📋 Test récupération corbeille...');
      const { items, statistics } = await TrashService.getTrashItems();
      addLog(`✅ Corbeille récupérée: ${items.length} éléments`);
      addLog(`📊 Statistiques: ${statistics.total} total (${statistics.notes} notes, ${statistics.folders} dossiers, ${statistics.classeurs} classeurs)`);
      
      // Test 2: Vérifier les utilitaires
      if (items.length > 0) {
        const firstItem = items[0];
        addLog(`🔧 Test utilitaires sur "${firstItem.name}"...`);
        
        const daysUntilExpiry = TrashService.getDaysUntilExpiry(firstItem.trashed_at);
        const formattedDate = TrashService.formatDate(firstItem.trashed_at);
        const icon = TrashService.getItemIcon(firstItem.type);
        const typeLabel = TrashService.getItemTypeLabel(firstItem.type);
        
        addLog(`⏰ Jours restants: ${daysUntilExpiry}`);
        addLog(`📅 Date formatée: ${formattedDate}`);
        addLog(`🎨 Icône: ${icon}`);
        addLog(`🏷️ Type: ${typeLabel}`);
      }
      
      addLog('✅ Tous les tests du service sont passés !');
      
    } catch (error) {
      addLog(`❌ Erreur test service: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testHook = () => {
    addLog('🧪 Test du hook useTrash...');
    addLog(`📊 État du hook:`);
    addLog(`  - Loading: ${loading}`);
    addLog(`  - Error: ${error || 'Aucune'}`);
    addLog(`  - Items: ${items.length}`);
    addLog(`  - Statistics: ${JSON.stringify(statistics)}`);
    addLog('✅ Hook testé !');
  };

  const testMoveToTrash = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🧪 Test mise en corbeille...');
    
    try {
      // Note: Ce test nécessite un ID valide d'un élément existant
      addLog('⚠️ Ce test nécessite un ID valide d\'un élément existant');
      addLog('💡 Pour tester, utilisez un ID réel depuis votre interface');
      
      // Exemple de test (commenté car nécessite un ID valide)
      // await TrashService.moveToTrash('note', 'your-note-id-here');
      // addLog('✅ Élément mis en corbeille !');
      
    } catch (error) {
      addLog(`❌ Erreur test mise en corbeille: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Intégration Corbeille</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">🎯 Tests Disponibles</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={testTrashService}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            🧪 Test Service
          </button>

          <button
            onClick={testHook}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            🎣 Test Hook
          </button>

          <button
            onClick={testMoveToTrash}
            disabled={isRunning}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            🗑️ Test Mise en Corbeille
          </button>

          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer Logs
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">📊 État Actuel de la Corbeille</h2>
        <div className="bg-gray-100 p-4 rounded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{statistics.notes}</div>
              <div className="text-sm text-gray-600">Notes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{statistics.folders}</div>
              <div className="text-sm text-gray-600">Dossiers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{statistics.classeurs}</div>
              <div className="text-sm text-gray-600">Classeurs</div>
            </div>
          </div>
          
          {loading && <div className="mt-4 text-blue-600">⏳ Chargement...</div>}
          {error && <div className="mt-4 text-red-600">❌ Erreur: {error}</div>}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">📋 Logs de Test</h3>
          <span className="text-sm text-gray-500">{testResults.length} entrées</span>
        </div>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">Aucun log pour le moment...</div>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">📝 Éléments en Corbeille</h3>
        <div className="bg-white border rounded p-4 max-h-64 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-gray-500">Aucun élément en corbeille</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{TrashService.getItemIcon(item.type)}</span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {TrashService.getItemTypeLabel(item.type)} • 
                        Supprimé le {TrashService.formatDate(item.trashed_at)} • 
                        Expire dans {TrashService.getDaysUntilExpiry(item.trashed_at)} jours
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
