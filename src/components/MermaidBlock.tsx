"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import './MermaidBlock.css';

interface MermaidBlockProps {
  content: string;
  className?: string;
  showToolbar?: boolean;
}

const MermaidBlock: React.FC<MermaidBlockProps> = ({ 
  content, 
  className = '', 
  showToolbar = true 
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const renderIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction de rendu optimisée avec le même thème que CodeBlockWithCopy
  const renderChart = useCallback(async (mermaidContent: string) => {
    if (!mermaidContent.trim()) {
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
      const normalizedContent = normalizeMermaidContent(mermaidContent);
      
      // Générer un ID unique pour ce diagramme
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      renderIdRef.current = id;

      // Vérifier si le composant est toujours monté
      if (signal.aborted) return;

      // Importer Mermaid de manière sécurisée
      let mermaid: any;
      try {
        mermaid = await import('mermaid');
      } catch (importError) {
        throw new Error('Mermaid non disponible');
      }

      // Configuration Mermaid avec le même thème que CodeBlockWithCopy
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          // ========================================
          // THÈME CLASSIQUE MODERNE - BASÉ SUR KHROMA
          // ========================================
          
          // COULEURS DE BASE
          background: '#1a1a1a',              // Fond principal sombre
          primaryColor: '#f97316',            // Orange moderne principal
          secondaryColor: '#ea580c',          // Orange foncé secondaire
          tertiaryColor: '#fb923c',           // Orange clair tertiaire
          
          // COULEURS DE TEXTE
          primaryTextColor: '#ffffff',        // Texte principal blanc
          secondaryTextColor: '#e5e7eb',      // Texte secondaire gris clair
          tertiaryTextColor: '#ffffff',       // Texte tertiaire blanc
          textColor: '#ffffff',               // Texte général blanc
          
          // COULEURS DE BORDURES
          primaryBorderColor: '#f97316',      // Bordure principale orange
          secondaryBorderColor: '#ea580c',    // Bordure secondaire orange foncé
          tertiaryBorderColor: '#fb923c',     // Bordure tertiaire orange clair
          border1: '#f97316',                 // Bordure 1 orange
          border2: '#ea580c',                 // Bordure 2 orange foncé
          
          // COULEURS DE LIGNES
          lineColor: '#f97316',               // Lignes et flèches orange
          arrowheadColor: '#f97316',          // Flèches orange
          
          // FONDS PRINCIPAUX
          mainBkg: '#1f2020',                 // Fond principal des diagrammes
          secondBkg: '#2d2d2d',               // Fond secondaire
          background1: '#1a1a1a',             // Fond 1
          background2: '#2d2d2d',             // Fond 2
          background3: '#404040',             // Fond 3
          
          // FLOWCHART - STYLE CLASSIQUE
          nodeBkg: '#f97316',                 // Fond des nœuds orange
          nodeBorder: '#ea580c',              // Bordure des nœuds orange foncé
          nodeTextColor: '#ffffff',            // Texte des nœuds blanc
          clusterBkg: '#2d2d2d',              // Fond des clusters gris
          clusterBorder: '#f97316',           // Bordure des clusters orange
          defaultLinkColor: '#f97316',        // Couleur des liens orange
          edgeLabelBackground: 'transparent',  // Fond des labels d'arêtes transparent
          
          // SEQUENCE DIAGRAM - STYLE CLASSIQUE
          actorBkg: '#1f2020',                // Fond des acteurs sombre
          actorBorder: '#f97316',             // Bordure des acteurs orange
          actorTextColor: '#ffffff',          // Texte des acteurs blanc
          messageTextColor: '#e5e7eb',        // Texte des messages gris clair
          noteBkgColor: '#fef3c7',            // Fond des notes jaune clair
          noteBorderColor: '#f59e0b',         // Bordure des notes jaune
          noteTextColor: '#92400e',           // Texte des notes jaune foncé
          sectionBkgColor: '#2d2d2d',         // Fond des sections gris
          sectionBkgColor2: '#404040',        // Fond alternatif gris plus clair
          
          // CLASS DIAGRAM - STYLE CLASSIQUE
          classBkg: '#1f2020',                // Fond des classes sombre
          classBorder: '#f97316',             // Bordure des classes orange
          classTitleColor: '#f97316',         // Titre des classes orange
          classLabelColor: '#e5e7eb',         // Labels des classes gris clair
          attributeTextColor: '#d1d5db',      // Attributs gris
          relationshipTextColor: '#ffffff',    // Relations blanc
          
          // STATE DIAGRAM - STYLE CLASSIQUE
          stateBkg: '#1f2020',                // Fond des états sombre
          stateBorder: '#ea580c',             // Bordure des états orange
          stateTextColor: '#ffffff',          // Texte des états blanc
          transitionTextColor: '#ffffff',      // Texte des transitions blanc
          
          // Variables spécifiques pour les node labels des state diagrams
          labelTextColor: '#ffffff',           // Texte des labels blanc
          edgeLabelColor: '#ffffff',           // Couleur des labels d'arêtes blanc
          
          // ENTITY RELATIONSHIP - STYLE CLASSIQUE
          entityBkg: '#1f2020',               // Fond des entités sombre
          entityBorder: '#f97316',            // Bordure des entités orange
          entityTextColor: '#ffffff',         // Texte des entités blanc
          
          // GIT GRAPH - STYLE CLASSIQUE
          commitBkg: '#f97316',               // Fond des commits orange
          commitBorder: '#ea580c',            // Bordure des commits orange foncé
          commitTextColor: '#ffffff',         // Texte des commits blanc
          branchTextColor: '#e5e7eb',         // Texte des branches gris clair
          
          // PIE CHART - STYLE CLASSIQUE
          pieBkg: '#ffffff',                  // Fond des sections blanc
          pieBorder: '#f97316',               // Bordure des sections orange
          pieTitleTextColor: '#ffffff',       // Titre du graphique blanc
          sliceTextColor: '#ffffff',          // Texte sur les sections blanc
          
          // JOURNEY - STYLE CLASSIQUE
          journeyBkg: '#1f2020',              // Fond des étapes sombre
          journeyBorder: '#f97316',           // Bordure des étapes orange
          journeyTextColor: '#ffffff',        // Texte des étapes blanc
          
          // COULEURS D'ÉTAT - PALETTE CLASSIQUE
          errorBkgColor: '#fee2e2',           // Fond d'erreur rouge très clair
          errorTextColor: '#dc2626',           // Texte d'erreur rouge
          warningBkgColor: '#fef3c7',         // Fond d'avertissement jaune très clair
          warningTextColor: '#d97706',         // Texte d'avertissement jaune
          successBkgColor: '#ecfdf5',         // Fond de succès vert très clair
          successTextColor: '#10b981',         // Texte de succès vert
          
          // COULEURS SPÉCIALES - ACCENTS CLASSIQUES
          titleColor: '#f97316',              // Couleur des titres orange
          labelBackground: '#2d2d2d',         // Fond des labels gris
          mainContrastColor: '#ffffff',       // Couleur de contraste principale blanc
          darkTextColor: '#1f2020',           // Texte sombre
        },
        securityLevel: 'loose',
        fontFamily: 'Noto Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 14,
        
        // ========================================
        // CONFIGURATION UNIFORME - STYLE CLASSIQUE
        // ========================================
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          padding: 20,
          nodeSpacing: 50,
          rankSpacing: 50,
          diagramPadding: 20,
        },
        
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 50,
          diagramMarginY: 20,
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 15,
          boxTextMargin: 10,
          noteMargin: 15,
          messageMargin: 40,
          mirrorActors: true,
          bottomMarginAdj: 1,
          rightAngles: false,
          showSequenceNumbers: false,
          actorFontSize: 14,
          noteFontSize: 14,
          messageFontSize: 14,
          wrap: true,
          wrapPadding: 15,
          labelBoxWidth: 60,
          labelBoxHeight: 25,
        },
        
        gantt: {
          useMaxWidth: true,
          titleTopMargin: 30,
          barHeight: 25,
          barGap: 6,
          topPadding: 60,
          leftPadding: 80,
          gridLineStartPadding: 40,
          fontSize: 14,
          numberSectionStyles: 4,
          axisFormat: '%Y-%m-%d',
          topAxis: false,
        },
        
        journey: {
          useMaxWidth: true,
          diagramMarginX: 60,
          diagramMarginY: 25,
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
          diagramPadding: 25,
          minEntityWidth: 120,
          minEntityHeight: 80,
          entityPadding: 20,
          stroke: '#f97316',
          fill: '#1f2020',
          fontSize: 14,
        },
        
        class: {
          useMaxWidth: true,
          diagramPadding: 15,
          nodeSpacing: 60,
          rankSpacing: 60,
        },
      });

      // Vérifier si le composant est toujours monté
      if (signal.aborted || renderIdRef.current !== id) return;

      // Rendre le diagramme avec timeout
      const renderPromise = mermaid.default.render(id, normalizedContent);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de rendu (10s)')), 10000)
      );

      const result = await Promise.race([renderPromise, timeoutPromise]);
      
      // Vérifier si le composant est toujours monté et si c'est le bon rendu
      if (signal.aborted || renderIdRef.current !== id) return;

      if (result && result.svg) {
        setSvgContent(result.svg);
        setIsRendered(true);
        setIsLoading(false);
        
        logger.info('Diagramme Mermaid rendu avec succès:', { id });
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
    renderChart(content);

    return () => {
      // Annuler le rendu en cours lors du démontage
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [content, renderChart]);

  // Gestion des erreurs avec retry
  const handleRetry = useCallback(() => {
    setError(null);
    renderChart(content);
  }, [content, renderChart]);

  // Copier le code Mermaid
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      logger.error('Erreur lors de la copie:', err);
    }
  }, [content]);

  // Ouvrir le modal agrandi
  const handleExpand = useCallback(() => {
    const modal = document.createElement('div');
    modal.className = 'mermaid-modal';
    
    const diagramContainer = document.createElement('div');
    diagramContainer.className = 'mermaid-modal-container';
    
    // Rendre le diagramme dans le modal
    renderChart(content);
    
    modal.appendChild(diagramContainer);
    document.body.appendChild(modal);
    
    // Fermer avec Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    });
  }, [content, renderChart]);

  if (error) {
    return (
      <div className={`mermaid-block-container mermaid-error ${className}`}>
        {showToolbar && (
          <div className="mermaid-toolbar">
            <button 
              className="mermaid-toolbar-button mermaid-retry-button"
              onClick={handleRetry}
              title="Réessayer le rendu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
          </div>
        )}
        
        <div className="mermaid-error">
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
              
              <details className="mermaid-error-details">
                <summary>Code source</summary>
                <pre className="mermaid-source">{content}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mermaid-block-container ${className}`}>
      {showToolbar && (
        <div className="mermaid-toolbar">
          <button 
            className={`mermaid-toolbar-button mermaid-copy-button ${isCopied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copier le code Mermaid"
          >
            {isCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
          
          <button 
            className="mermaid-toolbar-button mermaid-expand-button"
            onClick={handleExpand}
            title="Agrandir le diagramme"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </div>
      )}
      
      <div 
        className={`mermaid-container ${isRendered ? 'mermaid-rendered' : 'mermaid-loading'}`}
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
    </div>
  );
};

export default MermaidBlock;
