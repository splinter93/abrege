import React from 'react';

interface EditorLayoutProps {
  header?: React.ReactNode;
  title?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Layout minimaliste : header en haut, padding, titre centré, padding, texte centré, footer optionnel.
 */
const EditorLayout: React.FC<EditorLayoutProps> = ({ header, title, content, footer }) => {
  return (
    <div className="editor-layout" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      minHeight: '100vh',
      background: 'var(--surface-1)',
      padding: 0,
      position: 'relative',
    }}>
      {header}
      {title && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
          <div style={{ width: '100%', maxWidth: 750 }}>{title}</div>
        </div>
      )}
      {content && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
          <div style={{ width: '100%', maxWidth: 750 }}>{content}</div>
        </div>
      )}
      {footer}
    </div>
  );
};

export default EditorLayout; 