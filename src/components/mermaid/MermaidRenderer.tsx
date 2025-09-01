/**
 * Composant MermaidRenderer unifié
 * Fonctionne pour l'éditeur ET le chat avec style commun
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent, getMermaidDiagramType } from '@/components/chat/mermaidService';
import { simpleLogger as logger } from '@/utils/logger';
import './MermaidRenderer.css';

export interface MermaidRendererProps {
  /** Contenu Mermaid à rendre */
  content: string;
  /** Variante d'affichage (editor ou chat) */
  variant?: 'editor' | 'chat';
  /** Classe CSS optionnelle */
  className?: string;
  /** Afficher les boutons d'action */
  showActions?: boolean;
  /** Callback appelé en cas d'erreur */
  onError?: (error: string) => void;
  /** Callback appelé en cas de succès */
  onSuccess?: () => void;
  /** Options de rendu personnalisées */
  renderOptions?: {
    timeout?: number;
    retryCount?: number;
  };
}

/**
 * Composant MermaidRenderer unifié
 * Gère le rendu des diagrammes Mermaid pour l'éditeur et le chat
 */
const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  content,
  variant = 'chat',
  className = '',
  showActions = true,
  onError,
  onSuccess,
  renderOptions = {}
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  const renderIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    timeout = 10000
  } = renderOptions;

  // Fonction de rendu optimisée
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Nettoyer le timeout précédent
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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

      // Initialiser Mermaid si nécessaire
      await initializeMermaid();

      // Importer Mermaid dynamiquement
      const mermaid = await import('mermaid');

      // Rendre le diagramme avec timeout
      const renderPromise = mermaid.default.render(id, normalizedChart);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => reject(new Error(`Timeout de rendu (${timeout}ms)`)), timeout);
      });

      const result = await Promise.race([renderPromise, timeoutPromise]);
      
      // Vérifier si le composant est toujours monté et si c'est le bon rendu
      if (signal.aborted || renderIdRef.current !== id) return;

      if (result && typeof result === 'object' && 'svg' in result) {
        setSvgContent(result.svg as string);
        setIsRendered(true);
        setIsLoading(false);
        
        logger.info('Diagramme Mermaid rendu avec succès:', { 
          type: getMermaidDiagramType(normalizedChart),
          variant,
          id 
        });
        
        onSuccess?.();
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
      onError?.(errorMessage);
    }
  }, [timeout, onError, onSuccess, variant]);

  // Effet pour déclencher le rendu
  useEffect(() => {
    renderChart(content);

    return () => {
      // Annuler le rendu en cours lors du démontage
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Nettoyer le timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, renderChart]);

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

  // Classes CSS dynamiques
  const containerClasses = [
    'mermaid-container',
    `mermaid-${variant}`,
    isRendered ? 'mermaid-rendered' : 'mermaid-loading',
    error ? 'mermaid-error' : '',
    className
  ].filter(Boolean).join(' ');

  // Affichage des erreurs avec design moderne
  if (error) {
    return (
      <div className={containerClasses}>
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
              <pre className="mermaid-source">{content}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du chargement avec design moderne
  if (isLoading) {
    return (
      <div className={containerClasses}>
        <div className="mermaid-loading-content">
          <div className="mermaid-spinner"></div>
          <span>Rendu du diagramme...</span>
        </div>
      </div>
    );
  }

  // Affichage du diagramme rendu avec design moderne
  if (isRendered && svgContent) {
    return (
      <div className={containerClasses}>
        <div 
          dangerouslySetInnerHTML={{ __html: svgContent }}
          className="mermaid-svg-container"
        />
        
        {/* Boutons d'action modernes */}
        {showActions && (
          <div className="mermaid-actions">
            <button 
              onClick={handleCopy}
              className="mermaid-action-btn mermaid-copy-btn"
              title="Copier le code"
            >
              {isCopied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
    );
  }

  // Fallback si rien n'est rendu
  return null;
};

export default MermaidRenderer;
