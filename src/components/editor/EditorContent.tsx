import React from 'react';
import './editor-content.css';

interface EditorContentProps {
  children?: React.ReactNode;
}

/**
 * Zone principale de contenu markdown (Tiptap/ProseMirror)
 * Simple wrapper - pas de classes layout (déjà dans EditorLayout parent)
 */
const EditorContent: React.FC<EditorContentProps> = ({ children }) => {
  return (
    <div className="editor-content markdown-body">
      {children}
    </div>
  );
};

export default EditorContent; 