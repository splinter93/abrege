/**
 * NotePreview - Affiche une note attachée dans un message
 * Style identique aux pills du ChatInput (avec icône plume)
 */

'use client';

import React, { memo } from 'react';
import { Feather } from 'react-feather';

interface AttachedNote {
  id: string;
  slug: string;
  title: string;
  word_count?: number;
}

interface NotePreviewProps {
  /**
   * La note à afficher
   */
  note: AttachedNote;
}

/**
 * Composant NotePreview
 * Affiche une pill avec icône plume (même style que ChatInput)
 */
const NotePreview: React.FC<NotePreviewProps> = memo(({ note }) => {
  return (
    <div 
      className="chat-note-pill"
      role="figure"
      aria-label={`Note attachée: ${note.title}`}
      title={`Note: ${note.title}${note.word_count ? ` (${note.word_count} mots)` : ''}`}
    >
      {/* Icône plume (comme dans ChatInput) */}
      <Feather size={14} />
      
      {/* Titre de la note */}
      <span className="chat-note-pill-title">
        {note.title}
      </span>
    </div>
  );
});

NotePreview.displayName = 'NotePreview';

export default NotePreview;

