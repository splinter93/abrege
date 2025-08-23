/**
 * 🧪 Composant de Test pour la Gestion d'Erreur du Chat
 * 
 * Teste que les erreurs sont correctement gérées par le hook useChatResponse
 */

"use client";

import { useState } from 'react';
import { useChatResponse } from '@/hooks/useChatResponse';

export default function TestChatErrorHandling() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const { sendMessage, isProcessing } = useChatResponse({
    onComplete: (content, reasoning) => {
      addLog(`✅ Réponse reçue: ${content.length} caractères`);
      if (reasoning) {
        addLog(`🧠 Raisonnement: ${reasoning.length} caractères`);
      }
    },
    onError: (error) => {
      addLog(`❌ Erreur: ${error}`);
    },
    onToolCalls: (toolCalls, toolName) => {
      addLog(`🔧 Tool calls détectés: ${toolCalls.length} tools (${toolName})`);
    },
    onToolResult: (toolName, result, success, toolCallId) => {
      addLog(`${success ? '✅' : '❌'} Tool ${toolName} ${success ? 'réussi' : 'échoué'}`);
    }
  });

  const testValidMessage = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test message valide...');
      
      await sendMessage(
        'Bonjour, comment allez-vous ?',
        'test-session-123',
        { sessionId: 'test-session-123' },
        [],
        'test-token'
      );
      
      addLog('✅ Message valide envoyé avec succès');
    } catch (error) {
      addLog(`❌ Erreur lors de l\'envoi du message valide: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testInvalidMessage = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test message invalide (sans sessionId)...');
      
      await sendMessage(
        'Test message invalide',
        '',
        {},
        []
      );
      
      addLog('✅ Message invalide géré correctement');
    } catch (error) {
      addLog(`❌ Erreur lors de l\'envoi du message invalide: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkError = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test erreur réseau (URL invalide)...');
      
      // Simuler une erreur réseau en modifiant temporairement l'URL
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('Erreur réseau simulée');
      };
      
      await sendMessage(
        'Test erreur réseau',
        'test-session-123',
        { sessionId: 'test-session-123' },
        []
      );
      
      // Restaurer fetch
      global.fetch = originalFetch;
      
      addLog('✅ Erreur réseau gérée correctement');
    } catch (error) {
      addLog(`❌ Erreur lors du test d'erreur réseau: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testServerError = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test erreur serveur (500)...');
      
      // Simuler une erreur serveur
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(JSON.stringify({
          success: false,
          error: 'Erreur interne du serveur',
          details: 'Test d\'erreur simulée'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      };
      
      await sendMessage(
        'Test erreur serveur',
        'test-session-123',
        { sessionId: 'test-session-123' },
        []
      );
      
      // Restaurer fetch
      global.fetch = originalFetch;
      
      addLog('✅ Erreur serveur gérée correctement');
    } catch (error) {
      addLog(`❌ Erreur lors du test d'erreur serveur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testInvalidResponse = async () => {
    setIsLoading(true);
    try {
      addLog('🧪 Test réponse invalide du serveur...');
      
      // Simuler une réponse invalide
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(JSON.stringify({
          // Pas de champ success
          content: 'Contenu invalide'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
      
      await sendMessage(
        'Test réponse invalide',
        'test-session-123',
        { sessionId: 'test-session-123' },
        []
      );
      
      // Restaurer fetch
      global.fetch = originalFetch;
      
      addLog('✅ Réponse invalide gérée correctement');
    } catch (error) {
      addLog(`❌ Erreur lors du test de réponse invalide: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Gestion d'Erreur du Chat</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">📋 Description</h2>
        <p className="text-gray-600">
          Ce composant teste que le hook useChatResponse gère correctement tous les types d'erreurs :
          erreurs réseau, erreurs serveur, réponses invalides, etc.
        </p>
      </div>

      {/* Boutons de Test */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testValidMessage}
          disabled={isLoading || isProcessing}
          className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '✅'} Message Valide
        </button>
        
        <button
          onClick={testInvalidMessage}
          disabled={isLoading || isProcessing}
          className="p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '⚠️'} Message Invalide
        </button>
        
        <button
          onClick={testNetworkError}
          disabled={isLoading || isProcessing}
          className="p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '🌐'} Erreur Réseau
        </button>
        
        <button
          onClick={testServerError}
          disabled={isLoading || isProcessing}
          className="p-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '🖥️'} Erreur Serveur
        </button>
        
        <button
          onClick={testInvalidResponse}
          disabled={isLoading || isProcessing}
          className="p-3 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading || isProcessing ? '⏳' : '📡'} Réponse Invalide
        </button>
        
        <button
          onClick={clearLogs}
          className="p-3 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          🗑️ Effacer les Logs
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

      {/* Logs */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">📝 Logs de Test</h2>
        <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">
              Aucun test effectué. Cliquez sur un bouton pour commencer.
            </p>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Informations */}
      <div className="text-sm text-gray-600 bg-green-50 p-4 rounded-lg mt-6">
        <h4 className="font-semibold mb-2">💡 Types d'Erreurs Testés :</h4>
        <ul className="space-y-1">
          <li>• <strong>Message valide :</strong> Vérifie que les messages normaux fonctionnent</li>
          <li>• <strong>Message invalide :</strong> Teste la validation des paramètres</li>
          <li>• <strong>Erreur réseau :</strong> Simule une défaillance de connexion</li>
          <li>• <strong>Erreur serveur :</strong> Teste la gestion des erreurs 500</li>
          <li>• <strong>Réponse invalide :</strong> Vérifie la validation des réponses</li>
        </ul>
      </div>
    </div>
  );
} 