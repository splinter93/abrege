import React from 'react';

interface EditorLayoutProps {
  header?: React.ReactNode;
  title?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  layoutClassName?: string; // noteLayout variants: noImage | imageOnly | imageWithTitle
}

/**
 * Layout minimaliste : header en haut, titre centré, contenu centré, footer optionnel.
 */
const EditorLayout: React.FC<EditorLayoutProps> = ({ header, title, content, footer, layoutClassName }) => {
  const rootClass = layoutClassName ? layoutClassName : 'noteLayout noImage';
  return (
    <div className={`editor-layout editor-flex-column editor-flex-center editor-full-width editor-full-height editor-bg-surface-1 ${rootClass}`}>
      {header}
      {title && (
        <div className="editor-full-width editor-flex-center noteLayout-title">
          <div className="editor-container-width" style={{ maxWidth: 'var(--editor-content-width)', width: 'var(--editor-content-width)' }}>{title}</div>
        </div>
      )}
      {content && (
        <div className="editor-full-width editor-flex-center noteLayout-content">
          <div className="editor-container-width" style={{ maxWidth: 'var(--editor-content-width)', width: 'var(--editor-content-width)' }}>{content}</div>
        </div>
      )}
      {footer}
    </div>
  );
};

export default EditorLayout; 