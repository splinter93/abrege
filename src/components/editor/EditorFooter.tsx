import React from 'react';
import './editor-footer.css';

interface EditorFooterProps {
  lastSaved?: Date | null;
  wordCount?: string;
}

/**
 * Footer de l'éditeur : infos de sauvegarde, compteur de mots, etc.
 */
const EditorFooter: React.FC<EditorFooterProps> = ({ lastSaved, wordCount }) => {
  return (
    <footer className="editor-footer editor-container-width editor-margin-top-large editor-text-right">
      <div>
        {wordCount && <span className="editor-margin-right-medium">{wordCount}</span>}
        {lastSaved && <span>Dernière sauvegarde : {lastSaved.toLocaleTimeString()}</span>}
      </div>
    </footer>
  );
};

export default EditorFooter; 