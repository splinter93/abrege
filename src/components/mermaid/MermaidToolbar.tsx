/**
 * Composant MermaidToolbar unifié
 * Barre d'outils pour les diagrammes Mermaid avec type, boutons et actions
 */

"use client";

import React, { useState } from 'react';
import { getMermaidDiagramType } from '@/components/chat/mermaidService';
import './MermaidToolbar.css';

export interface MermaidToolbarProps {
  /** Contenu Mermaid pour détecter le type */
  content: string;
  /** Variante d'affichage (editor ou chat) */
  variant?: 'editor' | 'chat';
  /** Afficher le bouton copier */
  showCopy?: boolean;
  /** Afficher le bouton agrandir */
  showExpand?: boolean;
  /** Afficher le bouton éditer */
  showEdit?: boolean;
  /** Callback pour la copie */
  onCopy?: () => void;
  /** Callback pour l'agrandissement */
  onExpand?: () => void;
  /** Callback pour l'édition */
  onEdit?: () => void;
  /** Classe CSS optionnelle */
  className?: string;
}

/**
 * Composant MermaidToolbar
 * Affiche le type de diagramme et les boutons d'action
 */
const MermaidToolbar: React.FC<MermaidToolbarProps> = ({
  content,
  variant = 'editor',
  showCopy = true,
  showExpand = true,
  showEdit = true,
  onCopy,
  onExpand,
  onEdit,
  className = ''
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Détecter le type de diagramme
  const diagramType = getMermaidDiagramType(content);

  // Gestion de la copie
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onCopy?.();
    });
  };

  // Classes CSS dynamiques
  const toolbarClasses = [
    'mermaid-toolbar',
    `mermaid-toolbar-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={toolbarClasses}>
      {/* Type de diagramme à gauche */}
      <div className="mermaid-toolbar-type">
        <span className="mermaid-toolbar-diagram-type">{diagramType}</span>
      </div>

      {/* Boutons d'action à droite */}
      <div className="mermaid-toolbar-actions">
        {/* Bouton Éditer */}
        {showEdit && (
          <button
            onClick={onEdit}
            className="mermaid-toolbar-btn mermaid-edit-btn"
            title="Éditer le diagramme"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}

        {/* Bouton Copier */}
        {showCopy && (
          <button
            onClick={handleCopy}
            className="mermaid-toolbar-btn mermaid-copy-btn"
            title="Copier le code"
          >
            {isCopied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        )}

        {/* Bouton Agrandir */}
        {showExpand && (
          <button
            onClick={onExpand}
            className="mermaid-toolbar-btn mermaid-expand-btn"
            title="Agrandir le diagramme"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default MermaidToolbar;
