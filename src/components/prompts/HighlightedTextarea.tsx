/**
 * Textarea avec coloration syntaxique des placeholders {…}
 * - {selection} → jaune ambre
 * - {autreArg}  → orange
 *
 * Technique : textarea transparent superposé sur un div miroir qui rend
 * le texte avec des <mark> colorés. Le div miroir doit avoir exactement
 * les mêmes dimensions / police / scroll que le textarea.
 */

'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import './HighlightedTextarea.css';

interface HighlightedTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  hasError?: boolean;
}

/** Transforme le texte brut en HTML coloré pour le div miroir. */
function buildHighlightedHtml(text: string): string {
  // Échappe les caractères HTML dangereux
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Wrap les {placeholders} avec des spans colorés
  return escaped.replace(/\{([^}]*)\}/g, (_, name: string) => {
    const isSelection = name === 'selection';
    const color = isSelection
      ? 'highlighted-placeholder--selection'
      : 'highlighted-placeholder--arg';
    return `<mark class="highlighted-placeholder ${color}">{${name}}</mark>`;
  });
}

export const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
  className = '',
  hasError = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const MIN_HEIGHT_PX = 200;   /* ~8 lignes */
  const MAX_HEIGHT_PX = 420;

  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const h = Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, el.scrollHeight));
    el.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    syncScroll();
  }, [value, syncScroll]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <div
      className={`highlighted-textarea-wrapper ${hasError ? 'highlighted-textarea-wrapper--error' : ''} ${className}`.trim()}
    >
      {/* Div miroir — rendu coloré, non interactif */}
      <div
        ref={mirrorRef}
        className="highlighted-textarea-mirror"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(value) + '\n' }}
      />

      {/* Textarea transparent par-dessus — interactif */}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        className="highlighted-textarea-input"
      />
    </div>
  );
};

export default HighlightedTextarea;
