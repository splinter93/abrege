"use client";

import React, { useState } from 'react';

const TestSimpleToolCall: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSimpleToolCall = async () => {
    setIsLoading(true);
    addMessage('🚀 Test simple tool call...');

    try {
      // Test avec un seul tool call
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée une note de test simple",
          context: { sessionId: 'test-simple' },
          history: [],
          sessionId: 'test-simple'
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
          } else {
            addMessage(`⚠️ Pas de relance détectée`);
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

  const testMultipleToolCalls = async () => {
    setIsLoading(true);
    addMessage('🚀 Test multiple tool calls...');

    try {
      // Test avec plusieurs tool calls
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée 3 notes de test avec des titres différents",
          context: { sessionId: 'test-multiple' },
          history: [],
          sessionId: 'test-multiple'
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
          } else {
            addMessage(`⚠️ Pas de relance détectée`);
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
    <div className="test-simple-tool-call p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Simple Tool Call - Diagnostic</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Tests de Diagnostic</h2>
        <div className="flex gap-4">
          <button
            onClick={testSimpleToolCall}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧 Test Simple Tool Call'}
          </button>
          <button
            onClick={testMultipleToolCalls}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧🔧 Test Multiple Tool Calls'}
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ces tests diagnostiquent le problème de relance après l'exécution des tool calls.
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
        <h3 className="font-semibold mb-2">🔍 Problème Diagnostiqué</h3>
        <p className="text-sm text-gray-700 mb-2">
          <strong>Symptôme :</strong> Le premier tool call s'exécute mais pas de réponse finale.
        </p>
        <p className="text-sm text-gray-700 mb-2">
          <strong>Cause probable :</strong> Le second appel au LLM (relance) ne génère pas de réponse.
        </p>
        <p className="text-sm text-gray-700">
          <strong>Solution testée :</strong> Suppression des tools lors de la relance pour éviter les boucles infinies.
        </p>
      </div>
    </div>
  );
};

export default TestSimpleToolCall; 