import React from 'react';
import Link from 'next/link';
import './editor-header.css';

interface EditorHeaderProps {
  headerImageUrl?: string | null;
  children?: React.ReactNode; // Toolbar or other center actions
  rightSlot?: React.ReactNode; // Actions aligned to the right
}

/**
 * Header de l'éditeur : image d'en-tête + actions globales (toolbar, etc.)
 */
const EditorHeader: React.FC<EditorHeaderProps> = ({ headerImageUrl, children, rightSlot }) => {
  return (
    <header className="editor-header" role="banner" aria-label="En-tête de l'éditeur">
      {/* Logo gauche → home */}
      <Link href="/" className="editor-header-logo" aria-label="Aller à l’accueil">
        <img src="/logo scrivia white.png" alt="Scrivia" width={90} height={25} />
      </Link>
      {headerImageUrl && (
        <img
          src={headerImageUrl}
          alt="Image d'en-tête"
          className="editor-header-image-img"
        />
      )}
      <div className="editor-header-toolbar-center">
        <div className="editor-header-toolbar" role="toolbar" aria-label="Barre d'outils">
          {children}
        </div>
      </div>
      {rightSlot && (
        <div className="editor-header-right" aria-label="Actions">
          {rightSlot}
        </div>
      )}
    </header>
  );
};

export default EditorHeader; 