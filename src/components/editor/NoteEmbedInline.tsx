/**
 * NoteEmbedInline - Mention inline style
 * 
 * Affichage compact inline avec icône plume + titre
 * Utilisable dans paragraphes, tableaux, listes
 * 
 * Style: Comme code inline mais pour notes
 * 
 * @module components/editor/NoteEmbedInline
 */

import React from 'react';
import { Feather } from 'lucide-react';
import { useNoteEmbedMetadata } from '@/hooks/useNoteEmbedMetadata';
import { simpleLogger as logger } from '@/utils/logger';
import '@/styles/note-embed/note-embed-inline.css';

interface NoteEmbedInlineProps {
  /** ID ou slug de la note */
  noteRef: string;
  /** Titre optionnel (override) */
  noteTitle?: string | null;
}

/**
 * Composant inline pour mention de note
 * Usage: Dans du texte, tableaux, listes
 */
export default function NoteEmbedInline({ noteRef, noteTitle }: NoteEmbedInlineProps) {
  
  // Charger les métadonnées de la note
  const { note, loading, error } = useNoteEmbedMetadata({ noteRef });

  /**
   * Handler pour ouvrir la note dans un nouvel onglet
   */
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!note?.public_url) {
      logger.warn('[NoteEmbedInline] ⚠️  Pas d\'URL publique', { noteRef });
      return;
    }
    
    // Ouvrir dans nouvel onglet
    window.open(note.public_url, '_blank', 'noopener,noreferrer');
    
    logger.dev('[NoteEmbedInline] 🔗 Ouverture note:', {
      noteRef,
      url: note.public_url
    });
  };

  // Déterminer le titre à afficher
  const displayTitle = noteTitle || note?.title || noteRef;

  // Loading state
  if (loading) {
    return (
      <span className="note-embed-inline note-embed-inline-loading">
        <Feather size={14} className="note-embed-inline-icon" />
        <span className="note-embed-inline-title">Chargement...</span>
      </span>
    );
  }

  // Error state
  if (error || !note) {
    return (
      <span className="note-embed-inline note-embed-inline-error">
        <Feather size={14} className="note-embed-inline-icon" />
        <span className="note-embed-inline-title">{displayTitle}</span>
        <span className="note-embed-inline-error-badge" title={error || 'Note introuvable'}>
          ⚠️
        </span>
      </span>
    );
  }

  // Success state
  return (
    <span 
      className="note-embed-inline"
      onClick={handleClick}
      title={`Ouvrir: ${note.title}`}
    >
      <Feather size={14} className="note-embed-inline-icon" />
      <span className="note-embed-inline-title">{displayTitle}</span>
    </span>
  );
}

