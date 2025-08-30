"use client";
import React, { useEffect, useState } from 'react';

const MermaidTest: React.FC = () => {
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const testMermaid = async () => {
      try {
        addLog('🔍 Début du test Mermaid...');
        
        // Test 1: Vérifier si Mermaid peut être importé
        addLog('Test 1: Import de Mermaid...');
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        addLog('✅ Mermaid importé avec succès');
        setMermaidLoaded(true);

        // Test 2: Vérifier la version
        addLog(`Test 2: Version de Mermaid: ${mermaid.version}`);

        // Test 3: Initialiser Mermaid
        addLog('Test 3: Initialisation de Mermaid...');
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict'
        });
        addLog('✅ Mermaid initialisé');

        // Test 4: Rendre un diagramme simple
        addLog('Test 4: Rendu d\'un diagramme simple...');
        const testContent = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;

        addLog(`Contenu à rendre: ${testContent}`);
        
        const result = await mermaid.render('test-diagram', testContent);
        addLog('✅ Diagramme rendu, vérification du résultat...');
        
        if (result && result.svg) {
          addLog(`SVG reçu, longueur: ${result.svg.length}`);
          if (result.svg.includes('<svg')) {
            addLog('✅ SVG valide détecté');
            setTestResult(result.svg);
          } else {
            throw new Error('SVG invalide - pas de balise <svg>');
          }
        } else {
          throw new Error('Pas de SVG retourné');
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        addLog(`❌ Erreur: ${errorMessage}`);
        setError(errorMessage);
        console.error('❌ Erreur lors du test Mermaid:', err);
      }
    };

    testMermaid();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Mermaid - Diagnostic Complet</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Statut</h2>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span>Mermaid chargé:</span>
            <span className={mermaidLoaded ? 'text-green-600' : 'text-red-600'}>
              {mermaidLoaded ? '✅ Oui' : '❌ Non'}
            </span>
          </div>
          {error && (
            <div className="text-red-600">
              <strong>Erreur:</strong> {error}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Logs de debug</h2>
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>

      {testResult && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Diagramme de test</h2>
          <div 
            className="border rounded p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: testResult }}
          />
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Code source du test</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Instructions de debug</h2>
        <div className="bg-blue-100 p-4 rounded">
          <p className="text-sm">
            <strong>Ce composant teste :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>L'import dynamique de Mermaid</li>
            <li>L'initialisation de la configuration</li>
            <li>Le rendu d'un diagramme simple</li>
            <li>La validation du SVG retourné</li>
            <li>Les logs détaillés de chaque étape</li>
          </ul>
          <p className="text-sm mt-2">
            <strong>Vérifiez la console du navigateur ET les logs ci-dessus pour identifier le problème exact.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MermaidTest;
