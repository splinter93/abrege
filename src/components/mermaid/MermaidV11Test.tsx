"use client";
import React, { useEffect, useState } from 'react';

const MermaidV11Test: React.FC = () => {
  const [status, setStatus] = useState<string>('Initialisation...');
  const [svg, setSvg] = useState<string>('');
  const [mermaidInstance, setMermaidInstance] = useState<any>(null);

  useEffect(() => {
    const testMermaidV11 = async () => {
      try {
        setStatus('Import de Mermaid 11.x...');
        
        // Import de Mermaid 11.x
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        setMermaidInstance(mermaid);
        setStatus('Mermaid 11.x importé, vérification de l\'API...');
        
        // Vérifier les méthodes disponibles
        const methods = Object.getOwnPropertyNames(mermaid);
        setStatus(`Méthodes disponibles: ${methods.join(', ')}`);
        
        // Initialisation avec Mermaid 11.x
        if (typeof mermaid.initialize === 'function') {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default'
          });
          setStatus('Mermaid initialisé, test de rendu...');
          
          // Test avec la nouvelle API de Mermaid 11.x
          if (typeof mermaid.render === 'function') {
            const result = await mermaid.render('v11-test', 'graph TD\nA-->B');
            setStatus('Rendu terminé, vérification...');
            
            if (result && result.svg) {
              setSvg(result.svg);
              setStatus('✅ Succès ! Diagramme rendu avec Mermaid 11.x.');
            } else {
              setStatus('❌ Pas de SVG retourné');
            }
          } else {
            setStatus('❌ Méthode render non disponible');
          }
        } else {
          setStatus('❌ Méthode initialize non disponible');
        }
        
      } catch (error) {
        console.error('Erreur Mermaid 11.x:', error);
        setStatus(`❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
      }
    };

    testMermaidV11();
  }, []);

  const testCustomDiagram = async () => {
    if (!mermaidInstance) return;
    
    try {
      setStatus('Test avec diagramme personnalisé...');
      const result = await mermaidInstance.render('custom-test', 'graph TD\nA[Start]-->B{Test}-->C[End]');
      
      if (result && result.svg) {
        setSvg(result.svg);
        setStatus('✅ Diagramme personnalisé rendu !');
      }
    } catch (error) {
      setStatus(`❌ Erreur diagramme personnalisé: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Mermaid 11.x - API Complète</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Statut</h2>
        <div className="p-4 bg-gray-100 rounded">
          <p className="font-mono">{status}</p>
        </div>
      </div>

      {mermaidInstance && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <button
            onClick={testCustomDiagram}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tester diagramme personnalisé
          </button>
        </div>
      )}

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
        <h2 className="text-lg font-semibold mb-3">Informations de debug</h2>
        <div className="bg-yellow-100 p-4 rounded">
          <p className="text-sm">
            <strong>Ce test vérifie :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>L'import de Mermaid 11.x</li>
            <li>La disponibilité des méthodes (initialize, render)</li>
            <li>Le rendu basique d'un diagramme</li>
            <li>La compatibilité de l'API</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MermaidV11Test;
