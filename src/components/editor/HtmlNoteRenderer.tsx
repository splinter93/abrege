'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Code2, Eye } from 'lucide-react';

interface HtmlNoteRendererProps {
  htmlContent: string;
  className?: string;
  /** Controlled mode: parent manages source toggle */
  showSource?: boolean;
  /** Hide the internal toolbar (when parent renders its own) */
  hideToolbar?: boolean;
  /** Fill the entire available space (100% height) */
  fullscreen?: boolean;
  /** Called when user edits the source */
  onContentChange?: (newContent: string) => void;
}

const HtmlNoteRenderer: React.FC<HtmlNoteRendererProps> = ({
  htmlContent,
  className = '',
  showSource: controlledShowSource,
  hideToolbar = false,
  fullscreen = false,
  onContentChange,
}) => {
  const [internalShowSource, setInternalShowSource] = useState(false);
  const showSource = controlledShowSource ?? internalShowSource;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && !fullscreen) {
      const iframe = iframeRef.current;
      const handleResize = () => {
        try {
          const body = iframe.contentDocument?.body;
          if (body) {
            iframe.style.height = `${body.scrollHeight + 20}px`;
          }
        } catch {
          // cross-origin fallback
        }
      };
      iframe.addEventListener('load', handleResize);
      return () => iframe.removeEventListener('load', handleResize);
    }
  }, [htmlContent, fullscreen]);

  const isFullDocument = /^\s*<!doctype|^\s*<html/i.test(htmlContent);

  const iframeHtml = isFullDocument
    ? htmlContent
    : `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; ${fullscreen ? 'height: 100%;' : 'padding: 16px;'} }
</style>
</head><body>${htmlContent}</body></html>`;

  const rootClass = [
    'html-note-renderer',
    fullscreen ? 'html-note-renderer--fullscreen' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {!hideToolbar && (
        <div className="html-note-toolbar">
          <span className="html-note-badge">HTML</span>
          <button
            className="html-note-toggle"
            onClick={() => setInternalShowSource(prev => !prev)}
            title={showSource ? 'Aperçu' : 'Code source'}
          >
            {showSource ? <Eye size={14} /> : <Code2 size={14} />}
            {showSource ? 'Aperçu' : 'Source'}
          </button>
        </div>
      )}

      {showSource ? (
        <textarea
          className="html-note-source html-note-source--editable"
          value={htmlContent}
          onChange={(e) => onContentChange?.(e.target.value)}
          spellCheck={false}
          readOnly={!onContentChange}
        />
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={iframeHtml}
          sandbox="allow-scripts"
          className="html-note-iframe"
          title="HTML Note Preview"
        />
      )}
    </div>
  );
};

export default HtmlNoteRenderer;
