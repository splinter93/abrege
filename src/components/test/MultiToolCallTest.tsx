'use client';
import React, { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';

const MultiToolCallTest: React.FC = () => {
  const [testMessage, setTestMessage] = useState<string>('Liste tous mes classeurs et crée un nouveau dossier "Test Multi-Tools"');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testMultiToolCall = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);

    try {
      addLog('🚀 Début du test multi-tool call');
      addLog(`📝 Message de test: "${testMessage}"`);

      // Vérifier qu'on a une session active
      const { currentSession } = useChatStore.getState();
      if (!currentSession) {
        addLog('❌ Aucune session active');
        setError('Aucune session de chat active');
        return;
      }

      addLog(`✅ Session active: ${currentSession.name} (${currentSession.id})`);

      // Appeler l'API LLM
      addLog('📡 Appel de l\'API LLM...');
      
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          sessionId: currentSession.id,
          appContext: {
            type: 'chat_session',
            name: 'Test Multi-Tools',
            id: 'test-multi-tools',
            content: 'Test des multi-tool calls'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Erreur API: ${response.status} - ${errorText}`);
        setError(`Erreur API: ${response.status}`);
        return;
      }

      const data = await response.json();
      addLog(`✅ Réponse reçue: ${response.status}`);
      
      // Analyser la réponse
      addLog('🔍 Analyse de la réponse...');
      
      if (data.success) {
        addLog(`✅ Succès: ${data.content ? 'Contenu reçu' : 'Pas de contenu'}`);
        
        if (data.tool_calls && data.tool_calls.length > 0) {
          addLog(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          data.tool_calls.forEach((toolCall: any, index: number) => {
            addLog(`  Tool ${index + 1}: ${toolCall.function?.name || 'Nom manquant'}`);
          });
        } else {
          addLog('⚠️ Aucun tool call détecté');
        }

        if (data.tool_results && data.tool_results.length > 0) {
          addLog(`📊 Tool results: ${data.tool_results.length}`);
          data.tool_results.forEach((result: any, index: number) => {
            addLog(`  Result ${index + 1}: ${result.name} - ${result.success ? '✅' : '❌'}`);
          });
        } else {
          addLog('⚠️ Aucun tool result');
        }

        if (data.is_relance) {
          addLog('🔄 Relance détectée');
        }

        if (data.has_new_tool_calls) {
          addLog('🆕 Nouveaux tool calls détectés');
        }

        if (data.has_failed_tools) {
          addLog('❌ Tools échoués détectés');
        }

        setResult(data);
      } else {
        addLog(`❌ Échec: ${data.error || 'Erreur inconnue'}`);
        setError(data.error || 'Erreur inconnue');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`💥 Erreur fatale: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      addLog('🏁 Test terminé');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Test Multi-Tool Calls</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration du test */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2">🔧 Configuration du test</h3>
            
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Message de test:</label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                rows={3}
                placeholder="Message qui devrait déclencher des tool calls..."
              />
            </div>

            <button
              onClick={testMultiToolCall}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? '⏳ Test en cours...' : '🚀 Lancer le test'}
            </button>

            <button
              onClick={clearLogs}
              className="w-full mt-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              🗑️ Effacer les logs
            </button>
          </div>

          {/* Résultats */}
          {result && (
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold mb-2">📊 Résultats</h3>
              <div className="text-sm space-y-1">
                <p><strong>Succès:</strong> {result.success ? '✅' : '❌'}</p>
                <p><strong>Tool calls:</strong> {result.tool_calls?.length || 0}</p>
                <p><strong>Tool results:</strong> {result.tool_results?.length || 0}</p>
                <p><strong>Relance:</strong> {result.is_relance ? '🔄' : '❌'}</p>
                <p><strong>Nouveaux tools:</strong> {result.has_new_tool_calls ? '🆕' : '❌'}</p>
                <p><strong>Tools échoués:</strong> {result.has_failed_tools ? '❌' : '✅'}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded">
              <h3 className="font-semibold mb-2">❌ Erreur</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Logs détaillés */}
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">📝 Logs détaillés</h3>
          <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun log disponible</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono bg-gray-100 p-1 rounded">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Détails de la réponse */}
      {result && (
        <div className="mt-6 bg-yellow-50 p-4 rounded">
          <h3 className="font-semibold mb-2">🔍 Détails de la réponse</h3>
          <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-purple-50 p-4 rounded">
        <h3 className="font-semibold mb-2">📋 Instructions de diagnostic</h3>
        <ol className="text-sm list-decimal list-inside space-y-1">
          <li>Assurez-vous d'avoir une session de chat active</li>
          <li>Modifiez le message de test si nécessaire</li>
          <li>Lancez le test et observez les logs</li>
          <li>Vérifiez la console du navigateur pour plus de détails</li>
          <li>Analysez la réponse complète en bas de page</li>
        </ol>
      </div>
    </div>
  );
};

export default MultiToolCallTest; 