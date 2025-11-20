/**
 * EditorHeader - Header sobre et propre pour l'éditeur
 * Logo à gauche, toolbar au centre, 3 boutons à droite
 */

import React from 'react';
import Link from 'next/link';
import { FiEye, FiMoreHorizontal, FiX, FiEdit2 } from 'react-icons/fi';
import LogoHeader from '@/components/LogoHeader';
import EditorToolbar from './EditorToolbar';
import type { FullEditorInstance } from '@/types/editor';
import './editor-header.css';

interface EditorHeaderProps {
  editor: FullEditorInstance | null;
  onClose: () => void;
  onPreview: () => void;
  onMenuOpen: () => void;
  onImageClick?: () => void;
  onFontChange?: (fontName: string, scope?: 'all' | 'headings' | 'body') => void;
  currentFont?: string;
  kebabBtnRef?: React.RefObject<HTMLButtonElement>;
  readonly?: boolean;
  previewMode?: boolean;
  showToolbar?: boolean;
  canEdit?: boolean; // Si l'user peut éditer (pour afficher le lien vers l'éditeur)
  noteId?: string; // ID de la note pour le lien vers l'éditeur
  kebabMenu?: React.ReactNode; // ✅ Menu kebab rendu dans le header
  onTranscriptionComplete?: (text: string) => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  editor,
  onClose,
  onPreview,
  onMenuOpen,
  onImageClick,
  onFontChange,
  currentFont,
  kebabBtnRef,
  readonly = false,
  previewMode = false,
  showToolbar = true,
  canEdit = true,
  noteId,
  kebabMenu,
  onTranscriptionComplete
}) => {
  return (
    <div className={`editor-header ${!showToolbar ? 'editor-header--transparent' : ''}`}>
      {/* Logo à gauche */}
      <div className="editor-header__logo">
        <LogoHeader />
      </div>

      {/* Toolbar au centre - cachée en mode preview ET si showToolbar = false */}
      {!previewMode && showToolbar && (
        <div className="editor-header__center">
          <EditorToolbar 
            editor={editor} 
            readonly={readonly} 
            onImageClick={onImageClick}
            onFontChange={onFontChange}
            currentFont={currentFont}
            onTranscriptionComplete={onTranscriptionComplete}
          />
        </div>
      )}

      {/* Actions à droite */}
      <div className="editor-header__actions">
        {/* Bouton Preview/Edit - 3 cas distincts */}
        {readonly && !previewMode && canEdit && noteId ? (
          // CAS 1 : Page publique (readonly=true, previewMode=false) + owner → Lien vers l'éditeur
          <Link
            href={`/private/note/${noteId}`}
            className="header-action-btn header-action-btn--edit"
            aria-label="Éditer cette note"
            title="Éditer cette note"
          >
            <FiEdit2 size={18} />
          </Link>
        ) : !readonly || previewMode ? (
          // CAS 2 : Page privée (readonly=false) OU mode preview → Toggle preview
          <button
            className={`header-action-btn ${previewMode ? 'active' : ''}`}
            onClick={onPreview}
            aria-label={previewMode ? "Mode édition" : "Mode lecture"}
            title={previewMode ? "Mode édition" : "Mode lecture"}
          >
            {previewMode ? <FiEdit2 size={18} /> : <FiEye size={18} />}
          </button>
        ) : null}
        {/* CAS 3 : Page publique + pas owner → Pas de bouton (null) */}
        
        {/* 🔧 FIX: Menu kebab masqué en mode readonly sauf si canEdit (owner) */}
        {(!readonly || canEdit) && (
          <button
            ref={kebabBtnRef}
            className="header-action-btn"
            onClick={onMenuOpen}
            aria-label="Menu"
            title="Menu"
          >
            <FiMoreHorizontal size={18} />
          </button>
        )}
        
        {/* 🔧 FIX: Bouton fermer masqué en mode readonly (page publique) */}
        {!readonly && (
          <button
            className="header-action-btn"
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
      
      {/* ✅ Menu kebab rendu dans le header pour suivre le sticky */}
      {kebabMenu}
    </div>
  );
};

export default EditorHeader;

