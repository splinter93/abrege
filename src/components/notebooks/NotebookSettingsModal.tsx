'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, PanelRight, Square } from 'lucide-react';
import { useNotebookSettingsStore, type NoteOpeningMode } from '@/store/useNotebookSettingsStore';
import './NotebookSettingsModal.css';

interface NotebookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODES: { id: NoteOpeningMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'normal', label: 'Page complète', icon: <FileText size={18} />, desc: 'Ouvre la note dans une nouvelle page' },
  { id: 'side-panel', label: 'Panneau latéral', icon: <PanelRight size={18} />, desc: 'Ouvre la note dans un panneau à droite' },
  { id: 'modal', label: 'Fenêtre modale', icon: <Square size={18} />, desc: 'Ouvre la note dans une fenêtre modale' },
];

export default function NotebookSettingsModal({ isOpen, onClose }: NotebookSettingsModalProps) {
  const { noteOpeningMode, setNoteOpeningMode } = useNotebookSettingsStore();

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="notebook-settings-overlay" onClick={onClose}>
      <div className="notebook-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notebook-settings-header">
          <h2 className="notebook-settings-title">Mode d&apos;ouverture des notes</h2>
          <button
            type="button"
            className="notebook-settings-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="notebook-settings-body">
          <div className="notebook-settings-modes">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`notebook-settings-mode ${noteOpeningMode === mode.id ? 'active' : ''}`}
                onClick={() => setNoteOpeningMode(mode.id)}
              >
                <span className="notebook-settings-mode-text">
                  <span className="notebook-settings-mode-label">{mode.label}</span>
                  <span className="notebook-settings-mode-desc">{mode.desc}</span>
                </span>
                <span className="notebook-settings-mode-icon">{mode.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
