/**
 * Textarea avec coloration syntaxique des placeholders {…} et mentions @slug.
 * - {selection} → ambre
 * - {autreArg}  → orange
 * - @slug       → violet
 *
 * Technique : textarea transparent superposé sur un div miroir qui rend
 * le texte avec des <mark> colorés. Le div miroir doit avoir exactement
 * les mêmes dimensions / police / scroll que le textarea.
 */

'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { NoteMention } from '@/types/noteMention';
import type { SelectedNote } from '@/hooks/useNotesLoader';
import MentionMenu from '@/components/chat/MentionMenu';
import './HighlightedTextarea.css';

const MIN_HEIGHT_PX = 200;
const MAX_HEIGHT_PX = 420;

interface HighlightedTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  hasError?: boolean;
  /** Ref exposée pour le contrôle externe (mentions, cursor) */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Mentions actives (pour @slug highlighting) */
  mentions?: NoteMention[];
  /** Handler keyDown externe (suppression atomique mentions) */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Afficher le MentionMenu */
  showMentionMenu?: boolean;
  /** Position du MentionMenu */
  mentionMenuPosition?: { top: number; left: number } | null;
  /** Query de recherche pour le MentionMenu */
  mentionSearchQuery?: string;
  /** Notes récentes pour le MentionMenu */
  recentNotes?: SelectedNote[];
  /** Notes trouvées par recherche */
  searchedNotes?: SelectedNote[];
  /** Indicateur de recherche */
  isSearching?: boolean;
  /** Callback sélection note */
  onSelectNote?: (note: SelectedNote) => void;
  /** Callback fermeture menu */
  onCloseMentionMenu?: () => void;
}

/** Slugs valides (de mentions[]) pour les distinguer des @ random dans le texte */
function buildMentionSlugs(mentions: NoteMention[]): Set<string> {
  return new Set(mentions.map((m) => m.slug));
}

/** Transforme le texte brut en HTML coloré pour le div miroir. */
function buildHighlightedHtml(text: string, mentionSlugs: Set<string>): string {
  // Échappe les caractères HTML dangereux
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Wrap les {placeholders} — avant @ pour éviter conflits
  let result = escaped.replace(/\{([^}]*)\}/g, (_, name: string) => {
    const cls = name === 'selection'
      ? 'highlighted-placeholder--selection'
      : 'highlighted-placeholder--arg';
    return `<mark class="highlighted-placeholder ${cls}">{${name}}</mark>`;
  });

  // 2. Wrap les @slug mentionnés (uniquement ceux dans mentions[])
  if (mentionSlugs.size > 0) {
    // Escape les slugs pour usage dans regex
    const escapedSlugs = Array.from(mentionSlugs).map((s) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const slugPattern = escapedSlugs.join('|');
    // Lookahead large : espace, fin de ligne, balises HTML échappées, {, } ou fin de chaîne
    const mentionRegex = new RegExp(`@(${slugPattern})(?=[\\s{}&]|$|&lt;|&gt;|&amp;|<)`, 'g');
    result = result.replace(mentionRegex, (_, slug: string) =>
      `<mark class="highlighted-placeholder highlighted-placeholder--mention">@${slug}</mark>`
    );
  }

  return result;
}

export const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
  className = '',
  hasError = false,
  textareaRef: externalRef,
  mentions = [],
  onKeyDown,
  showMentionMenu = false,
  mentionMenuPosition = null,
  mentionSearchQuery = '',
  recentNotes = [],
  searchedNotes = [],
  isSearching = false,
  onSelectNote,
  onCloseMentionMenu,
}) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const mirrorRef = useRef<HTMLDivElement>(null);

  const mentionSlugs = buildMentionSlugs(mentions);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [textareaRef]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const h = Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, el.scrollHeight));
    el.style.height = `${h}px`;
  }, [textareaRef]);

  useEffect(() => {
    syncScroll();
  }, [value, syncScroll]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(e);
    },
    [onKeyDown]
  );

  return (
    <div
      className={`highlighted-textarea-wrapper ${hasError ? 'highlighted-textarea-wrapper--error' : ''} ${className}`.trim()}
    >
      {/* Div miroir — rendu coloré, non interactif */}
      <div
        ref={mirrorRef}
        className="highlighted-textarea-mirror"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(value, mentionSlugs) + '\n' }}
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
        onKeyDown={handleKeyDown}
        className="highlighted-textarea-input"
      />

      {/* MentionMenu via portal — position: fixed, hors du wrapper overflow:hidden */}
      {onSelectNote && onCloseMentionMenu && showMentionMenu && mentionMenuPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, pointerEvents: 'none', width: '100vw', height: '100vh' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <MentionMenu
                show={showMentionMenu}
                searchQuery={mentionSearchQuery}
                recentNotes={recentNotes}
                searchedNotes={searchedNotes}
                isSearching={isSearching}
                position={mentionMenuPosition}
                onSelectNote={onSelectNote}
                onClose={onCloseMentionMenu}
              />
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
};

export default HighlightedTextarea;
