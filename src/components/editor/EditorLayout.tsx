import React from 'react';

interface EditorLayoutProps {
  header?: React.ReactNode;
  title?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Layout minimaliste : header en haut, padding, titre centré, padding, texte centré, footer optionnel.
 */
const EditorLayout: React.FC<EditorLayoutProps> = ({ header, title, content, footer }) => {
  return (
    <div className="editor-layout editor-flex-column editor-flex-center editor-full-width editor-full-height editor-bg-surface-1">
      {header}
      {title && (
        <div className="editor-full-width editor-flex-center editor-padding-top-large">
          <div className="editor-container-width">{title}</div>
        </div>
      )}
      {content && (
        <div className="editor-full-width editor-flex-center editor-padding-top-medium">
          <div className="editor-container-width">{content}</div>
        </div>
      )}
      {footer}
    </div>
  );
};

export default EditorLayout; 