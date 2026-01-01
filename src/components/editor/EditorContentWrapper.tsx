/**
 * EditorContentWrapper - Wrapper CSS pour le contenu de l'éditeur
 * 
 * Simple wrapper pour appliquer les styles editor-content
 */

import React from 'react';
import './editor-content.css';

interface EditorContentWrapperProps {
  children: React.ReactNode;
}

const EditorContentWrapper: React.FC<EditorContentWrapperProps> = ({ children }) => {
  return (
    <div className="editor-content-wrapper">
      <div className="editor-content">
        {children}
      </div>
    </div>
  );
};

export default EditorContentWrapper;

