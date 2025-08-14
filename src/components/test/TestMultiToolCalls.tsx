"use client";

import React, { useState } from 'react';
import { useChatResponse } from '@/hooks/useChatResponse';

const TestMultiToolCalls: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolCallCount, setToolCallCount] = useState(5); // Test avec 5 tool calls par défaut

  const handleComplete = (content: string, reasoning: string) => {
    console.log('✅ Réponse finale reçue:', { content, reasoning });
    setMessages(prev => [...prev, { type: 'final', content, reasoning }]);
  };

  const handleError = (error: string) => {
    console.error('❌ Erreur reçue:', error);
    setMessages(prev => [...prev, { type: 'error', content: error }]);
  };

  const handleToolCalls = (toolCalls: any[], toolName: string) => {
    console.log('🔧 Tool calls détectés:', { toolCalls, toolName });
    console.log('🔍 Détails des tool calls:', toolCalls.map(tc => ({
      id: tc.id,
      name: tc.function?.name,
      arguments: tc.function?.arguments
    })));
    setMessages(prev => [...prev, { type: 'tool_calls', content: toolCalls }]);
  };

  const handleToolResult = (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    console.log('✅ Tool result reçu:', { toolName, success, toolCallId, result });
    setMessages(prev => [...prev, { type: 'tool_result', content: { toolName, success, result } }]);
  };

  const handleToolExecutionComplete = (toolResults: any[]) => {
    console.log('🎯 Exécution des tools terminée:', toolResults);
    console.log('🔍 Détails des résultats:', toolResults.map(tr => ({
      tool_call_id: tr.tool_call_id,
      name: tr.name,
      success: tr.success,
      result: tr.result
    })));
    setMessages(prev => [...prev, { type: 'tools_complete', content: toolResults }]);
  };

  const { sendMessage, isProcessing: hookIsProcessing, reset } = useChatResponse({
    onComplete: handleComplete,
    onError: handleError,
    onToolCalls: handleToolCalls,
    onToolResult: handleToolResult,
    onToolExecutionComplete: handleToolExecutionComplete
  });

  const handleSendMessage = async () => {
    const testMessage = `Test avec ${toolCallCount} tool calls simultanés. Crée ${toolCallCount} notes de test dans différents dossiers.`;
    
    console.log('🚀 Envoi du message de test:', testMessage);
    setMessages(prev => [...prev, { type: 'user', content: testMessage }]);
    
    try {
      console.log('📡 Appel à sendMessage...');
      await sendMessage(testMessage, 'test-session', {}, [], 'test-token');
      console.log('✅ sendMessage terminé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
      setMessages(prev => [...prev, { type: 'error', content: `Erreur: ${error}` }]);
    }
  };

  const handleReset = () => {
    reset();
    setMessages([]);
  };

  const handleToolCallCountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setToolCallCount(parseInt(event.target.value));
  };

  return (
    <div className="test-multi-tool-calls p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Multi Tool Calls</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Configuration</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Nombre de tool calls:
            <select 
              value={toolCallCount} 
              onChange={handleToolCallCountChange}
              className="border rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </label>
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || hookIsProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isProcessing || hookIsProcessing ? '⏳ Traitement...' : '🚀 Tester Multi Tool Calls'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🔄 Reset
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Ce test vérifie la capacité du système à gérer {toolCallCount} tool calls simultanés.
          Les tool calls seront exécutés par batch de 20 maximum.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Messages ({messages.length})</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`p-3 rounded border ${
              msg.type === 'user' ? 'bg-blue-50 border-blue-200' :
              msg.type === 'error' ? 'bg-red-50 border-red-200' :
              msg.type === 'final' ? 'bg-green-50 border-green-200' :
              msg.type === 'tool_calls' ? 'bg-yellow-50 border-yellow-200' :
              msg.type === 'tool_result' ? 'bg-purple-50 border-purple-200' :
              msg.type === 'tools_complete' ? 'bg-emerald-50 border-emerald-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="font-medium text-sm mb-1">
                {msg.type === 'user' && '👤 Utilisateur'}
                {msg.type === 'error' && '❌ Erreur'}
                {msg.type === 'final' && '✅ Réponse Finale'}
                {msg.type === 'tool_calls' && `🔧 Tool Calls (${Array.isArray(msg.content) ? msg.content.length : 0})`}
                {msg.type === 'tool_result' && '⚡ Tool Result'}
                {msg.type === 'tools_complete' && '🎯 Tools Complete'}
              </div>
              <div className="text-sm">
                {msg.type === 'tool_calls' && Array.isArray(msg.content) ? (
                  <div>
                    <p>Tool calls détectés:</p>
                    <ul className="list-disc list-inside ml-2">
                      {msg.content.map((tc: any, i: number) => (
                        <li key={i}>{tc.function?.name || 'unknown'} - {tc.id}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">📊 Informations Système</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>MAX_TOOL_CALLS:</strong> 20 (configuré dans groqGptOss120b.ts)</li>
          <li>• <strong>Exécution par batch:</strong> Si plus de 20 tools, exécution en batch de 20</li>
          <li>• <strong>Anti-boucle:</strong> TTL réduit de 30s à 5s pour plus de flexibilité</li>
          <li>• <strong>Pause entre batch:</strong> 1 seconde entre chaque batch</li>
          <li>• <strong>Gestion des erreurs:</strong> Continue même si certains tools échouent</li>
        </ul>
      </div>
    </div>
  );
};

export default TestMultiToolCalls; 