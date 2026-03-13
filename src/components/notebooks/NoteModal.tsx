'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import NoteViewer from './NoteViewer';
import './NoteModal.css';

interface NoteModalProps {
  noteRef: string | null;
  onClose: () => void;
}

export default function NoteModal({ noteRef, onClose }: NoteModalProps) {
  useEffect(() => {
    if (!noteRef) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [noteRef, onClose]);

  useEffect(() => {
    if (!noteRef) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [noteRef]);

  if (!noteRef) return null;

  return createPortal(
    <div className="note-modal-overlay" onClick={onClose}>
      <div
        className="note-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Note en fenêtre modale"
      >
        <div className="note-modal-body">
          <NoteViewer noteRef={noteRef} onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
}
