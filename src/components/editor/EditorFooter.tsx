import React from 'react';
import './editor-footer.css';

interface EditorFooterProps {
  lastSaved: Date | null;
  wordCount: number;
  getRelativeTime: (date: Date | null) => string;
  getWordCount: () => number;
}

/**
 * Footer fixe de l'éditeur : infos de sauvegarde, compteur de mots, etc.
 */
const EditorFooter: React.FC<EditorFooterProps> = ({ 
  lastSaved, 
  wordCount, 
  getRelativeTime, 
  getWordCount 
}) => {
  return (
    <footer className="editor-footer-fixed">
      <div className="editor-footer-left">
        Last Saved : {getRelativeTime(lastSaved)}
      </div>
      <div className="editor-footer-right">
        {getWordCount()} words
      </div>
    </footer>
  );
};

export default EditorFooter; 