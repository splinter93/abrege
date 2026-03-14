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

  useEffect(() => {
    setWidth(getStoredWidth());
  }, [noteRef]);

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
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label="Note en panneau latéral"
        data-resizing={isResizing || undefined}
      >
        <div
          className="note-side-panel-resize-handle"
          onMouseDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le panneau"
        />
        <div className="note-side-panel-content">
          <NoteViewer noteRef={noteRef} onClose={onClose} layoutMode="side-panel" />
        </div>
      </aside>
    </>,
    document.body
  );
}
