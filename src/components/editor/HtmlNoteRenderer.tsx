'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Code2, Eye } from 'lucide-react';
import lowlight from '@/utils/lowlightInstance';
import { toHtml } from 'hast-util-to-html';

interface HtmlNoteRendererProps {
  htmlContent: string;
  className?: string;
  showSource?: boolean;
  hideToolbar?: boolean;
  fullscreen?: boolean;
  onContentChange?: (newContent: string) => void;
}

function highlightHtml(code: string): string {
  try {
    const lang = lowlight.registered('xml') ? 'xml' : null;
    const tree = lang ? lowlight.highlight(lang, code) : lowlight.highlightAuto(code);
    return toHtml(tree);
  } catch {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

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

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const highlightedHtml = useMemo(() => highlightHtml(htmlContent), [htmlContent]);

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
        <div className="html-note-source-wrapper">
          <pre
            ref={highlightRef}
            className="html-note-source-highlight hljs"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
          />
          <textarea
            ref={textareaRef}
            className="html-note-source html-note-source--editable html-note-source--overlay"
            value={htmlContent}
            onChange={(e) => onContentChange?.(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            readOnly={!onContentChange}
          />
        </div>
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
