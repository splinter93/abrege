import React from 'react';

interface EditorToolbarProps {
  children?: React.ReactNode; // Pour les boutons/actions
}

/**
 * Toolbar d'édition (actions de formatage, etc.)
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({ children }) => {
  return (
    <div className="editor-toolbar editor-full-width editor-flex-center editor-margin-standard">
      {children}
    </div>
  );
};

export default EditorToolbar; 