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
    <div className={`editor-layout editor-flex-column editor-full-width editor-full-height editor-bg-surface-1 ${rootClass}`}>
      {header}
      <div className="editor-content-wrapper">
        <div className="editor-content-inner">
          {title && (
            <div className="noteLayout-title">
              {title}
            </div>
          )}
          {content && (
            <div className="noteLayout-content">
              {content}
            </div>
          )}
        </div>
      </div>
      {footer}
    </div>
  );
};

export default EditorLayout; 