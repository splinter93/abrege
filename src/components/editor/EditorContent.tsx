import React from 'react';
import './editor-content.css';
import '@/styles/markdown.css';

interface EditorContentProps {
  children?: React.ReactNode;
}

/**
 * Zone principale de contenu markdown (Tiptap/ProseMirror)
 */
const EditorContent: React.FC<EditorContentProps> = ({ children }) => {
  return (
    <div className="editor-content-wrapper markdown-body editor-container-width editor-text-left">
      {children}
    </div>
  );
};

export default EditorContent; 