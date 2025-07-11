import React from 'react';
import '@/styles/markdown.css';

interface EditorPreviewProps {
  title: string;
  htmlContent: string;
  headerImage?: string | null;
  titleAlign?: 'left' | 'center' | 'right';
}

const EditorPreview: React.FC<EditorPreviewProps> = ({ title, htmlContent, headerImage, titleAlign = 'left' }) => {
  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 64 }}>
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
      <div style={{ width: '100%', display: 'flex', justifyContent: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start', margin: '0 auto', marginBottom: 32 }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
          padding: 0,
          textAlign: titleAlign,
          maxWidth: 1200,
          width: '100%',
          lineHeight: 1.1,
          fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        }}>{title}</h1>
      </div>
      <div
        className="markdown-body"
        style={{
          maxWidth: 1200,
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
  );
};

export default EditorPreview; 