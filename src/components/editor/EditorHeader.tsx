/**
 * EditorHeader - Header sobre et propre pour l'éditeur
 * Logo à gauche, toolbar au centre, 3 boutons à droite
 */

import React from 'react';
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
}) => {
  return (
    <div className="editor-header">
      {/* Logo à gauche */}
      <div className="editor-header__logo">
        <LogoHeader />
      </div>

      {/* Toolbar au centre - cachée en mode preview */}
      {!previewMode && (
        <div className="editor-header__center">
          <EditorToolbar 
            editor={editor} 
            readonly={readonly} 
            onImageClick={onImageClick}
            onFontChange={onFontChange}
            currentFont={currentFont}
          />
        </div>
      )}

      {/* Actions à droite */}
      <div className="editor-header__actions">
        <button
          className={`header-action-btn ${previewMode ? 'active' : ''}`}
          onClick={onPreview}
          aria-label={previewMode ? "Mode édition" : "Mode lecture"}
          title={previewMode ? "Mode édition" : "Mode lecture"}
        >
          {previewMode ? <FiEdit2 size={18} /> : <FiEye size={18} />}
        </button>
        
        <button
          ref={kebabBtnRef}
          className="header-action-btn"
          onClick={onMenuOpen}
          aria-label="Menu"
          title="Menu"
        >
          <FiMoreHorizontal size={18} />
        </button>
        
        <button
          className="header-action-btn"
          onClick={onClose}
          aria-label="Fermer"
          title="Fermer"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;

