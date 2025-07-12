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
    <div className="editor-header" style={{ width: '100%', position: 'relative', marginBottom: 24 }}>
      {headerImageUrl && (
        <img
          src={headerImageUrl}
          alt="Header"
          style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 0 }}
        />
      )}
      <div className="editor-header-toolbar" style={{ position: 'absolute', top: 16, right: 24 }}>
        {children}
      </div>
    </div>
  );
};

export default EditorHeader; 