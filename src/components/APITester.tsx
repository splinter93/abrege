"use client";

import { useState } from 'react';

export default function APITester() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAPI = async (endpoint: string, description: string) => {
    try {
      setIsLoading(true);
      addResult(`🧪 Test: ${description}`);
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ ${description} - Succès (${response.status})`);
        addResult(`📊 Données: ${data.notes?.length || 0} notes trouvées`);
      } else {
        addResult(`❌ ${description} - Erreur ${response.status}: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      addResult(`💥 ${description} - Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addResult('🚀 Démarrage des tests...');
    
    await testAPI('/api/v1/notes/recent', 'Notes récentes (limite par défaut)');
    await testAPI('/api/v1/notes/recent?limit=3', 'Notes récentes (limite 3)');
    await testAPI('/api/v1/notes/recent?username=test', 'Notes récentes (username test)');
    
    addResult('✅ Tous les tests terminés !');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <h3 style={{ 
        fontSize: '16px', 
        margin: '0 0 12px 0',
        fontWeight: '500',
        opacity: 0.9
      }}>
        Test de l'API
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={runAllTests}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            background: 'var(--accent-primary, #2994ff)',
            color: 'white',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            marginRight: '8px'
          }}
        >
          {isLoading ? 'Tests en cours...' : '🧪 Lancer tous les tests'}
        </button>
        
        <button
          onClick={clearResults}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--text-1, #eaeaec)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer'
          }}
        >
          🗑️ Effacer
        </button>
      </div>

      {testResults.length > 0 && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          padding: '12px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.7 }}>
            Résultats des tests:
          </div>
          {testResults.map((result, index) => (
            <div key={index} style={{
              fontSize: '12px',
              marginBottom: '4px',
              fontFamily: 'monospace',
              wordBreak: 'break-word'
            }}>
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 