'use client';
import React, { useState, useEffect } from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import TableRenderingDebug from './TableRenderingDebug';

const TableRenderingTest: React.FC = () => {
  const [testCases] = useState([
    {
      name: 'Tableau complet normal',
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  | Donnée 3  |
| Donnée 4  | Donnée 5  | Donnée 6  |`
    },
    {
      name: 'Tableau partiel (ligne incomplète)',
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  | Donnée 3  |
| Donnée 4  | Donnée 5  |`
    },
    {
      name: 'Tableau partiel (pas de séparateur)',
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
| Donnée 1  | Donnée 2  | Donnée 3  |`
    },
    {
      name: 'Tableau partiel (ligne vide)',
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  | Donnée 3  |

Texte après le tableau`
    },
    {
      name: 'Tableau cassé (colonnes manquantes)',
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  |
| Donnée 4  | Donnée 5  | Donnée 6  |`
    }
  ]);

  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const simulateStreaming = (content: string) => {
    setIsStreaming(true);
    setStreamingContent('');
    
    const words = content.split(' ');
    let currentIndex = 0;
    
    const streamInterval = setInterval(() => {
      if (currentIndex < words.length) {
        setStreamingContent(prev => prev + words[currentIndex] + ' ');
        currentIndex++;
      } else {
        setIsStreaming(false);
        clearInterval(streamInterval);
      }
    }, 50); // Simuler 800 tokens/sec
  };

  const runTest = (index: number) => {
    setCurrentTestIndex(index);
    const testCase = testCases[index];
    simulateStreaming(testCase.content);
  };

  return (
    <div className="table-rendering-test" style={{ 
      padding: '20px', 
      background: '#0f1115', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>🧪 Test Rendu Tableaux</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Scénarios de Test</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {testCases.map((testCase, index) => (
            <button
              key={index}
              onClick={() => runTest(index)}
              style={{
                padding: '8px 16px',
                background: currentTestIndex === index ? '#007acc' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {testCase.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Contenu Original</h3>
        <pre style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          color: '#fff',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {testCases[currentTestIndex]?.content}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>
          Contenu en Streaming {isStreaming && '🔄'}
        </h3>
        <pre style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          color: '#90EE90',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '200px',
          border: isStreaming ? '2px solid #007acc' : '1px solid #333'
        }}>
          {streamingContent || 'Cliquez sur un test pour commencer...'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Debug Tableaux</h3>
        <TableRenderingDebug 
          content={streamingContent} 
          isStreaming={isStreaming} 
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Rendu Final</h3>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #333'
        }}>
          <EnhancedMarkdownMessage content={streamingContent} />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Statistiques</h3>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          color: '#ccc',
          fontSize: '14px'
        }}>
          <div><strong>Longueur du contenu:</strong> {streamingContent.length} caractères</div>
          <div><strong>Nombre de lignes:</strong> {streamingContent.split('\n').length}</div>
          <div><strong>Nombre de pipes (|):</strong> {(streamingContent.match(/\|/g) || []).length}</div>
          <div><strong>Statut:</strong> {isStreaming ? '🔄 Streaming en cours' : '✅ Terminé'}</div>
        </div>
      </div>
    </div>
  );
};

export default TableRenderingTest; 