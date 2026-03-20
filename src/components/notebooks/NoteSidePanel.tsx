'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import NoteViewer from './NoteViewer';
import './NoteSidePanel.css';

const STORAGE_KEY = 'noteSidePanelWidth';
const DEFAULT_WIDTH = 640;
const MIN_WIDTH = 320;
const MAX_WIDTH = 90; // % of viewport

function getStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const v = localStorage.getItem(STORAGE_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= MIN_WIDTH ? n : DEFAULT_WIDTH;
}

function clampWidth(w: number): number {
  const max = typeof window !== 'undefined' ? (window.innerWidth * MAX_WIDTH) / 100 : 1200;
  return Math.round(Math.min(max, Math.max(MIN_WIDTH, w)));
}

interface NoteSidePanelProps {
  noteRef: string | null;
  onClose: () => void;
}

export default function NoteSidePanel({ noteRef, onClose }: NoteSidePanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // Garde la dernière ref active pendant l'animation de fermeture
  const activeNoteRef = useRef<string | null>(noteRef);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (noteRef) {
      activeNoteRef.current = noteRef;
      setIsClosing(false);
      setWidth(getStoredWidth());
    } else {
      // noteRef est devenu null (parent a confirmé la fermeture) → reset pour unmount propre
      setIsClosing(false);
    }
  }, [noteRef]);

  // Déclenche l'animation de fermeture puis appelle onClose
  const triggerClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLElement>) => {
    if (isClosing && e.animationName === 'notePanelSlideOut') {
      onCloseRef.current();
    }
  }, [isClosing]);

  const widthRef = useRef(width);
  widthRef.current = width;

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widthRef.current;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const next = clampWidth(startW + delta);
      setWidth(next);
    };

    const onUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    };

    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    if (!noteRef) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [noteRef, triggerClose]);

  useEffect(() => {
    if (!noteRef) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [noteRef]);

  if (!noteRef && !isClosing) return null;

  const currentNoteRef = noteRef ?? activeNoteRef.current;
  if (!currentNoteRef) return null;

  return createPortal(
    <>
      <div
        className="note-side-panel-backdrop"
        onClick={triggerClose}
        aria-hidden
        data-closing={isClosing || undefined}
      />
      <aside
        className="note-side-panel"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label="Note en panneau latéral"
        data-resizing={isResizing || undefined}
        data-closing={isClosing || undefined}
        onAnimationEnd={handleAnimationEnd}
      >
        <div
          className="note-side-panel-resize-handle"
          onMouseDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le panneau"
        />
        <div className="note-side-panel-content">
          <NoteViewer noteRef={currentNoteRef} onClose={triggerClose} layoutMode="side-panel" />
        </div>
      </aside>
    </>,
    document.body
  );
}
