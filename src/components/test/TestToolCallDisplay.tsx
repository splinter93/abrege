"use client";

import React, { useState } from 'react';

const TestToolCallDisplay: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSimpleToolCall = async () => {
    setIsLoading(true);
    addMessage('🚀 Test simple avec un tool call...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée un dossier de test",
          context: { sessionId: 'test-simple-display' },
          history: [],
          sessionId: 'test-simple-display'
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
        // Vérifier la structure de la réponse
        addMessage(`🔍 Structure de la réponse:`);
        addMessage(`  - success: ${data.success}`);
        addMessage(`  - content: ${data.content ? '✅ Présent' : '❌ Absent'}`);
        addMessage(`  - tool_calls: ${data.tool_calls ? `${data.tool_calls.length} tool(s)` : '❌ Absent'}`);
        addMessage(`  - tool_results: ${data.tool_results ? `${data.tool_results.length} résultat(s)` : '❌ Absent'}`);
        addMessage(`  - is_relance: ${data.is_relance ? '✅ Oui' : '❌ Non'}`);
        addMessage(`  - forced_response: ${data.forced_response ? '🔒 Oui (problème!)' : '✅ Non'}`);
        
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés:`);
          data.tool_calls.forEach((tc: any, index: number) => {
            addMessage(`  ${index + 1}. ID: ${tc.id}, Name: ${tc.function?.name}`);
          });
        }
        
        if (data.tool_results && data.tool_results.length > 0) {
          addMessage(`✅ Tool results détectés:`);
          data.tool_results.forEach((tr: any, index: number) => {
            addMessage(`  ${index + 1}. ID: ${tr.tool_call_id}, Name: ${tr.name}, Success: ${tr.success}`);
          });
        }
        
        // Vérifier si c'est une réponse forcée
        if (data.forced_response) {
          addMessage(`⚠️ PROBLÈME: Réponse forcée détectée!`);
          addMessage(`   - Le LLM a généré de nouveaux tool calls`);
          addMessage(`   - Le système a bloqué et forcé une réponse`);
          addMessage(`   - L'UI ne peut pas afficher les tool calls`);
        } else {
          addMessage(`✅ SUCCÈS: Réponse naturelle du LLM`);
          addMessage(`   - Pas de nouveaux tool calls`);
          addMessage(`   - Réponse finale naturelle`);
          addMessage(`   - L'UI peut afficher les tool calls`);
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
    addMessage('🚀 Test avec plusieurs tool calls...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée 2 dossiers: Test1 et Test2",
          context: { sessionId: 'test-multiple-display' },
          history: [],
          sessionId: 'test-multiple-display'
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
        addMessage(`🔍 Structure de la réponse multiple:`);
        addMessage(`  - tool_calls: ${data.tool_calls ? `${data.tool_calls.length} tool(s)` : '❌ Absent'}`);
        addMessage(`  - tool_results: ${data.tool_results ? `${data.tool_results.length} résultat(s)` : '❌ Absent'}`);
        addMessage(`  - forced_response: ${data.forced_response ? '🔒 Oui (problème!)' : '✅ Non'}`);
        
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls multiples détectés:`);
          data.tool_calls.forEach((tc: any, index: number) => {
            addMessage(`  ${index + 1}. ID: ${tc.id}, Name: ${tc.function?.name}`);
          });
        }
        
        if (data.tool_results && data.tool_results.length > 0) {
          addMessage(`✅ Tool results multiples détectés:`);
          data.tool_results.forEach((tr: any, index: number) => {
            addMessage(`  ${index + 1}. ID: ${tr.tool_call_id}, Name: ${tr.name}, Success: ${tr.success}`);
          });
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
    <div className="test-tool-call-display p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔧 Test Affichage Tool Calls - UI Debug</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-red-800">🚨 Problème Identifié</h2>
        <p className="text-sm text-red-700 mb-2">
          <strong>1. UI ne montre plus les tool calls</strong> → Impossible de débugger
        </p>
        <p className="text-sm text-red-700 mb-2">
          <strong>2. LLM ment sur le nombre d'actions</strong> → Une seule exécutée, mais dit "plusieurs"
        </p>
        <p className="text-sm text-red-700">
          <strong>3. Enchaînement cassé</strong> → Plus de séquence d'outils
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">🔍 Tests de Diagnostic</h2>
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
          Ces tests vérifient la structure de la réponse et l'affichage des tool calls.
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
        <h3 className="font-semibold mb-2">🎯 Comportement Attendu</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>1. Tool call(s) exécuté(s) :</strong> Succès ✅</p>
          <p><strong>2. Relance du LLM :</strong> Pas de nouveaux tools ✅</p>
          <p><strong>3. Réponse finale :</strong> Naturelle du LLM ✅</p>
          <p><strong>4. UI :</strong> Tool calls visibles et résultats ✅</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Correction appliquée :</strong> Suppression des tools lors de la relance pour éviter les boucles infinies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestToolCallDisplay; 