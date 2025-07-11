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
  const toc = extractTOCWithSlugs(markdownContent);
  // Mappe la TOC pour TableOfContents
  const headings = toc.map(h => ({ id: h.slug, text: h.title, level: h.level }));

  // Ajoute les IDs dans le HTML pour permettre le scrollTo
  const htmlWithIds = React.useMemo(() => {
    if (!headings.length) return htmlContent;
    let html = htmlContent;
    headings.forEach(h => {
      // Ajoute id="slug" sur le premier tag <hX> qui correspond au titre
      const regex = new RegExp(`<h${h.level}([^>]*)>(\\s*)${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*)<\\/h${h.level}>`, 'i');
      html = html.replace(regex, `<h${h.level}$1 id="${h.id}">$2${h.text}$3</h${h.level}>`);
    });
    return html;
  }, [htmlContent, headings]);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 64, overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
      {/* TOC à gauche */}
      <div style={{ flex: '0 0 300px', minWidth: 32, maxWidth: 300, marginRight: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <TableOfContents headings={headings} />
      </div>
      {/* Contenu principal */}
      <div style={{ flex: '1 1 750px', maxWidth: 750, minWidth: 0 }}>
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
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '0 auto', marginBottom: 32 }}>
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
        </div>
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
          dangerouslySetInnerHTML={{ __html: htmlWithIds }}
        />
      </div>
    </div>
  );
};

export default EditorPreview; 