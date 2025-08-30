"use client";
import React, { useState } from 'react';
import MermaidBlock from './MermaidBlock';

const testDiagrams = [
  {
    name: 'Flowchart Simple',
    content: `graph TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E`
  },
  {
    name: 'Sequence Diagram',
    content: `sequenceDiagram
    participant U as User
    participant S as System
    U->>S: Request
    S->>U: Response`
  },
  {
    name: 'Class Diagram',
    content: `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }`
  },
  {
    name: 'Pie Chart',
    content: `pie title Répartition des technologies
    "React" : 40
    "TypeScript" : 30
    "CSS" : 20
    "Autres" : 10`
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
    Déploiement         :         depl1, 2024-01-21, 2024-01-25`
  }
];

const MermaidAdvancedTest: React.FC = () => {
  const [selectedDiagram, setSelectedDiagram] = useState(0);
  const [customContent, setCustomContent] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Avancé Mermaid - MermaidBlock</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Diagrammes de test</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {testDiagrams.map((diagram, index) => (
            <button
              key={index}
              onClick={() => setSelectedDiagram(index)}
              className={`px-3 py-2 rounded text-sm ${
                selectedDiagram === index 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {diagram.name}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`px-3 py-2 rounded text-sm ${
              showCustom 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showCustom ? 'Masquer' : 'Personnalisé'}
          </button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h3 className="font-medium mb-2">Contenu Mermaid :</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
            {testDiagrams[selectedDiagram].content}
          </pre>
        </div>
        
        <MermaidBlock
          content={testDiagrams[selectedDiagram].content}
          variant="editor"
          className="border rounded p-4"
          renderOptions={{
            timeout: 15000,
            retryCount: 2,
            showActions: true
          }}
        />
      </div>
      
      {showCustom && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Test personnalisé</h2>
          <textarea
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder="Entrez votre code Mermaid ici..."
            className="w-full h-32 p-3 border rounded font-mono text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setCustomContent('')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Effacer
            </button>
            <button
              onClick={() => setCustomContent(`graph TD
    A[Test] --> B[Personnalisé]
    B --> C[Succès]`)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Exemple
            </button>
          </div>
          
          {customContent.trim() && (
            <div className="mt-4">
              <MermaidBlock
                content={customContent}
                variant="editor"
                className="border rounded p-4"
                renderOptions={{
                  timeout: 15000,
                  retryCount: 2,
                  showActions: true
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Instructions de test</h2>
        <div className="bg-blue-100 p-4 rounded">
          <p className="text-sm">
            <strong>Ce composant teste :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>Le composant MermaidBlock simplifié</li>
            <li>Différents types de diagrammes Mermaid</li>
            <li>La gestion des erreurs et du chargement</li>
            <li>Les options de rendu personnalisées</li>
            <li>Le test avec du contenu personnalisé</li>
          </ul>
          <p className="text-sm mt-2">
            <strong>Vérifiez que :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>Les diagrammes se rendent correctement</li>
            <li>Les erreurs sont affichées proprement</li>
            <li>Le bouton de copie fonctionne</li>
            <li>Les timeouts et retries fonctionnent</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MermaidAdvancedTest;
