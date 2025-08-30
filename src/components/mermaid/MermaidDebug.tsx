"use client";
import React, { useState, useEffect } from 'react';
import { detectMermaidBlocks, validateMermaidSyntax, normalizeMermaidContent } from '@/services/mermaid';

interface DebugInfo {
  originalContent: string;
  normalizedContent: string;
  blocks: any[];
  validation: any;
  timestamp: Date;
}

const MermaidDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [testContent, setTestContent] = useState('');

  const addDebugInfo = (content: string) => {
    const normalized = normalizeMermaidContent(content);
    const blocks = detectMermaidBlocks(content);
    const validation = validateMermaidSyntax(normalized);
    
    setDebugInfo(prev => [{
      originalContent: content,
      normalizedContent: normalized,
      blocks,
      validation,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]); // Garder seulement les 10 derniers
  };

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

  useEffect(() => {
    // Test automatique au chargement
    addDebugInfo(testContent1);
    addDebugInfo(testContent2);
    addDebugInfo(testContent3);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Mermaid</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Tests rapides</h2>
          <div className="space-y-2">
            <button
              onClick={() => addDebugInfo(testContent1)}
              className="w-full p-3 text-left bg-blue-100 hover:bg-blue-200 rounded border"
            >
              Test Flowchart
            </button>
            <button
              onClick={() => addDebugInfo(testContent2)}
              className="w-full p-3 text-left bg-green-100 hover:bg-green-200 rounded border"
            >
              Test Sequence
            </button>
            <button
              onClick={() => addDebugInfo(testContent3)}
              className="w-full p-3 text-left bg-purple-100 hover:bg-purple-200 rounded border"
            >
              Test Class
            </button>
          </div>
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
            onClick={() => addDebugInfo(testContent)}
            className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Tester
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {debugInfo.map((info, index) => (
          <div key={index} className="border rounded p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Test #{debugInfo.length - index}</h3>
              <span className="text-sm text-gray-500">
                {info.timestamp.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Contenu original:</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                  {info.originalContent}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Contenu normalisé:</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                  {info.normalizedContent}
                </pre>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Blocs détectés:</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-24">
                  {JSON.stringify(info.blocks, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Validation:</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-24">
                  {JSON.stringify(info.validation, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="mt-3 p-2 rounded text-sm">
              <span className={`px-2 py-1 rounded ${
                info.validation.isValid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {info.validation.isValid ? '✅ Valide' : '❌ Invalide'}
              </span>
              {info.validation.errors.length > 0 && (
                <span className="ml-2 text-red-600">
                  Erreurs: {info.validation.errors.join(', ')}
                </span>
              )}
              {info.validation.warnings.length > 0 && (
                <span className="ml-2 text-yellow-600">
                  Avertissements: {info.validation.warnings.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MermaidDebug;
