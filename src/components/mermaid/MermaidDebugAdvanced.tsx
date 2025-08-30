"use client";
import React, { useState, useEffect } from 'react';
import { useMermaidRenderer } from '@/services/mermaid';

interface DebugRenderInfo {
  content: string;
  result: any;
  error: any;
  timestamp: Date;
  duration: number;
}

const MermaidDebugAdvanced: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugRenderInfo[]>([]);
  const [testContent, setTestContent] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const { render, cancelRender } = useMermaidRenderer();

  const testContent1 = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;

  const testContent2 = `sequenceDiagram
    participant U as User
    participant S as System
    U->>S: Request
    S->>U: Response`;

  const testContent3 = `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }`;

  const testRender = async (content: string) => {
    if (!content.trim()) return;
    
    setIsRendering(true);
    const startTime = Date.now();
    
    try {
      console.log('🔍 Début du test de rendu:', content);
      
      const result = await render(content, {
        timeout: 15000,
        retryCount: 1,
        onProgress: (status) => {
          console.log('📊 Progression:', status);
        }
      });
      
      const duration = Date.now() - startTime;
      
      console.log('✅ Résultat du rendu:', result);
      
      setDebugInfo(prev => [{
        content,
        result,
        error: null,
        timestamp: new Date(),
        duration
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Erreur de rendu:', error);
      
      setDebugInfo(prev => [{
        content,
        result: null,
        error,
        timestamp: new Date(),
        duration
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    // Test automatique au chargement
    testRender(testContent1);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Avancé Mermaid</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Tests rapides</h2>
          <div className="space-y-2">
            <button
              onClick={() => testRender(testContent1)}
              disabled={isRendering}
              className="w-full p-3 text-left bg-blue-100 hover:bg-blue-200 rounded border disabled:opacity-50"
            >
              Test Flowchart
            </button>
            <button
              onClick={() => testRender(testContent2)}
              disabled={isRendering}
              className="w-full p-3 text-left bg-green-100 hover:bg-green-200 rounded border disabled:opacity-50"
            >
              Test Sequence
            </button>
            <button
              onClick={() => testRender(testContent3)}
              disabled={isRendering}
              className="w-full p-3 text-left bg-purple-100 hover:bg-purple-200 rounded border disabled:opacity-50"
            >
              Test Class
            </button>
          </div>
          
          {isRendering && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
              🔄 Rendu en cours...
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-3">Test personnalisé</h2>
          <textarea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            placeholder="Entrez votre code Mermaid ici..."
            className="w-full h-32 p-3 border rounded font-mono text-sm"
          />
          <button
            onClick={() => testRender(testContent)}
            disabled={isRendering || !testContent.trim()}
            className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Tester le rendu
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Historique des tests</h2>
        
        {debugInfo.map((info, index) => (
          <div key={index} className="border rounded p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Test #{debugInfo.length - index}</h3>
              <div className="text-sm text-gray-500">
                <span>{info.timestamp.toLocaleTimeString()}</span>
                <span className="ml-2">({info.duration}ms)</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Contenu Mermaid:</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                  {info.content}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">
                  {info.error ? '❌ Erreur:' : '✅ Résultat:'}
                </h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                  {info.error 
                    ? JSON.stringify(info.error, null, 2)
                    : JSON.stringify(info.result, null, 2)
                  }
                </pre>
              </div>
            </div>
            
            <div className="mt-3 p-2 rounded text-sm">
              {info.error ? (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                  ❌ Échec du rendu
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                  ✅ Rendu réussi
                </span>
              )}
              
              {info.result && (
                <div className="mt-2 text-xs text-gray-600">
                  <div>Type: {info.result.diagramType}</div>
                  <div>ID: {info.result.id}</div>
                  <div>Succès: {info.result.success ? 'Oui' : 'Non'}</div>
                  {info.result.svg && (
                    <div>SVG: {info.result.svg.length} caractères</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MermaidDebugAdvanced;
