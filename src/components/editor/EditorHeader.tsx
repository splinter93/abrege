import React from 'react';
import './editor-header.css';

interface EditorHeaderProps {
  headerImageUrl?: string | null;
  children?: React.ReactNode; // Pour la toolbar ou autres actions
}

/**
 * Header de l'éditeur : image d'en-tête + actions globales (toolbar, etc.)
 */
const EditorHeader: React.FC<EditorHeaderProps> = ({ headerImageUrl, children }) => {
  return (
    <header className="editor-header" role="banner" aria-label="En-tête de l'éditeur">
      {headerImageUrl && (
        <img
          src={headerImageUrl}
          alt="Image d'en-tête"
          className="editor-header-image-img"
        />
      )}
      <div className="editor-header-toolbar" role="toolbar" aria-label="Barre d'outils">
        {children}
      </div>
    </header>
  );
};

export default EditorHeader; 