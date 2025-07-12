import React from 'react';
import '../../styles/markdown.css';

interface EditorContentProps {
  children?: React.ReactNode;
}

/**
 * Zone principale de contenu markdown (Tiptap/ProseMirror)
 */
const EditorContent: React.FC<EditorContentProps> = ({ children }) => {
  return (
    <div className="editor-content-wrapper markdown-body" style={{ width: 750, margin: 0, display: 'block', textAlign: 'left' }}>
      {children}
    </div>
  );
};

export default EditorContent; 