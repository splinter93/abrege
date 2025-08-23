/**
 * 🧪 Test Simple des Tool Calls
 * 
 * Vérifie que les tool calls fonctionnent correctement
 */

"use client";

import { useState } from 'react';
import { useChatResponse } from '@/hooks/useChatResponse';

export default function TestToolCallsSimple() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const { sendMessage, isProcessing } = useChatResponse({
    onComplete: (content, reasoning) => {
      addMessage(`✅ Réponse reçue: ${content.length} caractères`);
      if (reasoning) {
        addMessage(`🧠 Raisonnement: ${reasoning.length} caractères`);
      }
    },
    onError: (error) => {
      addMessage(`❌ Erreur: ${error}`);
    },
    onToolCalls: (toolCalls, toolName) => {
      addMessage(`🔧 Tool calls détectés: ${toolCalls.length} tools (${toolName})`);
      toolCalls.forEach((tool, index) => {
        addMessage(`  - Tool ${index + 1}: ${tool.name}`);
      });
    },
    onToolResult: (toolName, result, success, toolCallId) => {
      addMessage(`${success ? '✅' : '❌'} Tool ${toolName} ${success ? 'réussi' : 'échoué'}`);
    }
  });

  const testSimpleMessage = async () => {
    setIsLoading(true);
    try {
      addMessage('🧪 Test message simple...');
      
      await sendMessage(
        'Bonjour, comment allez-vous ?',
        'test-session-123',
        { sessionId: 'test-session-123' },
        []
      );
      
      addMessage('✅ Message simple envoyé');
    } catch (error) {
      addMessage(`❌ Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testToolCallMessage = async () => {
    setIsLoading(true);
    try {
      addMessage('🧪 Test message avec tool calls...');
      
      await sendMessage(
        'Liste tous les classeurs disponibles',
        'test-session-123',
        { sessionId: 'test-session-123' },
        []
      );
      
      addMessage('✅ Message avec tool calls envoyé');
    } catch (error) {
      addMessage(`❌ Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Simple des Tool Calls</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">📋 Description</h2>
        <p className="text-gray-600">
          Ce composant teste que les tool calls fonctionnent correctement après notre correction.
        </p>
      </div>

      {/* Boutons de Test */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testSimpleMessage}
          disabled={isLoading || isProcessing}
          className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '✅'} Message Simple
        </button>
        
        <button
          onClick={testToolCallMessage}
          disabled={isLoading || isProcessing}
          className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '🔧'} Message avec Tool Calls
        </button>
        
        <button
          onClick={clearMessages}
          className="p-3 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          🗑️ Effacer les Messages
        </button>
      </div>

      {/* Statut */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📊 Statut</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Traitement en cours:</span> {isProcessing ? '🟡 Oui' : '🟢 Non'}
          </div>
          <div>
            <span className="font-medium">Test en cours:</span> {isLoading ? '🟡 Oui' : '🟢 Non'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">📝 Messages de Test</h2>
        <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">
              Aucun test effectué. Cliquez sur un bouton pour commencer.
            </p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Informations */}
      <div className="text-sm text-gray-600 bg-green-50 p-4 rounded-lg mt-6">
        <h4 className="font-semibold mb-2">💡 Tests Effectués :</h4>
        <ul className="space-y-1">
          <li>• <strong>Message simple :</strong> Vérifie que les messages normaux fonctionnent</li>
          <li>• <strong>Message avec tool calls :</strong> Teste que les tool calls sont détectés et exécutés</li>
        </ul>
      </div>
    </div>
  );
} 