import React from 'react';
import '@/styles/markdown.css';
import TableOfContents from './TableOfContents';
import { extractTOCWithSlugs } from '../utils/markdownTOC';

interface EditorPreviewProps {
  title: string;
  htmlContent: string;
  headerImage?: string | null;
  titleAlign?: 'left' | 'center' | 'right';
  markdownContent?: string;
}

const EditorPreview: React.FC<EditorPreviewProps> = ({ title, htmlContent, headerImage, titleAlign = 'left', markdownContent = '' }) => {
  // Génère la TOC à partir du markdown
  const tocHeadings = React.useMemo(() => {
    return extractTOCWithSlugs(markdownContent).map(h => ({
      id: h.slug,
      text: h.title,
      level: h.level
    }));
  }, [markdownContent]);

  // Calculer la hauteur du header image pour placer la TOC juste en dessous
  const headerHeight = headerImage ? 300 : 0;

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 64, overflowY: 'auto', height: '100vh' }}>
      {headerImage && (
        <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden', marginBottom: 32 }}>
          <img
            src={headerImage}
            alt="Header"
            style={{ width: '100%', objectFit: 'cover', maxHeight: 300, borderRadius: 0 }}
            draggable={false}
          />
        </div>
      )}
      {/* TOC collée à droite */}
      <div style={{ position: 'fixed', top: headerHeight + 32, right: 0, zIndex: 100, minWidth: 32, maxWidth: 300, padding: '24px 18px 24px 0', boxSizing: 'border-box' }}>
        <TableOfContents headings={tocHeadings} />
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', margin: '0 auto', marginBottom: 32, gap: 32 }}>
        <div style={{ maxWidth: 'var(--editor-content-width)', width: 'var(--editor-content-width)' }}>
          <h1 style={{
            fontSize: 'var(--editor-title-size)',
            fontWeight: 700,
            color: 'var(--editor-text-color)',
            margin: 0,
            padding: 0,
            textAlign: titleAlign,
            maxWidth: 'var(--editor-content-width)',
            width: 'var(--editor-content-width)',
            lineHeight: 1.1,
            fontFamily: 'var(--editor-font-family)',
          }}>{title}</h1>
          <div style={{ height: 18 }} />
          <div
            className="markdown-body"
            style={{
              maxWidth: 'var(--editor-content-width)',
              width: 'var(--editor-content-width)',
              margin: '0 auto',
              background: 'none',
              padding: '0 0 64px 0',
              fontSize: 'var(--editor-body-size)',
              color: 'var(--editor-text-color)',
              minHeight: '60vh',
              pointerEvents: 'none',
              userSelect: 'text',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPreview; 