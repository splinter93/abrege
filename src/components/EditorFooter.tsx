import React from 'react';

interface EditorFooterProps {
  lastSaved: Date | null;
  wordCount: string;
  formatTimeAgo: (date: Date) => string;
}

const EditorFooter: React.FC<EditorFooterProps> = ({ lastSaved, wordCount, formatTimeAgo }) => {
  return (
    <div className="editor-footer" style={{ width: '100%', maxWidth: 1600, margin: '24px auto 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-3)', fontSize: 14, padding: '0 1.5rem' }}>
      <div className="editor-time">
        {lastSaved && (
          <>Dernière modification : {formatTimeAgo(lastSaved)}</>
        )}
      </div>
      <div className="editor-stats">
        <span id="word-count">{wordCount} mots</span>
      </div>
    </div>
  );
};

export default EditorFooter; 