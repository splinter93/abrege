import React from 'react';

interface EditorToolbarProps {
  children?: React.ReactNode; // Pour les boutons/actions
}

/**
 * Toolbar d’édition (actions de formatage, etc.)
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({ children }) => {
  return (
    <div className="editor-toolbar" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
      {children}
    </div>
  );
};

export default EditorToolbar; 