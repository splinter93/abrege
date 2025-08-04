"use client";
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

// Configuration globale de Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  fontSize: 14,
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
  sequence: {
    useMaxWidth: true,
  },
  gantt: {
    useMaxWidth: true,
  },
  journey: {
    useMaxWidth: true,
  },
  gitGraph: {
    useMaxWidth: true,
  },
  pie: {
    useMaxWidth: true,
  },
  er: {
    useMaxWidth: true,
  },
});

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, className = '' }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderIdRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      if (!chart.trim()) return;

      try {
        if (!isMounted) return;
        
        setError(null);
        setIsRendered(false);
        setSvgContent('');

        // Générer un ID unique pour ce diagramme
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        renderIdRef.current = id;

        // Rendre le diagramme
        const { svg } = await mermaid.render(id, chart);
        
        if (isMounted && renderIdRef.current === id) {
          setSvgContent(svg);
          setIsRendered(true);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Erreur lors du rendu Mermaid:', err);
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
          setIsRendered(false);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className={`mermaid-error ${className}`}>
        <div className="mermaid-error-content">
          <div className="mermaid-error-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Erreur de rendu du diagramme</span>
          </div>
          <details className="mermaid-error-details">
            <summary>Voir l'erreur</summary>
            <div className="mermaid-error-body">
              <div className="mermaid-error-message">
                <strong>Erreur :</strong>
                <pre>{error}</pre>
              </div>
              <div className="mermaid-error-source">
                <strong>Code source :</strong>
                <pre className="mermaid-source">{chart}</pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`mermaid-container ${className} ${isRendered ? 'mermaid-rendered' : 'mermaid-loading'}`}
      aria-label="Diagramme Mermaid"
    >
      {!isRendered && (
        <div className="mermaid-loading-indicator">
          <div className="mermaid-spinner"></div>
          <span>Rendu du diagramme...</span>
        </div>
      )}
      {isRendered && svgContent && (
        <div 
          dangerouslySetInnerHTML={{ __html: svgContent }}
          className="mermaid-svg-container"
        />
      )}
    </div>
  );
};

export default MermaidRenderer; 