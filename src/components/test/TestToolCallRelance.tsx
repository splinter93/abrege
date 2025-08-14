"use client";

import React, { useState } from 'react';

const TestToolCallRelance: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testTwoToolCalls = async () => {
    setIsLoading(true);
    addMessage('🚀 Test avec 2 tool calls (problème de relance)...');

    try {
      // Test exactement comme dans le terminal
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "crée 2 dossiers dedans : KPI et Budget",
          context: { sessionId: 'test-relance' },
          history: [],
          sessionId: 'test-relance'
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
            addMessage(`📊 Résultats: ${JSON.stringify(data.tool_results, null, 2)}`);
          }
          
          if (data.is_relance) {
            addMessage(`🔄 Relance détectée`);
            if (data.content) {
              addMessage(`💬 Réponse finale: ${data.content}`);
            } else {
              addMessage(`⚠️ Pas de contenu final`);
            }
            
            if (data.forced_response) {
              addMessage(`🔒 Réponse forcée (LLM bloqué)`);
            }
          } else {
            addMessage(`⚠️ Pas de relance détectée`);
          }
          
          if (data.has_new_tool_calls) {
            addMessage(`⚠️ NOUVEAUX TOOL CALLS DÉTECTÉS (PROBLÈME!)`);
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

  const testWithHistory = async () => {
    setIsLoading(true);
    addMessage('🚀 Test avec historique (reproduction exacte du terminal)...');

    try {
      // Reproduire exactement la conversation du terminal
      const history = [
        {
          role: 'user',
          content: 'ça va ?'
        },
        {
          role: 'assistant',
          content: 'Salut ! Je me porte à merveille, merci de demander. Et toi, comment ça va aujourd\'hui ? 😊'
        },
        {
          role: 'user',
          content: 'liste mes classeurs'
        },
        {
          role: 'assistant',
          content: 'Voici la liste complète de tes classeurs...'
        },
        {
          role: 'user',
          content: 'explorons Finance'
        },
        {
          role: 'assistant',
          content: '🎉 **Bienvenue dans le classeur « Finance » !**'
        }
      ];

      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "crée 2 dossiers dedans : KPI et Budget",
          context: { sessionId: 'test-relance-history' },
          history: history,
          sessionId: 'test-relance-history'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      addMessage(`📡 Réponse avec historique: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          
          if (data.tool_results && data.tool_results.length > 0) {
            addMessage(`✅ Tool results reçus: ${data.tool_results.length}`);
          }
          
          if (data.is_relance) {
            addMessage(`🔄 Relance détectée`);
            if (data.content) {
              addMessage(`💬 Réponse finale: ${data.content}`);
            } else {
              addMessage(`⚠️ Pas de contenu final`);
            }
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

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="test-tool-call-relance p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Tool Call Relance - Diagnostic</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-red-800">🚨 Problème Identifié</h2>
        <p className="text-sm text-red-700 mb-2">
          <strong>Symptôme :</strong> Le LLM génère encore des tool calls lors de la relance, même sans tools.
        </p>
        <p className="text-sm text-red-700 mb-2">
          <strong>Cause :</strong> Le LLM "mémorise" les tools de la conversation précédente.
        </p>
        <p className="text-sm text-red-700">
          <strong>Solution :</strong> Prompt forcé + blocage des nouveaux tool calls.
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Tests de Diagnostic</h2>
        <div className="flex gap-4">
          <button
            onClick={testTwoToolCalls}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧🔧 Test 2 Tool Calls (Problème)'}
          </button>
          <button
            onClick={testWithHistory}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '📚 Test avec Historique'}
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ces tests reproduisent exactement le problème observé dans le terminal.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Logs de Diagnostic ({messages.length})</h2>
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
        <h3 className="font-semibold mb-2">🔍 Analyse du Problème</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>1. Premier appel :</strong> LLM génère 2 tool calls ✅</p>
          <p><strong>2. Exécution :</strong> Premier tool call exécuté ✅</p>
          <p><strong>3. Relance :</strong> LLM génère ENCORE des tool calls ❌</p>
          <p><strong>4. Résultat :</strong> Système bloqué en boucle ❌</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Solution implémentée :</strong> Prompt forcé + blocage des nouveaux tool calls lors de la relance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestToolCallRelance; 