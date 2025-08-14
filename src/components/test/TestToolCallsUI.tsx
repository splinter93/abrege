"use client";

import React, { useState } from 'react';
import { useChatResponse } from '@/hooks/useChatResponse';

const TestToolCallsUI: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
    setMessages(prev => [...prev, { type: 'tool_calls', content: toolCalls }]);
  };

  const handleToolResult = (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    console.log('✅ Tool result reçu:', { toolName, success, toolCallId, result });
    setMessages(prev => [...prev, { type: 'tool_result', content: { toolName, success, result } }]);
  };

  const handleToolExecutionComplete = (toolResults: any[]) => {
    console.log('🎯 Exécution des tools terminée:', toolResults);
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
    const testMessage = 'Crée une note de test pour vérifier les tool calls';
    console.log('🚀 Envoi du message:', testMessage);
    
    try {
      // 🎯 IMPORTANT: Utiliser un token de test pour éviter les erreurs d'authentification
      await sendMessage(testMessage, 'test-session-123', undefined, [], 'test-token-123');
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
    }
  };

  const handleReset = () => {
    reset();
    setMessages([]);
  };

  return (
    <div className="test-tool-calls-ui" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Test Tool Calls UI (Version Simplifiée)</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleSendMessage}
          disabled={hookIsProcessing}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: hookIsProcessing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: hookIsProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {hookIsProcessing ? '⏳ Traitement...' : '🚀 Tester Tool Calls'}
        </button>
        
        <button 
          onClick={handleReset}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Reset
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>État du hook:</strong> {hookIsProcessing ? '⏳ Traitement en cours' : '✅ Prêt'}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📋 Messages reçus ({messages.length})</h3>
        {messages.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Aucun message reçu</p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                style={{ 
                  marginBottom: '10px', 
                  padding: '10px', 
                  border: '1px solid #eee',
                  borderRadius: '5px',
                  backgroundColor: msg.type === 'error' ? '#fff5f5' : '#f8f9fa'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {msg.type === 'final' && '✅ Réponse finale'}
                  {msg.type === 'error' && '❌ Erreur'}
                  {msg.type === 'tool_calls' && '🔧 Tool calls détectés'}
                  {msg.type === 'tool_result' && '✅ Tool result'}
                  {msg.type === 'tools_complete' && '🎯 Tools terminés'}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {msg.type === 'tool_calls' && (
                    <pre>{JSON.stringify(msg.content, null, 2)}</pre>
                  )}
                  {msg.type === 'tool_result' && (
                    <div>
                      <strong>Tool:</strong> {msg.content.toolName}<br/>
                      <strong>Succès:</strong> {msg.content.success ? '✅' : '❌'}<br/>
                      <strong>Résultat:</strong> <pre>{JSON.stringify(msg.content.result, null, 2)}</pre>
                    </div>
                  )}
                  {msg.type === 'final' && (
                    <div>
                      <strong>Contenu:</strong> {msg.content}<br/>
                      {msg.reasoning && <><strong>Raisonnement:</strong> {msg.reasoning}</>}
                    </div>
                  )}
                  {msg.type === 'error' && (
                    <div style={{ color: '#dc3545' }}>{msg.content}</div>
                  )}
                  {msg.type === 'tools_complete' && (
                    <pre>{JSON.stringify(msg.content, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <strong>Instructions:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Cliquez sur "Tester Tool Calls" pour envoyer un message qui devrait déclencher des tool calls</li>
          <li>Observez les messages reçus dans la liste ci-dessus</li>
          <li>Vérifiez qu'il n'y a pas d'erreur 500</li>
          <li>Utilisez "Reset" pour nettoyer l'historique</li>
          <li><strong>Note:</strong> Cette version utilise un token de test pour éviter les erreurs d'authentification</li>
        </ul>
      </div>
    </div>
  );
};

export default TestToolCallsUI; 