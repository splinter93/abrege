"use client";

import React, { useState } from 'react';
import { GroqResponsesProvider } from '@/services/llm/providers/implementations/groqResponses';

const TestGroqResponsesProvider: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGroqResponsesProvider = async () => {
    setIsLoading(true);
    addMessage('🚀 Test du GroqResponsesProvider...');

    try {
      // Créer une instance du provider avec configuration explicite
      const provider = new GroqResponsesProvider({
        apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
        model: 'openai/gpt-oss-20b',
        enableBrowserSearch: true,
        enableCodeExecution: true
      });
      
      addMessage(`✅ Provider créé: ${provider.name} (${provider.id})`);
      
      // Test de validation de configuration
      addMessage(`🔑 API Key configurée: ${provider.config.apiKey ? '✅ Oui' : '❌ Non'}`);
      addMessage(`🌐 Base URL: ${provider.config.baseUrl}`);
      addMessage(`🤖 Modèle: ${provider.config.model}`);
      
      const isValid = provider.validateConfig();
      addMessage(`🔧 Configuration valide: ${isValid ? '✅ Oui' : '❌ Non'}`);
      
      // Test de disponibilité
      const isAvailable = provider.isAvailable();
      addMessage(`📡 Provider disponible: ${isAvailable ? '✅ Oui' : '❌ Non'}`);
      
      // Test de connexion
      addMessage('🌐 Test de connexion à l\'API...');
      const connectionTest = await provider.testConnection();
      addMessage(`🔗 Connexion API: ${connectionTest ? '✅ Réussie' : '❌ Échec'}`);
      
      // Test des function calls
      addMessage('🔧 Test des function calls...');
      const functionCallsTest = await provider.testFunctionCalls();
      addMessage(`⚙️ Function calls: ${functionCallsTest ? '✅ Fonctionnels' : '❌ Échec'}`);
      
      // Test d'appel simple
      addMessage('💬 Test d\'appel simple...');
      const testContext = {
        type: 'chat_session' as const,
        id: 'test-session',
        name: 'Test Session'
      };
      
      const testHistory = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Bonjour',
          timestamp: new Date().toISOString(),
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          tool_results: undefined,
          isStreaming: false
        }
      ];
      
      const result = await provider.call('Comment ça va ?', testContext, testHistory);
      addMessage(`💭 Réponse reçue: ${result.content ? '✅ Oui' : '❌ Non'}`);
      addMessage(`🔍 Structure de la réponse: ${JSON.stringify(result, null, 2)}`);
      if (result.content) {
        addMessage(`📝 Contenu: ${result.content.substring(0, 100)}...`);
      }
      
      addMessage('🎉 Test terminé avec succès !');
      
    } catch (error) {
      addMessage(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testBrowserSearch = async () => {
    setIsLoading(true);
    addMessage('🌐 Test Browser Search...');

    try {
      const provider = new GroqResponsesProvider({
        apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
        model: 'openai/gpt-oss-20b',
        enableBrowserSearch: true,
        enableCodeExecution: false
      });
      
      const testContext = {
        type: 'chat_session' as const,
        id: 'test-browser',
        name: 'Test Browser Search'
      };
      
      const testHistory = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Quelle est la météo actuelle à Paris ?',
          timestamp: new Date().toISOString(),
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          tool_results: undefined,
          isStreaming: false
        }
      ];
      
      const result = await provider.call('Recherche la météo à Paris', testContext, testHistory);
      addMessage(`🌤️ Réponse Browser Search: ${result.content ? '✅ Reçue' : '❌ Échec'}`);
      if (result.content) {
        addMessage(`📝 Contenu: ${result.content.substring(0, 200)}...`);
      }
      
    } catch (error) {
      addMessage(`❌ Erreur Browser Search: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCodeExecution = async () => {
    setIsLoading(true);
    addMessage('🐍 Test Code Execution...');

    try {
      const provider = new GroqResponsesProvider({
        apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
        model: 'openai/gpt-oss-20b',
        enableBrowserSearch: false,
        enableCodeExecution: true
      });
      
      const testContext = {
        type: 'chat_session' as const,
        id: 'test-code',
        name: 'Test Code Execution'
      };
      
      const testHistory = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Calcule 123 * 456',
          timestamp: new Date().toISOString(),
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          tool_results: undefined,
          isStreaming: false
        }
      ];
      
      const result = await provider.call('Calcule 123 * 456', testContext, testHistory);
      addMessage(`🧮 Réponse Code Execution: ${result.content ? '✅ Reçue' : '❌ Échec'}`);
      if (result.content) {
        addMessage(`📝 Contenu: ${result.content.substring(0, 200)}...`);
      }
      
    } catch (error) {
      addMessage(`❌ Erreur Code Execution: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🧪 Test GroqResponsesProvider</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Ce test vérifie que le nouveau GroqResponsesProvider fonctionne correctement avec l'API Responses de Groq.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={testGroqResponsesProvider}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⏳ Test en cours...' : '🚀 Test Complet'}
          </button>
          
          <button
            onClick={testBrowserSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            🌐 Test Browser Search
          </button>
          
          <button
            onClick={testCodeExecution}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            🐍 Test Code Execution
          </button>
          
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Effacer
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">📋 Logs de test</h2>
        <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">Aucun test effectué. Cliquez sur un bouton pour commencer.</p>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => (
                <div key={index} className="text-sm font-mono">
                  {message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ Informations</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Provider ID:</strong> groq-responses</li>
          <li>• <strong>Version:</strong> 2.0.0</li>
          <li>• <strong>Browser Search:</strong> ✅ Supporté</li>
          <li>• <strong>Code Execution:</strong> ✅ Supporté</li>
          <li>• <strong>Images:</strong> ✅ Supporté</li>
          <li>• <strong>Structured Outputs:</strong> ✅ Supporté</li>
          <li>• <strong>Streaming:</strong> ❌ Non supporté (API Responses)</li>
          <li>• <strong>Reasoning:</strong> ❌ Non supporté (API Responses)</li>
        </ul>
      </div>
    </div>
  );
};

export default TestGroqResponsesProvider; 