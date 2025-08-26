"use client";

import React, { useState } from 'react';

export default function TestApiMovePage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testV1Move = async () => {
    setLoading(true);
    setResult('Test en cours...');
    
    try {
      // Test simple de l'API V1
      const response = await fetch('/api/v1/note/test/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_classeur_id: 'test-classeur',
          target_folder_id: null
        })
      });
      
      const data = await response.text();
      setResult(`API V1 - Status: ${response.status}\nResponse: ${data}`);
    } catch (error) {
      setResult(`Erreur API V1: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testV2Move = async () => {
    setLoading(true);
    setResult('Test en cours...');
    
    try {
      // Test simple de l'API V2
      const response = await fetch('/api/v2/note/test/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_id: null
        })
      });
      
      const data = await response.text();
      setResult(`API V2 - Status: ${response.status}\nResponse: ${data}`);
    } catch (error) {
      setResult(`Erreur API V2: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>Test des APIs de Déplacement</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testV1Move} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px' }}
        >
          Test API V1 Move
        </button>
        
        <button 
          onClick={testV2Move} 
          disabled={loading}
          style={{ padding: '10px' }}
        >
          Test API V2 Move
        </button>
      </div>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        {result || 'Cliquez sur un bouton pour tester...'}
      </div>
    </div>
  );
} 