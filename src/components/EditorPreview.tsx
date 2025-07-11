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

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 64, overflowY: 'auto', height: '100vh' }}>
      {headerImage && (
        <div style={{ width: '100%', maxHeight: 320, overflow: 'hidden', marginBottom: 32 }}>
          <img
            src={headerImage}
            alt="Header"
            style={{ width: '100%', objectFit: 'cover', maxHeight: 320, borderRadius: 0 }}
            draggable={false}
          />
        </div>
      )}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', margin: '0 auto', marginBottom: 32, gap: 32 }}>
        <div style={{ maxWidth: 750, width: 750 }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            padding: 0,
            textAlign: titleAlign,
            maxWidth: 750,
            width: 750,
            lineHeight: 1.1,
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
          }}>{title}</h1>
          <div
            className="markdown-body"
            style={{
              maxWidth: 750,
              width: 750,
              margin: '0 auto',
              background: 'none',
              padding: '0 0 64px 0',
              fontSize: '1.13rem',
              color: 'var(--text-primary)',
              minHeight: '60vh',
              pointerEvents: 'none',
              userSelect: 'text',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
        <div style={{ minWidth: 32, maxWidth: 300, flex: '0 0 auto', marginLeft: 16 }}>
          <TableOfContents headings={tocHeadings} />
        </div>
      </div>
    </div>
  );
};

export default EditorPreview; 