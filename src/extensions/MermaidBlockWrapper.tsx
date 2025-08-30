/**
 * Wrapper pour MermaidBlock dans l'éditeur Tiptap
 * Permet d'utiliser le composant MermaidBlock unifié dans les extensions
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import MermaidBlock from '@/components/mermaid/MermaidBlock';

interface MermaidBlockWrapperProps {
  content: string;
  className?: string;
}

/**
 * Composant wrapper pour MermaidBlock
 */
const MermaidBlockWrapper: React.FC<MermaidBlockWrapperProps> = ({ content, className = '' }) => {
  return (
    <MermaidBlock
      content={content}
      variant="editor"
      className={className}
      renderOptions={{
        timeout: 10000,
        retryCount: 1,
        showActions: true
      }}
    />
  );
};

/**
 * Fonction utilitaire pour créer un wrapper MermaidBlock dans le DOM
 * @param container Conteneur DOM où rendre le composant
 * @param content Contenu Mermaid
 * @param className Classe CSS optionnelle
 */
export function createMermaidBlockWrapper(
  container: HTMLElement, 
  content: string, 
  className: string = ''
): void {
  // Créer une racine React
  const root = createRoot(container);
  
  // Rendre le composant MermaidBlock
  root.render(
    <MermaidBlockWrapper 
      content={content} 
      className={className} 
    />
  );
}

/**
 * Fonction utilitaire pour nettoyer un wrapper MermaidBlock
 * @param container Conteneur DOM à nettoyer
 */
export function cleanupMermaidBlockWrapper(container: HTMLElement): void {
  // Vider le conteneur
  container.innerHTML = '';
}

export default MermaidBlockWrapper;
