/**
 * Hook orchestre le système de mentions @ dans le champ prompt_template.
 * Réutilise useInputDetection, useNoteSelectionWithTextarea, useMentionDeletion, useNoteSearch.
 * Pas de slash menu, pas d'attach, pas de usedPrompts.
 * Le MentionMenu est rendu via portal (position fixed) pour sortir du wrapper overflow:hidden.
 * @module hooks/usePromptTemplateMentions
 */

import { useState, useCallback } from 'react';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';
import type { SelectedNote } from './useNotesLoader';
import { useInputDetection } from './useInputDetection';
import { useNoteSearch } from './useNoteSearch';
import { useNoteSelectionWithTextarea } from './useNoteSelectionWithTextarea';
import { useMentionDeletion } from './useMentionDeletion';

interface UsePromptTemplateMentionsOptions {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  getAccessToken: () => Promise<string | null>;
}

interface UsePromptTemplateMentionsResult {
  mentions: NoteMention[];
  setMentions: (m: NoteMention[]) => void;
  showMentionMenu: boolean;
  /** Position fixed (viewport) pour rendu via portal */
  mentionMenuPosition: { top: number; left: number } | null;
  mentionSearchQuery: string;
  recentNotes: SelectedNote[];
  searchedNotes: SelectedNote[];
  isSearching: boolean;
  handleChange: (val: string) => void;
  handleSelectNote: (note: SelectedNote) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  closeMentionMenu: () => void;
  loadRecentNotes: () => Promise<void>;
}

export function usePromptTemplateMentions({
  value,
  onChange,
  textareaRef,
  getAccessToken,
}: UsePromptTemplateMentionsOptions): UsePromptTemplateMentionsResult {
  const [mentions, setMentions] = useState<NoteMention[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  // Position fixed (viewport coords) pour le portal
  const [mentionMenuPosition, setMentionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');

  const {
    noteSearchQuery,
    setNoteSearchQuery,
    recentNotes,
    searchedNotes,
    isSearching,
    loadRecentNotes,
  } = useNoteSearch({ getAccessToken });

  // No-ops pour les features non utilisées dans ce contexte
  const noop = useCallback(() => {}, []);
  const noopSetStr = useCallback((_: string) => {}, []);
  const noopSetPos = useCallback((_: { top: number; left: number } | null) => {}, []);
  const noopOpenMenu = useCallback((_: 'slash' | 'notes') => {}, []);
  // Setter no-op typé pour usedPrompts (useMentionDeletion attend ce type exact)
  const noopSetUsedPrompts = useCallback((_: PromptMention[]) => {}, []);

  /**
   * Convertit la position relative-textarea (calculée par useInputDetection)
   * en position fixed (viewport) en ajoutant getBoundingClientRect().
   * Permet au portal de se positionner précisément au-dessus du @.
   */
  const setMentionMenuPositionFixed = useCallback(
    (pos: { top: number; left: number } | null) => {
      if (!pos || !textareaRef.current) {
        setMentionMenuPosition(null);
        return;
      }
      const rect = textareaRef.current.getBoundingClientRect();
      setMentionMenuPosition({
        top: rect.top + pos.top,
        left: rect.left + pos.left,
      });
    },
    [textareaRef]
  );

  const { detectCommands } = useInputDetection({
    showNoteSelector: false,
    showSlashMenu: false,
    openMenu: noopOpenMenu,
    closeMenu: noop,
    setSlashQuery: noopSetStr,
    setNoteSearchQuery,
    setAtMenuPosition: noopSetPos,
    showMentionMenu,
    setShowMentionMenu,
    setMentionMenuPosition: setMentionMenuPositionFixed,
    setMentionSearchQuery,
    setSlashMenuPosition: noopSetPos,
    textareaRef,
  });

  const closeMentionMenu = useCallback(() => {
    setShowMentionMenu(false);
    setMentionSearchQuery('');
    setNoteSearchQuery('');
    setMentionMenuPosition(null);
  }, [setNoteSearchQuery]);

  const { handleSelectNoteWithTextarea } = useNoteSelectionWithTextarea({
    message: value,
    setMessage: onChange,
    mentions,
    setMentions,
    textareaRef,
    closeMenu: noop,
    setNoteSearchQuery,
    mode: 'mention',
    onCloseMentionMenu: closeMentionMenu,
  });

  // Suppression atomique des mentions (Backspace/Delete)
  const { handleKeyDown: handleDeletionKeyDown } = useMentionDeletion({
    message: value,
    setMessage: onChange,
    mentions,
    setMentions,
    usedPrompts: [],
    setUsedPrompts: noopSetUsedPrompts,
    textareaRef,
  });

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      const el = textareaRef.current;
      if (el) {
        // Déclencher la détection après la mise à jour React
        requestAnimationFrame(() => {
          detectCommands(val, el.selectionStart);
        });
      }
    },
    [onChange, textareaRef, detectCommands]
  );

  const handleSelectNote = useCallback(
    (note: SelectedNote) => {
      handleSelectNoteWithTextarea(note);
    },
    [handleSelectNoteWithTextarea]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Laisser le MentionMenu gérer les touches de navigation (ArrowUp/Down/Enter/Esc)
      // via son propre listener sur window — ici on gère uniquement la suppression atomique
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter' && e.key !== 'Escape') {
        handleDeletionKeyDown(e);
      }
    },
    [handleDeletionKeyDown]
  );

  return {
    mentions,
    setMentions,
    showMentionMenu,
    mentionMenuPosition,
    mentionSearchQuery,
    recentNotes,
    searchedNotes,
    isSearching,
    handleChange,
    handleSelectNote,
    handleKeyDown,
    closeMentionMenu,
    loadRecentNotes,
  };
}
