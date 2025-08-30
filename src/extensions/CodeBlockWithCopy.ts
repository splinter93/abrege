import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { detectMermaidBlocks, validateMermaidSyntax, normalizeMermaidContent } from '../components/chat/mermaidService';
import { Node } from '@tiptap/pm/model';

const CodeBlockWithCopy = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.className = 'code-block-container';

      const codeContent = node.textContent;
      const language = node.attrs.language || '';

      // Détecter si c'est un bloc Mermaid
      const isMermaid = language === 'mermaid' || 
                       (language === '' && codeContent.trim().startsWith('flowchart')) ||
                       (language === '' && codeContent.trim().startsWith('sequenceDiagram')) ||
                       (language === '' && codeContent.trim().startsWith('classDiagram')) ||
                       (language === '' && codeContent.trim().startsWith('pie')) ||
                       (language === '' && codeContent.trim().startsWith('gantt')) ||
                       (language === '' && codeContent.trim().startsWith('gitGraph')) ||
                       (language === '' && codeContent.trim().startsWith('journey')) ||
                       (language === '' && codeContent.trim().startsWith('er')) ||
                       (language === '' && codeContent.trim().startsWith('stateDiagram'));

      if (isMermaid) {
        // Rendre le diagramme Mermaid
        return renderMermaidBlock(container, codeContent);
      } else {
        // Rendre le bloc de code normal avec bouton de copie
        return renderCodeBlock(container, node, language);
      }
    };
  },
});

// Fonction pour rendre un bloc Mermaid
function renderMermaidBlock(container: HTMLElement, mermaidContent: string) {
  container.className = 'mermaid-block-container';
  container.style.position = 'relative';
  
  // Créer le conteneur Mermaid
  const mermaidContainer = document.createElement('div');
  mermaidContainer.className = 'mermaid-container mermaid-loading';
  mermaidContainer.setAttribute('aria-label', 'Diagramme Mermaid');
  
  // Créer la barre d'outils avec boutons
  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-toolbar';
  
  // Bouton Copier
  const copyButton = document.createElement('button');
  copyButton.className = 'mermaid-toolbar-button mermaid-copy-button';
  copyButton.title = 'Copier le code Mermaid';
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  
  const copyCheckIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(mermaidContent).then(() => {
      copyButton.innerHTML = copyCheckIcon;
      copyButton.style.color = '#f97316';
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
        copyButton.style.color = 'inherit';
      }, 2000);
    });
  });
  
  // Bouton Agrandir
  const expandButton = document.createElement('button');
  expandButton.className = 'mermaid-toolbar-button mermaid-expand-button';
  expandButton.title = 'Agrandir le diagramme';
  expandButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
  `;
  
  expandButton.addEventListener('click', () => {
    openMermaidModal(mermaidContent);
  });
  
  // Ajouter les boutons à la barre d'outils
  toolbar.appendChild(copyButton);
  toolbar.appendChild(expandButton);
  
  // Indicateur de chargement
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'mermaid-loading-indicator';
  loadingIndicator.innerHTML = `
    <div class="mermaid-spinner"></div>
    <span>Rendu du diagramme...</span>
  `;
  mermaidContainer.appendChild(loadingIndicator);
  
  // Ajouter la barre d'outils et le conteneur au DOM
  container.appendChild(toolbar);
  container.appendChild(mermaidContainer);
  
  // Rendre le diagramme Mermaid de manière asynchrone
  renderMermaidDiagram(mermaidContainer, mermaidContent);
  
  return {
    dom: container,
    contentDOM: null, // Pas de contentDOM pour Mermaid
  };
}

// Fonction pour rendre un bloc de code normal
function renderCodeBlock(container: HTMLElement, node: Node, language: string) {
  // Créer le bloc de code standard
  const pre = document.createElement('pre');
  const code = document.createElement('code');

  if (language) {
    code.className = 'language-' + language;
  }
  pre.appendChild(code);
  
  const button = document.createElement('button');
  button.className = 'code-copy-button';
  button.title = 'Copier le code';
  
  const copyIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  const checkIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  
  button.innerHTML = copyIcon;
  button.addEventListener('click', () => {
    navigator.clipboard.writeText(node.textContent).then(() => {
      button.innerHTML = checkIcon;
      button.style.color = 'var(--accent-primary)';
      button.classList.add('copied');
      setTimeout(() => {
        button.innerHTML = copyIcon;
        button.style.color = '';
        button.classList.remove('copied');
      }, 2000);
    });
  });

  container.append(pre, button);

  return {
    dom: container,
    contentDOM: code,
  };
}

// Fonction pour rendre le diagramme Mermaid
async function renderMermaidDiagram(container: HTMLElement, mermaidContent: string) {
  try {
    // Importer Mermaid dynamiquement
    const mermaid = await import('mermaid');
    
    // Configuration Mermaid avec design CLASSIQUE et MODERNE
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

    // Normaliser le contenu Mermaid
    const normalizedContent = normalizeMermaidContent(mermaidContent);
    
    // Générer un ID unique
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Rendre le diagramme
    const result = await mermaid.default.render(id, normalizedContent);
    
    if (result && result.svg) {
      // Supprimer l'indicateur de chargement
      container.innerHTML = '';
      container.className = 'mermaid-container mermaid-rendered';
      
      // Créer le conteneur SVG
      const svgContainer = document.createElement('div');
      svgContainer.className = 'mermaid-svg-container';
      svgContainer.innerHTML = result.svg;
      
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
  } catch (error) {
    console.error('Erreur lors du rendu Mermaid:', error);
    
    // Afficher l'erreur
    container.innerHTML = `
      <div class="mermaid-error">
        <div class="mermaid-error-content">
          <div class="mermaid-error-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Erreur de rendu du diagramme</span>
          </div>
          <div class="mermaid-error-body">
            <div class="mermaid-error-message">
              <strong>Erreur :</strong>
              <pre>${error instanceof Error ? error.message : 'Erreur inconnue'}</pre>
            </div>
            <details class="mermaid-error-details">
              <summary>Code source</summary>
              <pre class="mermaid-source">${mermaidContent}</pre>
            </details>
          </div>
        </div>
      </div>
    `;
    container.className = 'mermaid-container mermaid-error';
  }
}

// Fonction pour ouvrir le modal Mermaid agrandi
function openMermaidModal(mermaidContent: string) {
  // Créer le modal avec une structure simple
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
  `;
  
  // Conteneur du diagramme avec scroll
  const diagramContainer = document.createElement('div');
  diagramContainer.style.cssText = `
    max-width: 95vw;
    max-height: 95vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 20px;
  `;
  
  // Rendre le diagramme dans le modal
  renderMermaidDiagram(diagramContainer, mermaidContent);
  
  // Ajouter le conteneur au modal
  modal.appendChild(diagramContainer);
  
  // Ajouter au DOM
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
}

export default CodeBlockWithCopy;
