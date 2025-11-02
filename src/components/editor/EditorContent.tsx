import React from 'react';
import './editor-content.css';
import '@/styles/unified-markdown.css';

interface EditorContentProps {
  children?: React.ReactNode;
}

/**
 * Zone principale de contenu markdown (Tiptap/ProseMirror)
 */
const EditorContent: React.FC<EditorContentProps> = ({ children }) => {
  return (
    <div className="editor-content-wrapper markdown-body editor-container-width editor-text-left" style={{ maxWidth: 'var(--editor-content-width)', width: 'var(--editor-content-width)', margin: '0 auto' }}>
      <div className="editor-content">
        {children}
      </div>
    </div>
  );
};

export default EditorContent; 