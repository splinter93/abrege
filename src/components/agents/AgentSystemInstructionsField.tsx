/**
 * Champ instructions système avec mentions @note (même stack que l’éditeur de prompts).
 * @module components/agents/AgentSystemInstructionsField
 */

'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { NoteMention } from '@/types/noteMention';
import { useAuth } from '@/hooks/useAuth';
import { usePromptTemplateMentions } from '@/hooks/usePromptTemplateMentions';
import HighlightedTextarea from '@/components/prompts/HighlightedTextarea';
import { areNoteMentionListsEqual } from '@/utils/noteMentionListsEqual';

/** Le wrapper HighlightedTextarea applique déjà bordure / fond (voir HighlightedTextarea.css). */
const WRAPPER_CLASS = 'w-full';

export interface AgentSystemInstructionsFieldProps {
  id?: string;
  value: string;
  /** Mentions chargées depuis l’agent (sync quand l’ensemble des slugs change côté parent) */
  initialMentions?: NoteMention[];
  onChange: (value: string) => void;
  onMentionsChange: (mentions: NoteMention[]) => void;
  placeholder?: string;
  rows?: number;
}

export function AgentSystemInstructionsField({
  id = 'agent-system-instructions',
  value,
  initialMentions,
  onChange,
  onMentionsChange,
  placeholder = "Définissez précisément le comportement, la voix, les contraintes et les objectifs de l'agent.",
  rows = 12,
}: AgentSystemInstructionsFieldProps) {
  const { getAccessToken } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onMentionsChangeRef = useRef(onMentionsChange);
  onMentionsChangeRef.current = onMentionsChange;

  const mentionSystem = usePromptTemplateMentions({
    value,
    onChange,
    textareaRef,
    getAccessToken,
    initialMentions,
  });

  const {
    setMentions,
    mentions,
    loadRecentNotes,
    showMentionMenu,
    handleChange,
    handleKeyDown,
    mentionMenuPosition,
    mentionSearchQuery,
    recentNotes,
    searchedNotes,
    isSearching,
    handleSelectNote,
    closeMentionMenu,
  } = mentionSystem;

  const slugsKey = useMemo(
    () => (initialMentions ?? []).map((m) => m.slug).sort().join('\0'),
    [initialMentions]
  );

  useEffect(() => {
    setMentions(initialMentions ?? []);
    // Re-sync uniquement quand le jeu de slugs fourni par le parent change (chargement agent, annuler, etc.)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- éviter les resets à chaque render si le parent recrée le tableau
  }, [slugsKey, setMentions]);

  /** Ne notifier le parent que si l’état local diverge des props (évite [] au mount + écrasement async). */
  useEffect(() => {
    if (areNoteMentionListsEqual(mentions, initialMentions)) {
      return;
    }
    onMentionsChangeRef.current(mentions);
  }, [mentions, initialMentions]);

  useEffect(() => {
    if (showMentionMenu) {
      void loadRecentNotes();
    }
  }, [showMentionMenu, loadRecentNotes]);

  return (
    <HighlightedTextarea
      id={id}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={rows}
      className={WRAPPER_CLASS}
      textareaRef={textareaRef}
      mentions={mentions}
      onKeyDown={handleKeyDown}
      showMentionMenu={showMentionMenu}
      mentionMenuPosition={mentionMenuPosition}
      mentionSearchQuery={mentionSearchQuery}
      recentNotes={recentNotes}
      searchedNotes={searchedNotes}
      isSearching={isSearching}
      onSelectNote={handleSelectNote}
      onCloseMentionMenu={closeMentionMenu}
    />
  );
}

export default AgentSystemInstructionsField;
