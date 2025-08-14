"use client";

import React, { useState } from 'react';

const TestToolChaining: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testToolChaining = async () => {
    setIsLoading(true);
    addMessage('🚀 Test de l\'enchaînement des tool calls...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée 3 dossiers de test : Test1, Test2 et Test3",
          context: { sessionId: 'test-tool-chaining' },
          history: [],
          sessionId: 'test-tool-chaining'
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
        
        // Analyser les tool calls
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          data.tool_calls.forEach((tc: any, index: number) => {
            addMessage(`  ${index + 1}. ID: ${tc.id}, Name: ${tc.function?.name}`);
          });
          
          // Vérifier si c'est un enchaînement
          if (data.tool_calls.length > 1) {
            addMessage(`✅ SUCCÈS: Enchaînement de ${data.tool_calls.length} tools détecté!`);
          } else {
            addMessage(`⚠️ ATTENTION: Seulement 1 tool call détecté (pas d'enchaînement)`);
          }
        } else {
          addMessage(`❌ PROBLÈME: Aucun tool call détecté`);
        }
        
        // Analyser les résultats des tools
        if (data.tool_results && data.tool_results.length > 0) {
          addMessage(`✅ Tool results détectés: ${data.tool_results.length}`);
          
          // Compter les résultats par type
          const toolResults = data.tool_results.filter((tr: any) => tr.name !== 'llm_comment');
          const commentResults = data.tool_results.filter((tr: any) => tr.name === 'llm_comment');
          
          addMessage(`  - Tools exécutés: ${toolResults.length}`);
          addMessage(`  - Commentaires LLM: ${commentResults.length}`);
          
          // Vérifier le succès de chaque tool
          toolResults.forEach((tr: any, index: number) => {
            const status = tr.success ? '✅' : '❌';
            addMessage(`  ${index + 1}. ${status} ${tr.name}: ${tr.success ? 'Succès' : 'Échec'}`);
          });
          
          // Vérifier l'enchaînement des résultats
          if (toolResults.length > 1) {
            addMessage(`✅ SUCCÈS: Enchaînement de ${toolResults.length} tools exécutés!`);
          } else {
            addMessage(`⚠️ ATTENTION: Seulement 1 tool exécuté (pas d'enchaînement)`);
          }
        } else {
          addMessage(`❌ PROBLÈME: Aucun résultat de tool détecté`);
        }
        
        // Vérifier si c'est une réponse forcée
        if (data.forced_response) {
          addMessage(`⚠️ PROBLÈME: Réponse forcée détectée!`);
          addMessage(`   - Le LLM a généré de nouveaux tool calls`);
          addMessage(`   - Le système a bloqué et forcé une réponse`);
          addMessage(`   - L'enchaînement est cassé`);
        } else {
          addMessage(`✅ SUCCÈS: Réponse naturelle du LLM`);
          addMessage(`   - Pas de nouveaux tool calls`);
          addMessage(`   - Réponse finale naturelle`);
          addMessage(`   - Enchaînement préservé`);
        }
        
        // Résumé final
        if (data.tool_calls && data.tool_calls.length > 1 && !data.forced_response) {
          addMessage(`🎉 EXCELLENT: Enchaînement de ${data.tool_calls.length} tools fonctionne parfaitement!`);
        } else if (data.tool_calls && data.tool_calls.length === 1) {
          addMessage(`⚠️ PROBLÈME: Le LLM ne génère qu'un seul tool call à la fois`);
        } else if (data.forced_response) {
          addMessage(`🚨 PROBLÈME: Réponse forcée, enchaînement cassé`);
        } else {
          addMessage(`❓ INCONNU: Comportement inattendu`);
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

  const testSimpleChaining = async () => {
    setIsLoading(true);
    addMessage('🚀 Test d\'enchaînement simple (2 tools)...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée un dossier 'Test' et ajoute une note 'Hello' dedans",
          context: { sessionId: 'test-simple-chaining' },
          history: [],
          sessionId: 'test-simple-chaining'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage(`❌ HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      addMessage(`📡 Réponse simple: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        addMessage(`🔍 Enchaînement simple:`);
        addMessage(`  - tool_calls: ${data.tool_calls ? `${data.tool_calls.length} tool(s)` : '❌ Absent'}`);
        addMessage(`  - tool_results: ${data.tool_results ? `${data.tool_results.length} résultat(s)` : '❌ Absent'}`);
        addMessage(`  - forced_response: ${data.forced_response ? '🔒 Oui' : '✅ Non'}`);
        
        if (data.tool_calls && data.tool_calls.length >= 2) {
          addMessage(`✅ SUCCÈS: Enchaînement de ${data.tool_calls.length} tools détecté!`);
        } else {
          addMessage(`⚠️ PROBLÈME: Enchaînement insuffisant (${data.tool_calls?.length || 0} tools)`);
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
    <div className="test-tool-chaining p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔗 Test Enchaînement Tool Calls - Diagnostic Complet</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-red-800">🚨 Problème Principal</h2>
        <p className="text-sm text-red-700 mb-2">
          <strong>Le LLM ne peut pas enchaîner plus d'un tool call à la fois</strong>
        </p>
        <p className="text-sm text-red-700">
          <strong>Cause identifiée :</strong> Fonction d'exécution séquentielle trop complexe avec commentaires LLM
        </p>
        <p className="text-sm text-red-700">
          <strong>Solution appliquée :</strong> Simplification de l'exécution séquentielle
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">🔍 Tests de Diagnostic</h2>
        <div className="flex gap-4">
          <button
            onClick={testToolChaining}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔗 Test Enchaînement 3 Tools'}
          </button>
          <button
            onClick={testSimpleChaining}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔗 Test Enchaînement 2 Tools'}
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ces tests vérifient que le LLM peut enchaîner plusieurs tool calls.
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
          <p><strong>1. LLM génère plusieurs tool calls :</strong> 2-3 tools d'un coup ✅</p>
          <p><strong>2. Exécution séquentielle :</strong> Tools exécutés un par un ✅</p>
          <p><strong>3. Relance du LLM :</strong> Pas de nouveaux tools ✅</p>
          <p><strong>4. Réponse finale :</strong> Naturelle du LLM ✅</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Correction appliquée :</strong> Simplification de l'exécution séquentielle, suppression des commentaires LLM complexes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestToolChaining; 