"use client";
import React, { useEffect, useState } from 'react';

const MermaidOfficialTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Initialisation...');
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const testOfficialMermaid = async () => {
      try {
        setStatus('Import de Mermaid...');
        
        // Import selon la documentation officielle
        const mermaid = await import('mermaid');
        setStatus('Mermaid importé, vérification de l\'export...');
        
        // Vérifier l'export par défaut
        console.log('Export par défaut:', mermaid.default);
        console.log('Export complet:', mermaid);
        
        const mermaidInstance = mermaid.default || mermaid;
        setStatus('Instance Mermaid obtenue, initialisation...');
        
        // Initialisation selon la doc officielle
        mermaidInstance.initialize({
          startOnLoad: false,
          theme: 'default'
        });
        setStatus('Mermaid initialisé, test de rendu...');
        
        // Test avec la syntaxe officielle
        const result = await mermaidInstance.render('official-test', 'graph TD\nA-->B');
        setStatus('Rendu terminé, vérification...');
        
        console.log('Résultat du rendu:', result);
        
        if (result && result.svg) {
          setSvg(result.svg);
          setStatus('✅ Succès ! Diagramme rendu selon la doc officielle.');
        } else {
          setStatus(`❌ Pas de SVG retourné. Résultat: ${JSON.stringify(result)}`);
        }
        
      } catch (error) {
        console.error('Erreur Mermaid officielle:', error);
        setStatus(`❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
      }
    };

    testOfficialMermaid();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Mermaid - Documentation Officielle</h1>
      
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

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Debug</h2>
        <div className="bg-blue-100 p-4 rounded">
          <p className="text-sm">
            <strong>Ce test utilise :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>L'import officiel de Mermaid</li>
            <li>La vérification de l'export par défaut</li>
            <li>L'initialisation selon la documentation</li>
            <li>Les logs de console pour debug</li>
          </ul>
          <p className="text-sm mt-2">
            <strong>Vérifiez la console du navigateur pour voir les exports et résultats.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MermaidOfficialTest;
