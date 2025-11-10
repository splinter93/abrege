/**
 * Composant MermaidRenderer unifié
 * Fonctionne pour l'éditeur ET le chat avec style commun
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent, getMermaidDiagramType } from '@/components/chat/mermaidService';
import { simpleLogger as logger } from '@/utils/logger';
import MermaidToolbar from './MermaidToolbar';
import { openMermaidModal } from './MermaidModal';
// Les styles sont maintenant dans unified-blocks.css
// import './MermaidRenderer.css'; - REMOVED

export interface MermaidRendererProps {
  /** Contenu Mermaid à rendre */
  content: string;
  /** Variante d'affichage (editor ou chat) */
  variant?: 'editor' | 'chat';
  /** Classe CSS optionnelle */
  className?: string;
  /** Afficher la toolbar */
  showToolbar?: boolean;
  /** Afficher le bouton copier dans la toolbar */
  showCopy?: boolean;
  /** Afficher le bouton agrandir dans la toolbar */
  showExpand?: boolean;
  /** Afficher le bouton éditer dans la toolbar */
  showEdit?: boolean;
  /** Callback appelé en cas d'erreur */
  onError?: (error: string) => void;
  /** Callback appelé en cas de succès */
  onSuccess?: () => void;
  /** Callback pour l'édition */
  onEdit?: () => void;
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
  showToolbar = true,
  showCopy = true,
  showExpand = true,
  showEdit = true,
  onError,
  onSuccess,
  onEdit,
  renderOptions = {}
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  
  const renderIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

      // Valider la syntaxe en amont pour empêcher Mermaid d'injecter son SVG d'erreur
      try {
        await mermaid.default.parse(normalizedChart);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Erreur de syntaxe Mermaid inconnue';
        throw new Error(errorMessage);
      }

      // Rendre le diagramme avec timeout
      const renderPromise = mermaid.default.render(id, normalizedChart);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => reject(new Error(`Timeout de rendu (${timeout}ms)`)), timeout);
      });

      const result = await Promise.race([renderPromise, timeoutPromise]);
      
      // Vérifier si le composant est toujours monté et si c'est le bon rendu
      if (signal.aborted || renderIdRef.current !== id) return;

      if (result && typeof result === 'object' && 'svg' in result) {
        const svgResult = result.svg as string;

        // Vérifier si Mermaid renvoie quand même son SVG d'erreur (aria-roledescription="error")
        const isErrorSvg = svgResult.includes('aria-roledescription="error"') || svgResult.includes('class="error-text"');
        if (isErrorSvg) {
          throw new Error('Mermaid a renvoyé une erreur de rendu.');
        }

        setSvgContent(svgResult);
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

  useEffect(() => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setCopyStatus('idle');

    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, [error]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);
  
  const handleExpand = useCallback(() => {
    openMermaidModal(content);
  }, [content]);

  const diagramType = getMermaidDiagramType(content).toUpperCase(); // MAJUSCULE

  return (
    <div className={`u-block u-block--mermaid ${className}`}>
      {showToolbar && (
        <div className="u-block__toolbar">
          <div className="toolbar-left">
            <span className="toolbar-label">{diagramType}</span>
          </div>
          <div className="toolbar-right">
            {/* Note: La toolbar du renderer est plus simple que celle de l'éditeur */}
            {showCopy && isRendered && (
              <button
                className="toolbar-btn"
                title="Copier le code"
                onClick={async (event) => {
                  try {
                    await navigator.clipboard.writeText(content);
                    // Animation de confirmation visuelle
                    const button = event.currentTarget as HTMLButtonElement;
                    const originalHTML = button.innerHTML;
                    button.innerHTML = `
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    `;
                    button.classList.add('copied');
                    setTimeout(() => {
                      button.innerHTML = originalHTML;
                      button.classList.remove('copied');
                    }, 2000);
                  } catch (err) {
                    console.error('Erreur lors de la copie:', err);
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            )}
            {showExpand && isRendered && (
               <button 
                 className="toolbar-btn expand-btn" 
                 title="Agrandir le diagramme"
                 onClick={handleExpand}
               >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div 
        className="u-block__body"
        onDoubleClick={() => {
          if (isRendered && !error) {
            openMermaidModal(content);
          }
        }}
        style={{ cursor: isRendered && !error ? 'pointer' : 'default' }}
        title={isRendered && !error ? 'Double-cliquer pour agrandir' : ''}
      >
        {isLoading && (
          <div className="mermaid-loading-content">
            <div className="mermaid-spinner"></div>
          </div>
        )}
        {error && (
          <div className="mermaid-error-content">
            <div className="mermaid-error-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="mermaid-error-title">Erreur de rendu du diagramme</div>
            <div className="mermaid-error-message">
              <strong>Cause :</strong>
              <pre className="mermaid-error-text">{error}</pre>
            </div>
            <button
              className="mermaid-error-copy-btn"
              type="button"
              onClick={async () => {
                if (!error) {
                  return;
                }
                if (copyTimeoutRef.current) {
                  clearTimeout(copyTimeoutRef.current);
                }
                try {
                  await navigator.clipboard.writeText(error);
                  setCopyStatus('copied');
                  copyTimeoutRef.current = setTimeout(() => {
                    setCopyStatus('idle');
                    copyTimeoutRef.current = null;
                  }, 2000);
                } catch (copyError) {
                  logger.error('[Mermaid] Erreur lors de la copie', copyError);
                  setCopyStatus('idle');
                }
              }}
              title="Copier l'erreur"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copyStatus === 'copied' ? 'Copié !' : 'Copier l\'erreur'}</span>
            </button>
          </div>
        )}
        {isRendered && svgContent && (
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="mermaid-svg-container"
          />
        )}
      </div>
    </div>
  );
};

export default MermaidRenderer;
