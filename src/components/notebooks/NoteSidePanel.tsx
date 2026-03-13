'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import NoteViewer from './NoteViewer';
import './NoteSidePanel.css';

interface NoteSidePanelProps {
  noteRef: string | null;
  onClose: () => void;
}

const PANEL_WIDTH = 640;

export default function NoteSidePanel({ noteRef, onClose }: NoteSidePanelProps) {
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
    <>
      <div className="note-side-panel-backdrop" onClick={onClose} aria-hidden />
      <aside
        className="note-side-panel"
        style={{ width: PANEL_WIDTH }}
        role="dialog"
        aria-modal="true"
        aria-label="Note en panneau latéral"
      >
        <div className="note-side-panel-content">
          <NoteViewer noteRef={noteRef} onClose={onClose} />
        </div>
      </aside>
    </>,
    document.body
  );
}
