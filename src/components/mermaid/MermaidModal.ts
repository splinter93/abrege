/**
 * Modal Mermaid pour agrandir les diagrammes
 * Utilise la configuration centralisée avec zoom et pan, sans container
 */

import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Fonction pour détecter le type de diagramme Mermaid
 */
function detectDiagramType(mermaidContent: string): string {
  const firstLine = mermaidContent.trim().split('\n')[0].toLowerCase();
  
  if (firstLine.includes('graph') || firstLine.includes('flowchart')) return 'Graphique';
  if (firstLine.includes('sequence')) return 'Diagramme de séquence';
  if (firstLine.includes('class')) return 'Diagramme de classe';
  if (firstLine.includes('state')) return 'Machine à états';
  if (firstLine.includes('er')) return 'Diagramme entité-relation';
  if (firstLine.includes('journey')) return 'Journey Map';
  if (firstLine.includes('gantt')) return 'Diagramme de Gantt';
  if (firstLine.includes('pie')) return 'Graphique circulaire';
  if (firstLine.includes('gitgraph')) return 'Git Graph';
  if (firstLine.includes('c4')) return 'Diagramme C4';
  if (firstLine.includes('mindmap')) return 'Mind Map';
  
  return 'Diagramme Mermaid';
}

/**
 * Fonction pour ouvrir le modal Mermaid agrandi
 */
export function openMermaidModal(mermaidContent: string) {
  // Créer le modal sans container
  const modal = document.createElement('div');
  modal.className = 'mermaid-modal';
  
  // Toolbar transparente avec type de diagramme et boutons
  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-modal-toolbar';
  
  // Type de diagramme (détecté depuis le contenu)
  const diagramType = detectDiagramType(mermaidContent);
  const typeLabel = document.createElement('div');
  typeLabel.className = 'mermaid-modal-type';
  typeLabel.textContent = diagramType;
  
  // Bouton copier - juste l'icône
  const copyButton = document.createElement('button');
  copyButton.className = 'mermaid-modal-copy';
  copyButton.title = 'Copier le code (Ctrl+C)';
  copyButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  
  // Gestion du copier
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(mermaidContent);
      copyButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      `;
      copyButton.classList.add('copied');
      
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
        copyButton.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  });
  
  // Bouton fermer intégré dans la toolbar
  const closeButton = document.createElement('button');
  closeButton.className = 'mermaid-modal-close';
  closeButton.title = 'Fermer (Échap)';
  closeButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  
  // Assembler la toolbar
  toolbar.appendChild(typeLabel);
  toolbar.appendChild(copyButton);
  toolbar.appendChild(closeButton);
  
  // Conteneur pour le SVG avec zoom et pan
  const svgWrapper = document.createElement('div');
  svgWrapper.className = 'mermaid-modal-svg-wrapper';
  svgWrapper.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 40px;
    cursor: default;
    user-select: none;
    transition: transform 0.2s ease-out;
  `;
  
  // État du zoom et pan
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  
  // Fonction pour appliquer la transformation complète
  const applyTransform = () => {
    svgWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
  };
  
  // Fonction pour appliquer le zoom
  const applyZoom = (newScale: number) => {
    // Interdire le dezoom en dessous de 100%
    currentScale = Math.max(1, Math.min(3, newScale));
    
    // Si on dezoom vers 100%, recentrer automatiquement
    if (currentScale === 1) {
      translateX = 0;
      translateY = 0;
    }
    
    applyTransform();
    svgWrapper.style.cursor = currentScale > 1 ? 'grab' : 'default';
  };
  
  // Fonction pour reset le zoom et la position
  const resetZoom = () => {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
    svgWrapper.style.cursor = 'default';
  };
  
  // Gestion du zoom à la molette
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = currentScale * delta;
    applyZoom(newScale);
  };
  
  // Gestion du pan au clic-glissé
  const handleMouseDown = (e: MouseEvent) => {
    if (currentScale > 1) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svgWrapper.style.cursor = 'grabbing';
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      
      translateX += deltaX;
      translateY += deltaY;
      
      applyTransform();
      
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      svgWrapper.style.cursor = currentScale > 1 ? 'grab' : 'default';
    }
  };
  
  // Double-clic pour reset
  const handleDoubleClick = () => {
    resetZoom();
  };
  
  // Ajouter les éléments directement au modal
  modal.appendChild(toolbar);
  modal.appendChild(svgWrapper);
  
  // Rendre le diagramme dans le modal
  renderMermaidDiagram(svgWrapper, mermaidContent);
  
  // Ajouter au DOM
  document.body.appendChild(modal);
  
  // Empêcher le scroll du body
  document.body.style.overflow = 'hidden';
  
  // Event listeners pour le zoom et pan
  svgWrapper.addEventListener('wheel', handleWheel, { passive: false });
  svgWrapper.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  svgWrapper.addEventListener('dblclick', handleDoubleClick);
  
  // Fermer avec Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  // Fermer en cliquant sur l'overlay
  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  // Fermer en cliquant sur le bouton
  const handleCloseClick = () => {
    closeModal();
  };

  // Fonction pour fermer le modal
  function closeModal() {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    // Restaurer le scroll du body
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEscape);
    modal.removeEventListener('click', handleOverlayClick);
    closeButton.removeEventListener('click', handleCloseClick);
    svgWrapper.removeEventListener('wheel', handleWheel);
    svgWrapper.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    svgWrapper.removeEventListener('dblclick', handleDoubleClick);
  }

  // Ajouter les event listeners
  document.addEventListener('keydown', handleEscape);
  modal.addEventListener('click', handleOverlayClick);
  closeButton.addEventListener('click', handleCloseClick);
}

/**
 * Fonction pour rendre le diagramme Mermaid dans la modal
 */
async function renderMermaidDiagram(container: HTMLElement, mermaidContent: string) {
  try {
    // Initialiser Mermaid avec la configuration centralisée
    await initializeMermaid();

    // Importer Mermaid dynamiquement
    const mermaid = await import('mermaid');

    // Normaliser le contenu Mermaid
    const normalizedContent = normalizeMermaidContent(mermaidContent);
    
    // Générer un ID unique
    const id = `mermaid-modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Rendre le diagramme
    const result = await mermaid.default.render(id, normalizedContent);
    
    if (result && result.svg) {
      // Créer le conteneur SVG pour le diagramme agrandi
      const svgContainer = document.createElement('div');
      svgContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      `;
      svgContainer.innerHTML = result.svg;
      
      // Ajouter le conteneur SVG
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
  } catch (error) {
    logger.error('Erreur lors du rendu Mermaid dans la modal:', error);
    
    // Afficher l'erreur
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 20px;
    `;
    errorContainer.innerHTML = `
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
    
    // Ajouter le conteneur d'erreur
    container.appendChild(errorContainer);
  }
}
