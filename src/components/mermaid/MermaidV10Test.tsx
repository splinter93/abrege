"use client";
import React, { useEffect, useState } from 'react';

const MermaidV10Test: React.FC = () => {
  const [status, setStatus] = useState<string>('Initialisation...');
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const testMermaidV10 = async () => {
      try {
        setStatus('Import de Mermaid 10.x...');
        
        // Import de Mermaid 10.x
        const mermaid = await import('mermaid');
        setStatus('Mermaid 10.x importé, vérification de l\'API...');
        
        // Vérifier les méthodes disponibles
        const methods = Object.getOwnPropertyNames(mermaid.default || mermaid);
        setStatus(`Méthodes disponibles: ${methods.join(', ')}`);
        
        // Initialisation avec Mermaid 10.x
        const mermaidInstance = mermaid.default || mermaid;
        mermaidInstance.initialize({
          startOnLoad: false,
          theme: 'default'
        });
        setStatus('Mermaid initialisé, test de rendu...');
        
        // Test avec la syntaxe de Mermaid 10.x
        const result = await mermaidInstance.render('v10-test', 'graph TD\nA-->B');
        setStatus('Rendu terminé, vérification...');
        
        if (result && result.svg) {
          setSvg(result.svg);
          setStatus('✅ Succès ! Diagramme rendu avec Mermaid 10.x.');
        } else {
          setStatus('❌ Pas de SVG retourné');
        }
        
      } catch (error) {
        console.error('Erreur Mermaid 10.x:', error);
        setStatus(`❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
      }
    };

    testMermaidV10();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Mermaid 10.x - Version Stable</h1>
      
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
        <h2 className="text-lg font-semibold mb-3">Informations</h2>
        <div className="bg-green-100 p-4 rounded">
          <p className="text-sm">
            <strong>Mermaid 10.x est la version stable recommandée :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>API stable et documentée</li>
            <li>Compatibilité garantie</li>
            <li>Moins de bugs</li>
            <li>Support communautaire étendu</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MermaidV10Test;
