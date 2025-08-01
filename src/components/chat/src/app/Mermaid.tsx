"use client";

import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

// Génère un ID unique pour chaque instance du composant
const generateId = () => `mermaid-${Math.random().toString(36).substr(2, 9)}`;

// Initialisation globale de Mermaid (une seule fois)
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: 'transparent',
    primaryColor: '#2d3443',
    primaryTextColor: '#c8cde0',
    primaryBorderColor: 'rgba(255, 255, 255, 0.2)',
    lineColor: '#c8cde0',
    secondaryColor: '#222734',
    tertiaryColor: '#2d3443',
    
    // Font
    fontSize: '14px',
    fontFamily: '"JetBrains Mono", monospace',

    // Node colors
    nodeBorder: 'rgba(255, 255, 255, 0.2)',
    
    // Edge colors
    edgeLabelBackground: '#2d3443',

    // Specific diagrams
    pieBkg: '#2d3443',
    pieBorder: 'rgba(255, 255, 255, 0.2)',
    pieTextColor: '#c8cde0',
    sequenceNumberColor: 'white',
  },
});

const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState('');
  const id = useRef(generateId());

  useEffect(() => {
    const renderChart = async () => {
      if (chart) {
        try {
          const { svg: svgCode } = await mermaid.render(id.current, chart);
          setSvg(svgCode);
        } catch (e) {
          console.error("Erreur de rendu Mermaid:", e);
          const errorMessage = e instanceof Error ? e.message : String(e);
          setSvg(`<pre class="text-red-400"><code>${errorMessage}</code></pre>`);
        }
      }
    };
    renderChart();
  }, [chart]);

  // Le conteneur ne fait plus de style de "fenêtre", juste le rendu du SVG.
  // La classe "mermaid" est utilisée par les styles globaux pour les coins arrondis etc.
  return (
    <div className="mermaid-container">
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        // Placeholder pendant le rendu
        <div className="flex items-center justify-center p-4">Chargement du diagramme...</div>
      )}
    </div>
  );
};

export default Mermaid; 