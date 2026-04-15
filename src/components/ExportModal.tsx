'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExportModal.css';

export type ExportFormat = 'pdf' | 'md' | 'html' | 'txt';

interface ExportModalProps {
  open: boolean;
  defaultFilename: string;
  onExport: (format: ExportFormat, filename: string) => void;
  onClose: () => void;
  isExporting?: boolean;
  lang?: 'fr' | 'en';
}

const FORMAT_DEFS: Array<{ id: ExportFormat; ext: string }> = [
  { id: 'pdf', ext: '.pdf' },
  { id: 'md', ext: '.md' },
  { id: 'html', ext: '.html' },
  { id: 'txt', ext: '.txt' },
];

const T = {
  fr: {
    title: 'Exporter la note',
    fileLabel: 'Nom du fichier',
    formatLabel: 'Format',
    cancel: 'Annuler',
    download: 'Télécharger',
    downloading: 'Export en cours…',
    fmtPdf: 'PDF',
    fmtMd: 'Markdown',
    fmtHtml: 'HTML',
    fmtTxt: 'Texte',
  },
  en: {
    title: 'Export note',
    fileLabel: 'File name',
    formatLabel: 'Format',
    cancel: 'Cancel',
    download: 'Download',
    downloading: 'Exporting…',
    fmtPdf: 'PDF',
    fmtMd: 'Markdown',
    fmtHtml: 'HTML',
    fmtTxt: 'Plain Text',
  },
} as const;

const ExportModal: React.FC<ExportModalProps> = ({
  open,
  defaultFilename,
  onExport,
  onClose,
  isExporting = false,
  lang = 'fr',
}) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [filename, setFilename] = useState(defaultFilename);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = T[lang];
  const formatLabels: Record<ExportFormat, string> = {
    pdf: t.fmtPdf,
    md: t.fmtMd,
    html: t.fmtHtml,
    txt: t.fmtTxt,
  };

  useEffect(() => {
    setFilename(defaultFilename);
  }, [defaultFilename]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.select(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = filename.trim() || defaultFilename;
    const base = clean.replace(/\.(pdf|md|html|txt)$/i, '');
    onExport(format, base);
  };

  const selectedFmt = FORMAT_DEFS.find((f) => f.id === format)!;

  return createPortal(
    <div
      ref={overlayRef}
      className="export-note-modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="export-note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-note-modal__header">
          <h3 id="export-modal-title">{t.title}</h3>
          <button type="button" className="export-note-modal__close" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="export-note-modal__body">
            <div className="export-note-modal__field">
              <label htmlFor="export-filename" className="export-note-modal__label">
                {t.fileLabel}
              </label>
              <div className="export-note-modal__filename-row">
                <input
                  id="export-filename"
                  ref={inputRef}
                  type="text"
                  className="export-note-modal__input"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isExporting}
                />
                <span className="export-note-modal__ext" aria-hidden>
                  {selectedFmt.ext}
                </span>
              </div>
            </div>

            <div className="export-note-modal__field">
              <span className="export-note-modal__label" id="export-format-label">
                {t.formatLabel}
              </span>
              <div
                className="export-note-modal__format-row"
                role="radiogroup"
                aria-labelledby="export-format-label"
              >
                {FORMAT_DEFS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={format === f.id}
                    className="export-note-modal__format-pill"
                    data-selected={format === f.id ? 'true' : 'false'}
                    disabled={isExporting}
                    onClick={() => setFormat(f.id)}
                  >
                    {formatLabels[f.id]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="export-note-modal__footer">
            <button
              type="button"
              className="export-note-modal__btn-secondary"
              disabled={isExporting}
              onClick={onClose}
            >
              {t.cancel}
            </button>
            <button type="submit" className="export-note-modal__submit" disabled={isExporting}>
              {isExporting ? t.downloading : t.download}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ExportModal;
