/**
 * Utilitaire pour formater automatiquement les paths comme du code inline
 */

/**
 * Détecte et formate les paths dans un élément HTML
 * @param element - L'élément HTML à traiter
 */
export function formatPathsInElement(element: HTMLElement): void {
  if (!element) return;

  // Regex pour détecter les paths
  const pathRegex = /(\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*)/g;
  
  // Fonction pour traiter un nœud de texte
  function processTextNode(node: Text): void {
    const text = node.textContent || '';
    const matches = Array.from(text.matchAll(pathRegex));
    
    if (matches.length === 0) return;
    
    // Créer un fragment pour remplacer le nœud
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    matches.forEach(match => {
      const fullMatch = match[0];
      const matchIndex = match.index!;
      
      // Ajouter le texte avant le match
      if (matchIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, matchIndex);
        fragment.appendChild(document.createTextNode(beforeText));
      }
      
      // Créer l'élément code pour le path
      const codeElement = document.createElement('code');
      codeElement.className = 'path-code';
      codeElement.textContent = fullMatch;
      fragment.appendChild(codeElement);
      
      lastIndex = matchIndex + fullMatch.length;
    });
    
    // Ajouter le texte restant
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      fragment.appendChild(document.createTextNode(remainingText));
    }
    
    // Remplacer le nœud de texte par le fragment
    node.parentNode?.replaceChild(fragment, node);
  }
  
  // Fonction récursive pour parcourir tous les nœuds
  function walkNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node as Text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Ignorer les éléments qui ne doivent pas être traités
      if (element.tagName === 'CODE' || 
          element.tagName === 'PRE' || 
          element.classList.contains('path-code') ||
          element.closest('code') ||
          element.closest('pre')) {
        return;
      }
      
      // Traiter tous les nœuds enfants
      const children = Array.from(element.childNodes);
      children.forEach(child => walkNode(child));
    }
  }
  
  // Commencer le traitement
  walkNode(element);
}

/**
 * Formate les paths dans tous les éléments markdown de la page
 */
export function formatAllPaths(): void {
  // Sélecteurs pour tous les contextes markdown
  const selectors = [
    '.markdown-body',
    '.public-note-container .markdown-body',
    '.public-note-content-wrapper .markdown-body',
    '.ProseMirror',
    '.editor-content'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        formatPathsInElement(element);
      }
    });
  });
}

/**
 * Initialise le formatage automatique des paths
 * À appeler après le rendu du contenu markdown
 */
export function initPathFormatting(): void {
  // Formater immédiatement
  formatAllPaths();
  
  // Observer les changements dans le DOM pour formater les nouveaux contenus
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Vérifier si c'est un élément markdown
          if (element.matches('.markdown-body, .ProseMirror, .editor-content') ||
              element.closest('.markdown-body, .ProseMirror, .editor-content')) {
            formatPathsInElement(element as HTMLElement);
          }
        }
      });
    });
  });
  
  // Observer tous les changements dans le body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
