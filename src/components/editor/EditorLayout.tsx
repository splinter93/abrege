import React from 'react';
import A4PaginatedEditor from './A4PaginatedEditor';

interface EditorLayoutProps {
  header?: React.ReactNode;
  documentHeader?: React.ReactNode;
  title?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  layoutClassName?: string; // noteLayout variants: noImage | imageOnly | imageWithTitle
  a4Mode?: boolean;
}

/**
 * Layout minimaliste : header en haut, titre centré, contenu centré, footer optionnel.
 */
const EditorLayout: React.FC<EditorLayoutProps> = ({
  header,
  documentHeader,
  title,
  content,
  footer,
  layoutClassName,
  a4Mode = false,
}) => {
  const rootClass = layoutClassName ? layoutClassName : 'noteLayout noImage';
  const fallbackColorStyle: React.CSSProperties = {
    color: 'var(--editor-text-color, var(--color-text-primary, #B5BCC4))',
  };

  const documentContent = (
    <>
      {documentHeader}
      <div className="editor-content-wrapper">
        <div className="editor-content-inner">
          {title && (
            <div className="noteLayout-title" style={fallbackColorStyle}>
              {title}
            </div>
          )}
          {content && (
            <div className="noteLayout-content" style={fallbackColorStyle}>
              {content}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={`editor-layout editor-flex-column editor-full-width editor-full-height editor-bg-surface-1 ${rootClass}${a4Mode ? ' a4-mode' : ''}`}>
      {header}
      <div className="editor-layout__body">
        {a4Mode ? <A4PaginatedEditor>{documentContent}</A4PaginatedEditor> : documentContent}
      </div>
      {footer}
    </div>
  );
};

export default EditorLayout; 