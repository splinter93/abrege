import React, { useEffect, useState } from 'react';
import { Change } from 'diff';

interface EditorDiffOverlayProps {
  changes: Change[];
  isVisible: boolean;
  editorRef: React.RefObject<HTMLElement | null>;
}

const EditorDiffOverlay: React.FC<EditorDiffOverlayProps> = ({
  changes,
  isVisible,
  editorRef
}) => {
  const [, setHighlights] = useState<Array<{
    element: HTMLElement;
    type: 'added' | 'removed';
    text: string;
  }>>([]);

  useEffect(() => {
    if (!isVisible || !editorRef.current || changes.length === 0) {
      // Nettoyer les surlignages existants
      setHighlights([]);
      return;
    }

    const editor = editorRef.current;
    const newHighlights: Array<{
      element: HTMLElement;
      type: 'added' | 'removed';
      text: string;
    }> = [];

    // Parcourir le contenu de l'éditeur pour trouver les changements
    const walkTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        
        // Chercher les changements dans ce texte
        changes.forEach(change => {
          if (change.added && text.includes(change.value)) {
            // Créer un surlignage pour le texte ajouté
            const span = document.createElement('span');
            span.className = 'diff-highlight added';
            span.textContent = change.value;
            span.style.cssText = `
              background: rgba(34, 197, 94, 0.3);
              border-radius: 2px;
              padding: 1px 2px;
              animation: highlightAdded 0.5s ease-out;
              /* Responsive mobile */
              font-size: clamp(12px, 2.5vw, 16px);
              line-height: 1.4;
              word-break: break-word;
              /* Support tactile */
              touch-action: manipulation;
              /* Amélioration accessibilité */
              border-left: 2px solid #22c55e;
            `;
            
            // Remplacer le texte dans le DOM
            const range = document.createRange();
            range.setStart(node, text.indexOf(change.value));
            range.setEnd(node, text.indexOf(change.value) + change.value.length);
            
            try {
              range.deleteContents();
              range.insertNode(span);
              newHighlights.push({
                element: span,
                type: 'added',
                text: change.value
              });
            } catch (e) {
              console.warn('Impossible de surligner le changement:', e);
            }
          } else if (change.removed && text.includes(change.value)) {
            // Créer un surlignage pour le texte supprimé
            const span = document.createElement('span');
            span.className = 'diff-highlight removed';
            span.textContent = change.value;
            span.style.cssText = `
              background: rgba(239, 68, 68, 0.3);
              text-decoration: line-through;
              border-radius: 2px;
              padding: 1px 2px;
              animation: highlightRemoved 0.5s ease-out;
              /* Responsive mobile */
              font-size: clamp(12px, 2.5vw, 16px);
              line-height: 1.4;
              word-break: break-word;
              /* Support tactile */
              touch-action: manipulation;
              /* Amélioration accessibilité */
              border-left: 2px solid #ef4444;
            `;
            
            // Remplacer le texte dans le DOM
            const range = document.createRange();
            range.setStart(node, text.indexOf(change.value));
            range.setEnd(node, text.indexOf(change.value) + change.value.length);
            
            try {
              range.deleteContents();
              range.insertNode(span);
              newHighlights.push({
                element: span,
                type: 'removed',
                text: change.value
              });
            } catch (e) {
              console.warn('Impossible de surligner le changement:', e);
            }
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Parcourir récursivement les enfants
        Array.from(node.childNodes).forEach(walkTextNodes);
      }
    };

    // Parcourir tout le contenu de l'éditeur
    walkTextNodes(editor);

    setHighlights(newHighlights);

    // Nettoyer les surlignages après 3 secondes
    const cleanup = setTimeout(() => {
      newHighlights.forEach(highlight => {
        if (highlight.element.parentNode) {
          // Restaurer le texte original
          const textNode = document.createTextNode(highlight.text);
          highlight.element.parentNode.replaceChild(textNode, highlight.element);
        }
      });
      setHighlights([]);
    }, 3000);

    return () => {
      clearTimeout(cleanup);
      // Nettoyer immédiatement si le composant se démonte
      newHighlights.forEach(highlight => {
        if (highlight.element.parentNode) {
          const textNode = document.createTextNode(highlight.text);
          highlight.element.parentNode.replaceChild(textNode, highlight.element);
        }
      });
    };
  }, [isVisible, changes, editorRef]);

  // Styles CSS pour les animations avec support mobile
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* @keyframes highlightAdded {
        0% {
          background: rgba(34, 197, 94, 0.8);
          transform: scale(1.05);
        }
        100% {
          background: rgba(34, 197, 94, 0.3);
          transform: scale(1);
        }
      }
      
      @keyframes highlightRemoved {
        0% {
          background: rgba(239, 68, 68, 0.8);
          transform: scale(1.05);
        }
        100% {
          background: rgba(239, 68, 68, 0.3);
          transform: scale(1);
        }
      } */ /* Animations désactivées pour interface simple */
      
      /* Support pour la réduction de mouvement */
      @media (prefers-reduced-motion: reduce) {
        .diff-highlight {
          animation: none !important;
        }
      }
      
      /* Responsive mobile */
      @media (max-width: 768px) {
        .diff-highlight {
          font-size: 14px !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
        }
      }
      
      @media (max-width: 480px) {
        .diff-highlight {
          font-size: 13px !important;
          padding: 1px 2px !important;
        }
      }
      
      /* Support pour les écrans haute densité */
      @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
        .diff-highlight {
          border-width: 1px !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null; // Ce composant ne rend rien visuellement, il modifie le DOM directement
};

export default EditorDiffOverlay; 