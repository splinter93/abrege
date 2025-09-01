/**
 * Modal Mermaid pour agrandir les diagrammes
 * Utilise la configuration centralisée
 */

import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Fonction pour ouvrir le modal Mermaid agrandi
 */
export function openMermaidModal(mermaidContent: string) {
  // Créer le modal avec une structure simple
  const modal = document.createElement('div');
  modal.className = 'mermaid-modal';
  
  // Conteneur du diagramme avec scroll et taille adaptative
  const diagramContainer = document.createElement('div');
  diagramContainer.className = 'mermaid-modal-container';
  
  // Rendre le diagramme dans le modal
  renderMermaidDiagram(diagramContainer, mermaidContent);
  
  // Ajouter le conteneur au modal
  modal.appendChild(diagramContainer);
  
  // Ajouter au DOM
  document.body.appendChild(modal);
  
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

  // Fonction pour fermer le modal
  function closeModal() {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    document.removeEventListener('keydown', handleEscape);
    modal.removeEventListener('click', handleOverlayClick);
  }

  // Ajouter les event listeners
  document.addEventListener('keydown', handleEscape);
  modal.addEventListener('click', handleOverlayClick);
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
      // Créer le conteneur SVG
      const svgContainer = document.createElement('div');
      svgContainer.className = 'mermaid-svg-container';
      svgContainer.innerHTML = result.svg;
      
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
  } catch (error) {
    logger.error('Erreur lors du rendu Mermaid dans la modal:', error);
    
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
  }
}
