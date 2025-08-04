'use client';

import React, { useState } from 'react';
import { useOptimizedStreaming } from '@/hooks/useOptimizedStreaming';

const TestStreamingPage: React.FC = () => {
  const [content, setContent] = useState('');
  const [stats, setStats] = useState({ tokens: 0, updates: 0, pending: 0 });

  const { addToken, flushTokens, isProcessing, pendingCount } = useOptimizedStreaming({
    onUpdate: (newContent: string) => {
      setContent(newContent);
      setStats(prev => ({ ...prev, updates: prev.updates + 1 }));
    },
    batchSize: 2,
    throttleMs: 8
  });

  const simulateStreaming = () => {
    const text = "Voici un exemple de texte qui sera streamé caractère par caractère pour tester la fluidité du rendu. Ce texte contient plusieurs phrases pour simuler un vrai message de l'assistant.";
    let index = 0;
    
    const stream = () => {
      if (index < text.length) {
        addToken(text[index]);
        setStats(prev => ({ ...prev, tokens: prev.tokens + 1 }));
        index++;
        setTimeout(stream, 50); // 50ms entre chaque caractère
      } else {
        flushTokens();
      }
    };
    
    stream();
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <h1>Test Streaming Optimisé</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={simulateStreaming}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Simuler le Streaming
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Statistiques</h3>
        <p>Tokens reçus: {stats.tokens}</p>
        <p>Mises à jour: {stats.updates}</p>
        <p>En attente: {pendingCount}</p>
        <p>En traitement: {isProcessing ? 'Oui' : 'Non'}</p>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '1rem', 
        borderRadius: '8px',
        minHeight: '200px',
        whiteSpace: 'pre-wrap'
      }}>
        <h3>Contenu Streamé:</h3>
        {content || 'Aucun contenu...'}
      </div>
    </div>
  );
};

export default TestStreamingPage; 