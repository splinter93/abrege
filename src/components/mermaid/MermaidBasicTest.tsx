"use client";
import React, { useEffect, useState } from 'react';

const MermaidBasicTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Initialisation...');
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const testBasicMermaid = async () => {
      try {
        setStatus('Import de Mermaid...');
        
        // Test très basique avec Mermaid 11.x
        const mermaid = await import('mermaid');
        setStatus('Mermaid importé, initialisation...');
        
        // Initialisation minimale
        mermaid.default.initialize({
          startOnLoad: false
        });
        setStatus('Mermaid initialisé, test de rendu...');
        
        // Test avec un diagramme très simple
        const result = await mermaid.default.render('basic-test', 'graph TD\nA-->B');
        setStatus('Rendu terminé, vérification...');
        
        if (result && result.svg) {
          setSvg(result.svg);
          setStatus('✅ Succès ! Diagramme rendu.');
        } else {
          setStatus('❌ Pas de SVG retourné');
        }
        
      } catch (error) {
        console.error('Erreur Mermaid:', error);
        setStatus(`❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
      }
    };

    testBasicMermaid();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Mermaid 11.x - Version Basique</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Statut</h2>
        <div className="p-4 bg-gray-100 rounded">
          <p className="font-mono">{status}</p>
        </div>
      </div>

      {svg && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Résultat</h2>
          <div 
            className="border rounded p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Code testé</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm">
{`graph TD
A-->B`}
        </pre>
      </div>
    </div>
  );
};

export default MermaidBasicTest;
