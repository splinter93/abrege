"use client";

import React, { useState } from 'react';

const TestToolsValidation: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testToolsValidation = async () => {
    setIsLoading(true);
    addMessage('🚀 Test de validation des tools...');

    try {
      // Test simple pour voir si l'erreur persiste
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Test simple - dis bonjour",
          context: { sessionId: 'test-tools-validation' },
          history: [],
          sessionId: 'test-tools-validation'
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
        addMessage(`✅ Test réussi ! Pas d'erreur "Tools should have a name!"`);
      } else {
        addMessage(`❌ Test échoué: ${data.error}`);
      }

    } catch (error) {
      addMessage(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testToolsAPI = async () => {
    setIsLoading(true);
    addMessage('🔧 Test de l\'API tools...');

    try {
      // Tester l'API tools directement
      const response = await fetch('/api/llm/tools');
      
      if (!response.ok) {
        addMessage(`❌ HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      addMessage(`📡 API Tools: ${data.totalTools} tools disponibles`);
      
      // Analyser la structure des tools
      if (data.tools && data.tools.length > 0) {
        const firstTool = data.tools[0];
        addMessage(`🔍 Premier tool analysé:`);
        addMessage(`  - Nom: ${firstTool.name}`);
        addMessage(`  - Description: ${firstTool.description?.substring(0, 100)}...`);
        addMessage(`  - Paramètres: ${JSON.stringify(firstTool.parameters).substring(0, 200)}...`);
        
        // Vérifier la structure
        const hasValidStructure = firstTool.name && firstTool.description && firstTool.parameters;
        addMessage(`✅ Structure valide: ${hasValidStructure ? 'OUI' : 'NON'}`);
      }

    } catch (error) {
      addMessage(`❌ Erreur API Tools: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithToolCall = async () => {
    setIsLoading(true);
    addMessage('🔧 Test avec tool call...');

    try {
      // Test qui devrait déclencher un tool call
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Crée une note de test simple",
          context: { sessionId: 'test-tool-call' },
          history: [],
          sessionId: 'test-tool-call'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage(`❌ HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      addMessage(`📡 Réponse avec tool call: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        if (data.tool_calls && data.tool_calls.length > 0) {
          addMessage(`🔧 Tool calls détectés: ${data.tool_calls.length}`);
          addMessage(`✅ Pas d'erreur "Tools should have a name!"`);
        } else {
          addMessage(`⚠️ Pas de tool calls générés`);
        }
      } else {
        addMessage(`❌ Test échoué: ${data.error}`);
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
    <div className="test-tools-validation p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Validation des Tools</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-red-800">🚨 Problème à Diagnostiquer</h2>
        <p className="text-sm text-red-700 mb-2">
          <strong>Erreur persistante :</strong> "Tools should have a name!" de l'API Groq
        </p>
        <p className="text-sm text-red-700">
          <strong>Objectif :</strong> Identifier et corriger les tools mal formatés
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Tests de Diagnostic</h2>
        <div className="flex gap-4">
          <button
            onClick={testToolsValidation}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🧪 Test Validation Tools'}
          </button>
          <button
            onClick={testToolsAPI}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧 Test API Tools'}
          </button>
          <button
            onClick={testWithToolCall}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test...' : '🔧 Test Tool Call'}
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ces tests diagnostiquent le problème de validation des tools.
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
        <h3 className="font-semibold mb-2">🔍 Diagnostic des Tools</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>1. Structure attendue :</strong> tool.function.name, tool.function.description, tool.function.parameters</p>
          <p><strong>2. Validation implémentée :</strong> Filtrage automatique des tools mal formatés</p>
          <p><strong>3. Logs de débogage :</strong> Analyse détaillée de chaque tool avant validation</p>
          <p><strong>4. Résultat attendu :</strong> Plus d'erreur "Tools should have a name!"</p>
        </div>
        <div className="mt-3 p-2 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Solution :</strong> Validation stricte + logs détaillés pour identifier les tools problématiques.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestToolsValidation; 