"use client";

import React, { useState } from 'react';

const TestFinalResponse: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSingleToolCall = async () => {
    setIsLoading(true);
    addMessage('🚀 Test avec un seul tool call (devrait donner une réponse finale)...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée un dossier de test simple",
          context: { sessionId: 'test-single-tool' },
          history: [],
          sessionId: 'test-single-tool'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage(`❌ HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      addMessage(`📡 Réponse reçue: ${JSON.stringify(data, null, 2)}`);

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
              
              // Vérifier si c'est une réponse forcée
              if (data.forced_response) {
                addMessage(`🔒 Réponse forcée (LLM bloqué)`);
              } else {
                addMessage(`✅ Réponse naturelle du LLM`);
              }
            } else {
              addMessage(`⚠️ Pas de contenu final`);
            }
          } else {
            addMessage(`⚠️ Pas de relance détectée`);
          }
          
          if (data.has_new_tool_calls) {
            addMessage(`⚠️ NOUVEAUX TOOL CALLS DÉTECTÉS (PROBLÈME!)`);
          } else {
            addMessage(`✅ Pas de nouveaux tool calls (SUCCÈS!)`);
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
    addMessage('🚀 Test avec plusieurs tool calls (devrait donner une réponse finale)...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée 2 dossiers de test : Test1 et Test2",
          context: { sessionId: 'test-multiple-tools' },
          history: [],
          sessionId: 'test-multiple-tools'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage(`❌ HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      addMessage(`📡 Réponse avec multiples tools: ${JSON.stringify(data, null, 2)}`);

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
              
              if (data.forced_response) {
                addMessage(`🔒 Réponse forcée (LLM bloqué)`);
              } else {
                addMessage(`✅ Réponse naturelle du LLM`);
              }
            }
          }
          
          if (data.has_new_tool_calls) {
            addMessage(`⚠️ NOUVEAUX TOOL CALLS DÉTECTÉS (PROBLÈME!)`);
          } else {
            addMessage(`✅ Pas de nouveaux tool calls (SUCCÈS!)`);
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
    <div className="test-final-response p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Réponse Finale - Sans Nouveaux Tool Calls</h1>
      
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-green-800">🎯 Objectif du Test</h2>
        <p className="text-sm text-green-700 mb-2">
          <strong>Problème résolu :</strong> L'erreur "Tools should have a name!" est corrigée.
        </p>
        <p className="text-sm text-green-700">
          <strong>Nouveau problème :</strong> Le LLM génère encore des tool calls lors de la relance.
        </p>
        <p className="text-sm text-green-700">
          <strong>Solution :</strong> Prompt plus strict + blocage automatique des nouveaux tool calls.
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Tests de Validation</h2>
        <div className="flex gap-4">
          <button
            onClick={testSingleToolCall}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧 Test Single Tool Call'}
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
          Ces tests vérifient que le LLM donne une réponse finale sans nouveaux tool calls.
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
          <p><strong>1. Tool call(s) exécuté(s) :</strong> Succès ✅</p>
          <p><strong>2. Relance du LLM :</strong> Prompt strict (pas de nouveaux tools) ✅</p>
          <p><strong>3. Réponse finale :</strong> Naturelle du LLM (pas forcée) ✅</p>
          <p><strong>4. Résultat :</strong> Conversation complète et naturelle ✅</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Amélioration :</strong> Prompt plus strict pour éviter la génération de nouveaux tool calls.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestFinalResponse; 