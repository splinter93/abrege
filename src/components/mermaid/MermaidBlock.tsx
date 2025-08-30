/**
 * Composant MermaidBlock compatible Mermaid 10.x
 * Version stable et testée
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  useMermaidRenderer, 
  getMermaidDiagramType,
  normalizeMermaidContent 
} from '@/services/mermaid';
import { simpleLogger as logger } from '@/utils/logger';

export interface MermaidBlockProps {
  /** Contenu Mermaid à rendre */
  content: string;
  /** Variante d'affichage (chat ou éditeur) */
  variant: 'chat' | 'editor';
  /** Callback appelé en cas d'erreur */
  onError?: (error: string) => void;
  /** Callback appelé en cas de succès */
  onSuccess?: () => void;
  /** Classe CSS optionnelle */
  className?: string;
  /** Options de rendu personnalisées */
  renderOptions?: {
    timeout?: number;
    retryCount?: number;
    showActions?: boolean;
  };
}

/**
 * Composant MermaidBlock compatible Mermaid 10.x
 * Gère le rendu des diagrammes Mermaid avec gestion d'erreurs robuste
 */
const MermaidBlock: React.FC<MermaidBlockProps> = ({
  content,
  variant,
  onError,
  onSuccess,
  className = '',
  renderOptions = {}
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  const renderIdRef = useRef<string>('');
  const { render, cancelRender } = useMermaidRenderer();
  
  const {
    timeout = 15000,
    retryCount = 2,
    showActions = true
  } = renderOptions;

  // Fonction de rendu compatible Mermaid 10.x
  const renderChart = useCallback(async (chartContent: string) => {
    if (!chartContent.trim()) {
      const errorMsg = 'Contenu du diagramme vide';
      setError(errorMsg);
      setIsLoading(false);
      onError?.(errorMsg);
      return;
    }

    try {
      // Annuler le rendu précédent s'il y en a un
      if (renderIdRef.current) {
        cancelRender(renderIdRef.current);
      }

      setError(null);
      setIsLoading(true);
      setIsRendered(false);
      setSvgContent('');

      // Normaliser le contenu Mermaid
      const normalizedChart = normalizeMermaidContent(chartContent);
      logger.info('Rendu du diagramme Mermaid 10.x:', { 
        type: getMermaidDiagramType(normalizedChart),
        variant,
        contentLength: normalizedChart.length
      });
      
      // Rendre le diagramme avec le renderer compatible
      const result = await render(normalizedChart, {
        timeout,
        retryCount,
        onProgress: (status) => {
          logger.info('Progression du rendu Mermaid:', { status, variant });
          if (status === 'loading') setIsLoading(true);
          if (status === 'rendering') setIsLoading(true);
          if (status === 'success') {
            setIsLoading(false);
            setIsRendered(true);
          }
          if (status === 'error') setIsLoading(false);
        }
      });

      // Stocker l'ID du rendu
      renderIdRef.current = result.id;

      if (result.success && result.svg) {
        setSvgContent(result.svg);
        setIsRendered(true);
        setIsLoading(false);
        
        logger.info('Diagramme Mermaid 10.x rendu avec succès:', { 
          type: getMermaidDiagramType(normalizedChart),
          id: result.id,
          variant
        });
        
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Erreur de rendu inconnue');
      }

    } catch (err) {
      logger.error('Erreur lors du rendu Mermaid 10.x:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setIsRendered(false);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [render, cancelRender, timeout, retryCount, onError, onSuccess, variant]);

  // Effet pour déclencher le rendu
  useEffect(() => {
    renderChart(content);

    return () => {
      // Annuler le rendu en cours lors du démontage
      if (renderIdRef.current) {
        cancelRender(renderIdRef.current);
      }
    };
  }, [content, renderChart, cancelRender]);

  // Gestion de la copie du code source
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [content]);

  // Gestion des erreurs avec retry
  const handleRetry = useCallback(() => {
    setError(null);
    renderChart(content);
  }, [content, renderChart]);

  // Affichage des erreurs avec design moderne
  if (error) {
    return (
      <div className={`mermaid-error ${className}`}>
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-center space-x-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span className="font-medium text-red-800">Erreur de rendu du diagramme</span>
          </div>
          
          <div className="space-y-3">
            <div className="text-red-700">
              <strong>Erreur :</strong>
              <pre className="mt-1 text-sm bg-red-100 p-2 rounded">{error}</pre>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleRetry} 
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                🔄 Réessayer
              </button>
            </div>
            
            <details className="text-sm">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">Code source</summary>
              <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">{content}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du chargement avec design moderne
  if (isLoading) {
    return (
      <div className={`mermaid-container mermaid-loading ${className}`}>
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Rendu du diagramme...</span>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du diagramme rendu avec design moderne
  if (isRendered && svgContent) {
    return (
      <div className={`mermaid-container mermaid-rendered ${className}`}>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div 
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="mermaid-svg-container flex justify-center"
          />
          
          {/* Boutons d'action modernes */}
          {showActions && (
            <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
              {/* Bouton Copier */}
              <button 
                onClick={handleCopy}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1"
                title="Copier le code"
              >
                {isCopied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback si rien n'est rendu
  return null;
};

export default MermaidBlock;
