'use client';
import React, { useState } from 'react';
import MermaidRenderer from './MermaidRenderer';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';

/**
 * Composant de test pour diagnostiquer les erreurs Mermaid
 */
const MermaidTestDemo: React.FC = () => {
  const [customMermaid, setCustomMermaid] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // Exemples de test avec différents types de diagrammes
  const testExamples = [
    {
      name: 'Flowchart Simple',
      content: `flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E`,
      type: 'flowchart'
    },
    {
      name: 'Sequence Diagram',
      content: `sequenceDiagram
    participant U as Utilisateur
    participant S as Système
    participant A as API
    
    U->>S: Demande de données
    S->>A: Requête API
    A-->>S: Réponse
    S-->>U: Affichage des données`,
      type: 'sequence'
    },
    {
      name: 'Class Diagram',
      content: `classDiagram
    class ChatComponent {
        +messages: Message[]
        +loading: boolean
        +sendMessage()
        +clearMessages()
    }
    
    class Message {
        +id: string
        +role: 'user' | 'assistant'
        +content: string
        +timestamp: Date
    }
    
    ChatComponent --> Message`,
      type: 'class'
    },
    {
      name: 'Pie Chart',
      content: `pie title Répartition des technologies
    "React" : 40
    "TypeScript" : 30
    "CSS" : 20
    "Autres" : 10`,
      type: 'pie'
    },
    {
      name: 'Gantt Chart',
      content: `gantt
    title Planning du projet
    dateFormat  YYYY-MM-DD
    section Phase 1
    Design UI           :done,    des1, 2024-01-01, 2024-01-07
    Implémentation      :active,  impl1, 2024-01-08, 2024-01-15
    section Phase 2
    Tests               :         test1, 2024-01-16, 2024-01-20
    Déploiement         :         depl1, 2024-01-21, 2024-01-25`,
      type: 'gantt'
    }
  ];

  // Test de détection des blocs
  const testBlockDetection = (content: string) => {
    const blocks = detectMermaidBlocks(content);
    return blocks.map(block => ({
      type: block.type,
      content: block.type === 'mermaid' ? cleanMermaidContent(block.content) : block.content,
      validation: block.type === 'mermaid' ? validateMermaidSyntax(cleanMermaidContent(block.content)) : null
    }));
  };

  return (
    <div className="mermaid-test-demo">
      <div className="demo-header">
        <h1>🧪 Test et Diagnostic Mermaid</h1>
        <p>Vérification du rendu des diagrammes Mermaid et diagnostic des erreurs</p>
        
        <div className="demo-controls">
          <label className="demo-control">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
            Afficher le debug
          </label>
        </div>
      </div>

      <div className="demo-content">
        {/* Test des exemples prédéfinis */}
        <div className="test-section">
          <h2>📊 Tests des Exemples Prédéfinis</h2>
          <div className="examples-grid">
            {testExamples.map((example, index) => (
              <div key={index} className="example-card">
                <h3>{example.name}</h3>
                
                {showDebug && (
                  <div className="debug-info">
                    <h4>Debug Info:</h4>
                    <pre>{JSON.stringify(testBlockDetection(example.content), null, 2)}</pre>
                  </div>
                )}
                
                <div className="mermaid-test">
                  <MermaidRenderer 
                    chart={example.content}
                    className="mermaid-test-renderer"
                  />
                </div>
                
                <details className="source-code">
                  <summary>Code source</summary>
                  <pre>{example.content}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>

        {/* Test personnalisé */}
        <div className="test-section">
          <h2>✏️ Test Personnalisé</h2>
          <div className="custom-test">
            <textarea
              value={customMermaid}
              onChange={(e) => setCustomMermaid(e.target.value)}
              placeholder="Entrez votre code Mermaid ici..."
              rows={8}
              className="mermaid-input"
            />
            
            {customMermaid && (
              <div className="custom-render">
                <h4>Rendu :</h4>
                <MermaidRenderer 
                  chart={customMermaid}
                  className="mermaid-custom-renderer"
                />
                
                {showDebug && (
                  <div className="debug-info">
                    <h4>Debug Info:</h4>
                    <pre>{JSON.stringify(testBlockDetection(customMermaid), null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Informations de diagnostic */}
        <div className="test-section">
          <h2>🔍 Informations de Diagnostic</h2>
          <div className="diagnostic-info">
            <div className="info-item">
              <h4>Version Mermaid</h4>
              <p>v11.9.0 (selon package.json)</p>
            </div>
            
            <div className="info-item">
              <h4>Types Supportés</h4>
              <ul>
                <li>flowchart</li>
                <li>sequenceDiagram</li>
                <li>classDiagram</li>
                <li>pie</li>
                <li>gantt</li>
                <li>gitGraph</li>
                <li>journey</li>
                <li>er</li>
              </ul>
            </div>
            
            <div className="info-item">
              <h4>Configuration</h4>
              <pre>{JSON.stringify({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose',
                fontFamily: 'inherit',
                fontSize: 14
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mermaid-test-demo {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: #0f0f23;
          min-height: 100vh;
          color: #e5e7eb;
        }
        
        .demo-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .demo-header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #ffffff;
        }
        
        .demo-header p {
          margin: 0 0 20px 0;
          opacity: 0.8;
          font-size: 16px;
        }
        
        .demo-controls {
          display: flex;
          justify-content: center;
          gap: 20px;
        }
        
        .demo-control {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        
        .demo-control:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .demo-control input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #667eea;
        }
        
        .demo-content {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        
        .test-section {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .test-section h2 {
          margin: 0 0 20px 0;
          color: #ffffff;
          font-size: 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 10px;
        }
        
        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        
        .example-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .example-card h3 {
          margin: 0 0 15px 0;
          color: #ffffff;
          font-size: 18px;
        }
        
        .mermaid-test {
          margin: 15px 0;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .debug-info {
          margin: 15px 0;
          padding: 15px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .debug-info h4 {
          margin: 0 0 10px 0;
          color: #ffffff;
          font-size: 14px;
        }
        
        .debug-info pre {
          font-size: 11px;
          line-height: 1.3;
          overflow-x: auto;
          margin: 0;
        }
        
        .source-code {
          margin-top: 15px;
        }
        
        .source-code summary {
          cursor: pointer;
          color: #667eea;
          font-size: 14px;
          margin-bottom: 10px;
        }
        
        .source-code pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.3;
          overflow-x: auto;
          margin: 0;
        }
        
        .custom-test {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .mermaid-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 15px;
          color: #e5e7eb;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 13px;
          line-height: 1.4;
          resize: vertical;
        }
        
        .mermaid-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        
        .custom-render {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .custom-render h4 {
          margin: 0 0 15px 0;
          color: #ffffff;
          font-size: 16px;
        }
        
        .diagnostic-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .info-item {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .info-item h4 {
          margin: 0 0 15px 0;
          color: #ffffff;
          font-size: 16px;
        }
        
        .info-item ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .info-item li {
          margin: 5px 0;
        }
        
        .info-item pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.3;
          overflow-x: auto;
          margin: 0;
        }
        
        @media (max-width: 768px) {
          .mermaid-test-demo {
            padding: 15px;
          }
          
          .demo-header {
            padding: 20px;
          }
          
          .demo-header h1 {
            font-size: 24px;
          }
          
          .test-section {
            padding: 20px;
          }
          
          .examples-grid {
            grid-template-columns: 1fr;
          }
          
          .diagnostic-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MermaidTestDemo; 