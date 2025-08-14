"use client";

import React, { useState } from 'react';

const TestSequentialToolCalls: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSequentialToolCalls = async () => {
    setIsLoading(true);
    addMessage('🚀 Test d\'enchaînement séquentiel des tool calls...');

    try {
      // Test avec plusieurs tool calls qui doivent s'exécuter séquentiellement
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée 3 dossiers dans Finance : KPI, Budget et Rapports. Après chaque création, commente ce qui a été fait.",
          context: { sessionId: 'test-sequential' },
          history: [],
          sessionId: 'test-sequential'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      addMessage(`📡 Réponse reçue: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          addMessage(`📋 Détails: ${JSON.stringify(data.tool_calls, null, 2)}`);
          
          if (data.tool_results && data.tool_results.length > 0) {
            addMessage(`✅ Tool results reçus: ${data.tool_results.length}`);
            
            // Analyser les résultats pour voir les commentaires
            const toolResults = data.tool_results;
            const comments = toolResults.filter((tr: any) => tr.is_comment);
            const tools = toolResults.filter((tr: any) => !tr.is_comment);
            
            addMessage(`🔧 Tools exécutés: ${tools.length}`);
            addMessage(`💬 Commentaires du LLM: ${comments.length}`);
            
            // Afficher les commentaires
            comments.forEach((comment: any, index: number) => {
              addMessage(`💬 Commentaire ${index + 1}: ${comment.result.comment}`);
            });
          }
          
          if (data.is_relance) {
            addMessage(`🔄 Relance détectée`);
            if (data.content) {
              addMessage(`💬 Réponse finale: ${data.content}`);
            } else {
              addMessage(`⚠️ Pas de contenu final`);
            }
          } else {
            addMessage(`⚠️ Pas de relance détectée`);
          }
          
          if (data.has_new_tool_calls) {
            addMessage(`🔄 NOUVEAUX TOOL CALLS DÉTECTÉS (continuation)`);
          }
        } else {
          addMessage(`✅ Réponse directe: ${data.content}`);
        }
      } else {
        addMessage(`❌ Erreur: ${data.error}`);
      }

    } catch (error) {
      addMessage(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithSpecificTools = async () => {
    setIsLoading(true);
    addMessage('🚀 Test avec outils spécifiques (create_folder + commentaires)...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée un dossier 'Test Séquentiel' puis commente ce qui a été fait, puis crée un sous-dossier 'Sous-test' et commente à nouveau.",
          context: { sessionId: 'test-specific-tools' },
          history: [],
          sessionId: 'test-specific-tools'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      addMessage(`📡 Réponse avec outils spécifiques: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          
          if (data.tool_results && data.tool_results.length > 0) {
            addMessage(`✅ Tool results reçus: ${data.tool_results.length}`);
            
            // Analyser la séquence
            const results = data.tool_results;
            addMessage(`📊 Séquence d'exécution:`);
            
            results.forEach((result: any, index: number) => {
              if (result.is_comment) {
                addMessage(`  ${index + 1}. 💬 Commentaire: ${result.result.comment}`);
              } else {
                addMessage(`  ${index + 1}. 🔧 Tool: ${result.name} - ${result.success ? '✅' : '❌'}`);
              }
            });
          }
        }
      }

    } catch (error) {
      addMessage(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="test-sequential-tool-calls p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Enchaînement Séquentiel des Tool Calls</h1>
      
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-green-800">🎯 Nouveau Comportement Attendu</h2>
        <p className="text-sm text-green-700 mb-2">
          <strong>Avant :</strong> Tous les tools s'exécutaient d'un coup, puis une seule réponse finale.
        </p>
        <p className="text-sm text-green-700">
          <strong>Maintenant :</strong> Tool 1 → Commentaire → Tool 2 → Commentaire → Tool 3 → Commentaire → Réponse finale.
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Tests de Validation</h2>
        <div className="flex gap-4">
          <button
            onClick={testSequentialToolCalls}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧🔧🔧 Test 3 Tools Séquentiels'}
          </button>
          <button
            onClick={testWithSpecificTools}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧💬 Test Tool + Commentaire + Tool'}
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ces tests vérifient que le LLM commente après chaque tool call avant de passer au suivant.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Logs de Test ({messages.length})</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500">Aucun log pour le moment. Lancez un test pour commencer.</div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="mb-1">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">🔍 Comportement Attendu</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>1. Premier tool call :</strong> create_folder "KPI" → Exécution ✅</p>
          <p><strong>2. Premier commentaire :</strong> LLM commente la création de KPI 💬</p>
          <p><strong>3. Deuxième tool call :</strong> create_folder "Budget" → Exécution ✅</p>
          <p><strong>4. Deuxième commentaire :</strong> LLM commente la création de Budget 💬</p>
          <p><strong>5. Troisième tool call :</strong> create_folder "Rapports" → Exécution ✅</p>
          <p><strong>6. Réponse finale :</strong> LLM résume et termine 🎯</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Résultat attendu :</strong> Conversation interactive avec commentaires après chaque action.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestSequentialToolCalls; 