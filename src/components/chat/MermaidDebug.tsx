'use client';
import React, { useState } from 'react';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';

const MermaidDebug: React.FC = () => {
  const [testContent, setTestContent] = useState(`Voici un diagramme :

\`\`\`mermaid
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\`

Et du texte après.`);

  const [blocks, setBlocks] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>({});

  const testDetection = () => {
    console.log('=== TEST DÉTECTION MERMAID ===');
    console.log('Contenu de test:', testContent);
    
    const detectedBlocks = detectMermaidBlocks(testContent);
    console.log('Blocs détectés:', detectedBlocks);
    
    setBlocks(detectedBlocks);
    
    // Debug détaillé
    const debug = {
      contentLength: testContent.length,
      hasMermaid: testContent.includes('```mermaid'),
      blocksCount: detectedBlocks.length,
      mermaidBlocks: detectedBlocks.filter(b => b.type === 'mermaid'),
      textBlocks: detectedBlocks.filter(b => b.type === 'text'),
      regexTest: /```mermaid(?::\w+)?\s*\n([\s\S]*?)(?:```|$)/g.test(testContent)
    };
    
    console.log('Debug info:', debug);
    setDebugInfo(debug);
  };

  const testRegex = () => {
    console.log('=== TEST REGEX ===');
    const mermaidRegex = /```mermaid(?::\w+)?\s*\n([\s\S]*?)(?:```|$)/g;
    let match;
    let matches = [];
    
    while ((match = mermaidRegex.exec(testContent)) !== null) {
      matches.push({
        fullMatch: match[0],
        content: match[1],
        index: match.index
      });
    }
    
    console.log('Matches regex:', matches);
    return matches;
  };

  return (
    <div className="mermaid-debug" style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Debug Détection Mermaid</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Contenu de test :</h3>
        <textarea
          value={testContent}
          onChange={(e) => setTestContent(e.target.value)}
          style={{ width: '100%', height: '200px', fontFamily: 'monospace' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={testDetection} style={{ marginRight: '10px' }}>
          🧪 Tester la détection
        </button>
        <button onClick={testRegex}>
          🔍 Tester la regex
        </button>
      </div>

      {debugInfo && Object.keys(debugInfo).length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
          <h3>📊 Informations de debug :</h3>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {blocks.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📦 Blocs détectés ({blocks.length}) :</h3>
          {blocks.map((block, index) => (
            <div key={index} style={{ 
              marginBottom: '15px', 
              padding: '15px', 
              backgroundColor: block.type === 'mermaid' ? '#e8f5e8' : '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}>
              <h4>Bloc {index + 1} - Type: {block.type}</h4>
              <p><strong>Start:</strong> {block.startIndex}, <strong>End:</strong> {block.endIndex}</p>
              <p><strong>Contenu:</strong></p>
              <pre style={{ 
                backgroundColor: 'white', 
                padding: '10px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {block.content}
              </pre>
              
              {block.type === 'mermaid' && (
                <div>
                  <p><strong>Contenu nettoyé:</strong></p>
                  <pre style={{ 
                    backgroundColor: '#f8f8f8', 
                    padding: '10px', 
                    borderRadius: '4px' 
                  }}>
                    {cleanMermaidContent(block.content)}
                  </pre>
                  
                  <p><strong>Validation:</strong></p>
                  <pre style={{ 
                    backgroundColor: '#f8f8f8', 
                    padding: '10px', 
                    borderRadius: '4px' 
                  }}>
                    {JSON.stringify(validateMermaidSyntax(cleanMermaidContent(block.content)), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>💡 Instructions de test :</h3>
        <ol>
          <li>Modifiez le contenu de test ci-dessus</li>
          <li>Cliquez sur "Tester la détection"</li>
          <li>Vérifiez la console du navigateur pour plus de détails</li>
          <li>Vérifiez que les blocs Mermaid sont bien détectés</li>
        </ol>
      </div>
    </div>
  );
};

export default MermaidDebug;
