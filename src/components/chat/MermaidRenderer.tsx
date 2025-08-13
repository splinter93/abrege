"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { simpleLogger as logger } from '@/utils/logger';
import { normalizeMermaidContent, getMermaidDiagramType } from './mermaidService';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

// Configuration globale de Mermaid simplifiée
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  fontSize: 14,
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
  },
  sequence: {
    useMaxWidth: true,
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    rightAngles: false,
    showSequenceNumbers: false,
    actorFontSize: 14,
    noteFontSize: 14,
    messageFontSize: 14,
    wrap: true,
    wrapPadding: 10,
    labelBoxWidth: 50,
    labelBoxHeight: 20,
  },
  gantt: {
    useMaxWidth: true,
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 14,
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d',
    topAxis: false,
  },
  journey: {
    useMaxWidth: true,
    diagramMarginX: 50,
    diagramMarginY: 20,
  },
  gitGraph: {
    useMaxWidth: true,
    rotateCommitLabel: true,
    mainBranchOrder: 0,
    mainBranchName: 'main',
    showCommitLabel: true,
    showBranches: true,
  },
  pie: {
    useMaxWidth: true,
    textPosition: 0.75,
  },
  er: {
    useMaxWidth: true,
    diagramPadding: 20,
    minEntityWidth: 100,
    minEntityHeight: 75,
    entityPadding: 15,
    stroke: 'gray',
    fill: 'honeydew',
    fontSize: 14,
  },
  class: {
    useMaxWidth: true,
    diagramPadding: 8,
    nodeSpacing: 50,
    rankSpacing: 50,
  },
});

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, className = '' }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction de rendu optimisée
  const renderChart = useCallback(async (chartContent: string) => {
    if (!chartContent.trim()) {
      setError('Contenu du diagramme vide');
      setIsLoading(false);
      return;
    }

    try {
      // Annuler le rendu précédent s'il y en a un
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Créer un nouveau contrôleur d'annulation
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setError(null);
      setIsLoading(true);
      setIsRendered(false);
      setSvgContent('');

      // Normaliser le contenu Mermaid
      const normalizedChart = normalizeMermaidContent(chartContent);
      
      // Générer un ID unique pour ce diagramme
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      renderIdRef.current = id;

      // Vérifier si le composant est toujours monté
      if (signal.aborted) return;

      // Rendre le diagramme avec timeout
      const renderPromise = mermaid.render(id, normalizedChart);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de rendu (10s)')), 10000)
      );

      const result = await Promise.race([renderPromise, timeoutPromise]);
      
      // Vérifier si le composant est toujours monté et si c'est le bon rendu
      if (signal.aborted || renderIdRef.current !== id) return;

      if (result && typeof result === 'object' && 'svg' in result) {
        setSvgContent(result.svg as string);
        setIsRendered(true);
        setIsLoading(false);
        
        logger.info('Diagramme Mermaid rendu avec succès:', { 
          type: getMermaidDiagramType(normalizedChart),
          id 
        });
      } else {
        throw new Error('Format de réponse Mermaid invalide');
      }

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return; // Ignorer si annulé
      
      logger.error('Erreur lors du rendu Mermaid:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setIsRendered(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    renderChart(chart);

    return () => {
      // Annuler le rendu en cours lors du démontage
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chart, renderChart]);

  // Gestion des erreurs avec retry
  const handleRetry = useCallback(() => {
    setError(null);
    renderChart(chart);
  }, [chart, renderChart]);

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
          
          <div className="mermaid-error-body">
            <div className="mermaid-error-message">
              <strong>Erreur :</strong>
              <pre>{error}</pre>
            </div>
            
            <div className="mermaid-error-actions">
              <button onClick={handleRetry} className="mermaid-retry-btn">
                🔄 Réessayer
              </button>
            </div>
            
            <details className="mermaid-error-details">
              <summary>Code source</summary>
              <pre className="mermaid-source">{chart}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`mermaid-container ${className} ${isRendered ? 'mermaid-rendered' : 'mermaid-loading'}`}
      aria-label="Diagramme Mermaid"
    >
      {isLoading && (
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