"use client";

import React, { useState } from 'react';

const TestGroqProviderValidation: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testGroqProviderValidation = async () => {
    setIsLoading(true);
    addMessage('🚀 Test de la validation des tools dans GroqProvider...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée un dossier de test simple",
          context: { sessionId: 'test-groq-validation' },
          history: [],
          sessionId: 'test-groq-validation'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage(`❌ HTTP ${response.status}: ${errorText}`);
        
        // Vérifier si c'est l'erreur "Tools should have a name!"
        if (errorText.includes('Tools should have a name!')) {
          addMessage(`🚨 PROBLÈME: L'erreur "Tools should have a name!" persiste!`);
          addMessage(`   - La validation dans GroqProvider ne fonctionne pas`);
          addMessage(`   - Les tools malformés arrivent encore à l'API Groq`);
        }
        return;
      }

      const data = await response.json();
      addMessage(`📡 Réponse reçue: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        addMessage(`✅ SUCCÈS: Plus d'erreur "Tools should have a name!"`);
        addMessage(`🔍 Structure de la réponse:`);
        addMessage(`  - success: ${data.success}`);
        addMessage(`  - tool_calls: ${data.tool_calls ? `${data.tool_calls.length} tool(s)` : '❌ Absent'}`);
        addMessage(`  - tool_results: ${data.tool_results ? `${data.tool_results.length} résultat(s)` : '❌ Absent'}`);
        
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          data.tool_calls.forEach((tc: any, index: number) => {
            addMessage(`  ${index + 1}. ID: ${tc.id}, Name: ${tc.function?.name}`);
          });
        }
        
        if (data.tool_results && data.tool_results.length > 0) {
          addMessage(`✅ Tool results détectés: ${data.tool_results.length}`);
          data.tool_results.forEach((tr: any, index: number) => {
            addMessage(`  ${index + 1}. ${tr.name}: ${tr.success ? '✅ Succès' : '❌ Échec'}`);
          });
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

  const testMultipleToolsValidation = async () => {
    setIsLoading(true);
    addMessage('🚀 Test de validation avec plusieurs tools...');

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée 2 dossiers de test",
          context: { sessionId: 'test-multiple-validation' },
          history: [],
          sessionId: 'test-multiple-validation'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage(`❌ HTTP ${response.status}: ${errorText}`);
        
        if (errorText.includes('Tools should have a name!')) {
          addMessage(`🚨 PROBLÈME: Validation échoue avec plusieurs tools!`);
        }
        return;
      }

      const data = await response.json();
      addMessage(`📡 Réponse multiple: ${JSON.stringify(data, null,2)}`);

      if (data.success) {
        addMessage(`✅ SUCCÈS: Validation réussie avec plusieurs tools`);
        addMessage(`  - tool_calls: ${data.tool_calls ? `${data.tool_calls.length} tool(s)` : '❌ Absent'}`);
        addMessage(`  - tool_results: ${data.tool_results ? `${data.tool_results.length} résultat(s)` : '❌ Absent'}`);
        
        if (data.tool_calls && data.tool_calls.length > 1) {
          addMessage(`🎉 EXCELLENT: Enchaînement de ${data.tool_calls.length} tools fonctionne!`);
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
    <div className="test-groq-provider-validation p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔧 Test Validation Tools - GroqProvider</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-red-800">🚨 Problème Récurrent</h2>
        <p className="text-sm text-red-700 mb-2">
          <strong>L'erreur "Tools should have a name!" revient constamment</strong>
        </p>
        <p className="text-sm text-red-700 mb-2">
          <strong>Cause identifiée :</strong> Validation manquante dans GroqProvider
        </p>
        <p className="text-sm text-red-700">
          <strong>Solution appliquée :</strong> Validation stricte des tools avant envoi à l'API Groq
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">🔍 Tests de Validation</h2>
        <div className="flex gap-4">
          <button
            onClick={testGroqProviderValidation}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧 Test Validation Simple'}
          </button>
          <button
            onClick={testMultipleToolsValidation}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧🔧 Test Validation Multiple'}
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ces tests vérifient que la validation des tools dans GroqProvider fonctionne.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Logs de Validation ({messages.length})</h2>
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
          <p><strong>1. Plus d'erreur 400 :</strong> "Tools should have a name!" ✅</p>
          <p><strong>2. Validation des tools :</strong> Tools malformés filtrés ✅</p>
          <p><strong>3. Appel API réussi :</strong> Tools valides envoyés ✅</p>
          <p><strong>4. Enchaînement :</strong> Plusieurs tools fonctionnent ✅</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Correction appliquée :</strong> Validation stricte des tools dans GroqProvider avant envoi à l'API Groq.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestGroqProviderValidation; 