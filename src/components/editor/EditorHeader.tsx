import React from 'react';
import './editor-header.css';

interface EditorHeaderProps {
  headerImageUrl?: string | null;
  onHeaderChange?: (url: string | null) => void;
  children?: React.ReactNode; // Pour la toolbar ou autres actions
}

/**
 * Header de l’éditeur : image d’en-tête + actions globales (toolbar, etc.)
 */
const EditorHeader: React.FC<EditorHeaderProps> = ({ headerImageUrl, onHeaderChange, children }) => {
  return (
    <div className="editor-header">
      {headerImageUrl && (
        <img
          src={headerImageUrl}
          alt="Header"
          className="editor-header-image-img"
        />
      )}
      <div className="editor-header-toolbar">
        {children}
      </div>
    </div>
  );
};

export default EditorHeader; 