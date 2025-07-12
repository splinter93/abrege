import React from 'react';
import './editor-footer.css';

interface EditorFooterProps {
  lastSaved?: Date | null;
  wordCount?: string;
}

/**
 * Footer de l’éditeur : infos de sauvegarde, compteur de mots, etc.
 */
const EditorFooter: React.FC<EditorFooterProps> = ({ lastSaved, wordCount }) => {
  return (
    <footer className="editor-footer" style={{ width: 750, margin: '32px auto 0 auto', color: 'var(--text-3)', fontSize: 15, textAlign: 'right' }}>
      <div>
        {wordCount && <span style={{ marginRight: 18 }}>{wordCount}</span>}
        {lastSaved && <span>Dernière sauvegarde : {lastSaved.toLocaleTimeString()}</span>}
      </div>
    </footer>
  );
};

export default EditorFooter; 