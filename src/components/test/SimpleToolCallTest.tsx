"use client";

import React, { useState } from 'react';

const SimpleToolCallTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testToolCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-123'
        },
        body: JSON.stringify({
          message: 'Crée une note de test',
          context: {
            type: 'chat',
            name: 'test',
            id: 'test-123',
            content: 'test',
            sessionId: 'test-123'
          },
          history: [],
          sessionId: 'test-123'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      
      console.log('✅ Réponse API reçue:', data);
      
      // Vérifier que has_new_tool_calls est false
      if (data.has_new_tool_calls === false) {
        console.log('✅ has_new_tool_calls est false - Pas de boucle infinie');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('❌ Erreur lors du test:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧪 Test Simple Tool Call</h2>
      
      <button 
        onClick={testToolCall}
        disabled={loading}
        style={{ 
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? '⏳ Test en cours...' : '🚀 Tester Tool Call'}
      </button>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>❌ Erreur:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <h3>✅ Réponse reçue</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Succès:</strong> {result.success ? '✅' : '❌'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Contenu:</strong> {result.content || 'Aucun contenu'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Tool calls:</strong> {result.tool_calls?.length || 0}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Tool results:</strong> {result.tool_results?.length || 0}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>has_new_tool_calls:</strong> 
            <span style={{ 
              color: result.has_new_tool_calls ? '#dc3545' : '#28a745',
              fontWeight: 'bold'
            }}>
              {result.has_new_tool_calls ? '❌ true (problématique)' : '✅ false (correct)'}
            </span>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>is_relance:</strong> {result.is_relance ? '✅' : '❌'}
          </div>
          
          <details style={{ marginTop: '15px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              📋 Réponse complète (JSON)
            </summary>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        borderTop: '1px solid #eee', 
        paddingTop: '15px',
        marginTop: '20px'
      }}>
        <strong>🎯 Objectif du test:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Vérifier qu'il n'y a plus d'erreur 500 sur l'UI</li>
          <li>Confirmer que <code>has_new_tool_calls</code> est <code>false</code></li>
          <li>Vérifier que l'utilisateur reçoit un message d'erreur clair</li>
          <li>Éviter les boucles infinies de tool calls</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleToolCallTest; 