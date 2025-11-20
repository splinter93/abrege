/**
 * EditorToolbar - Toolbar sobre avec boutons essentiels
 * Pas de scroll, pas de merde, juste les boutons alignés proprement
 */

import React, { useState, useCallback } from 'react';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiLink,
  FiImage,
  FiMoreVertical,
  FiZap,
  FiType,
  FiRotateCcw,
  FiRotateCw,
  FiCode,
} from 'react-icons/fi';
import { BsChatQuote } from 'react-icons/bs';
import { MdFormatListNumbered, MdGridOn } from 'react-icons/md';
import type { FullEditorInstance } from '@/types/editor';
import FontSelector from './FontSelector';
import { insertDefaultTable } from '@/utils/editorTables';
import AudioRecorder from '@/components/chat/AudioRecorder';
import './editor-toolbar.css';

interface EditorToolbarProps {
  editor: FullEditorInstance | null;
  readonly?: boolean;
  onImageClick?: () => void;
  onFontChange?: (fontName: string, scope?: 'all' | 'headings' | 'body') => void;
  currentFont?: string;
  onTranscriptionComplete?: (text: string) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ 
  editor, 
  readonly = false,
  onImageClick,
  onFontChange,
  currentFont = 'Figtree',
  onTranscriptionComplete
}) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Actions
  const undo = () => editor?.chain().focus().undo().run();
  const redo = () => editor?.chain().focus().redo().run();
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();
  const handleInsertTable = () => editor && insertDefaultTable(editor);

  const setHeading = (level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
    setShowHeadingMenu(false);
  };

  const setParagraph = () => {
    editor?.chain().focus().setParagraph().run();
    setShowHeadingMenu(false);
  };

  // States
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;
  const isBold = editor?.isActive('bold') ?? false;
  const isItalic = editor?.isActive('italic') ?? false;
  const isUnderline = editor?.isActive('underline') ?? false;
  const isBulletList = editor?.isActive('bulletList') ?? false;
  const isOrderedList = editor?.isActive('orderedList') ?? false;
  const isBlockquote = editor?.isActive('blockquote') ?? false;
  const isH1 = editor?.isActive('heading', { level: 1 }) ?? false;
  const isH2 = editor?.isActive('heading', { level: 2 }) ?? false;
  const isH3 = editor?.isActive('heading', { level: 3 }) ?? false;

  const getCurrentHeading = () => {
    if (isH1) return 'H1';
    if (isH2) return 'H2';
    if (isH3) return 'H3';
    return 'P';
  };

  const handleAudioTranscription = useCallback(
    (text: string) => {
      setAudioError(null);
      onTranscriptionComplete?.(text);
    },
    [onTranscriptionComplete]
  );

  const handleAudioError = useCallback((error: string) => {
    setAudioError(error);
  }, []);

  if (!editor || readonly) {
    return null;
  }

  return (
    <div className="editor-toolbar">
      {/* Undo/Redo */}
      <button
        className="tb-btn desktop-only"
        onClick={undo}
        disabled={!canUndo}
        title="Annuler (Ctrl+Z)"
      >
        <FiRotateCcw size={16} />
      </button>

      <button
        className="tb-btn desktop-only"
        onClick={redo}
        disabled={!canRedo}
        title="Refaire (Ctrl+Y)"
      >
        <FiRotateCw size={16} />
      </button>

      <div className="tb-divider desktop-only" />

      {/* Font selector */}
      <FontSelector
        currentFont={currentFont}
        onFontChange={onFontChange}
        disabled={readonly}
      />

      <div className="tb-divider" />

      {/* Format de base */}
      <button
        className={`tb-btn ${isBold ? 'active' : ''}`}
        onClick={toggleBold}
        title="Gras (Ctrl+B)"
      >
        <FiBold size={16} />
      </button>

      <button
        className={`tb-btn ${isItalic ? 'active' : ''}`}
        onClick={toggleItalic}
        title="Italique (Ctrl+I)"
      >
        <FiItalic size={16} />
      </button>

      <button
        className={`tb-btn ${isUnderline ? 'active' : ''}`}
        onClick={toggleUnderline}
        title="Souligné (Ctrl+U)"
      >
        <FiUnderline size={16} />
      </button>

      <div className="tb-divider" />

      {/* Heading dropdown */}
      <div className="tb-dropdown">
        <button
          className={`tb-btn tb-btn-heading ${isH1 || isH2 || isH3 ? 'active' : ''}`}
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          title="Format de titre"
        >
          <span className="tb-heading-label">{getCurrentHeading()}</span>
        </button>

        {showHeadingMenu && (
          <div className="tb-dropdown-menu">
            <button className="tb-dropdown-item" onClick={setParagraph}>
              Paragraphe
            </button>
            <button className="tb-dropdown-item" onClick={() => setHeading(1)}>
              Titre 1
            </button>
            <button className="tb-dropdown-item" onClick={() => setHeading(2)}>
              Titre 2
            </button>
            <button className="tb-dropdown-item" onClick={() => setHeading(3)}>
              Titre 3
            </button>
          </div>
        )}
      </div>

      <div className="tb-divider" />

      {/* Listes */}
      <button
        className={`tb-btn ${isBulletList ? 'active' : ''}`}
        onClick={toggleBulletList}
        title="Liste à puces"
      >
        <FiList size={16} />
      </button>

      <button
        className={`tb-btn ${isOrderedList ? 'active' : ''}`}
        onClick={toggleOrderedList}
        title="Liste numérotée"
      >
        <MdFormatListNumbered size={18} />
      </button>

      <div className="tb-divider desktop-only" />

      {/* Insert (desktop only) */}
      <button 
        className={`tb-btn desktop-only ${isBlockquote ? 'active' : ''}`}
        title="Citation" 
        onClick={toggleBlockquote}
      >
        <BsChatQuote size={16} />
      </button>

      <button className="tb-btn desktop-only" title="Insérer un tableau" onClick={handleInsertTable}>
        <MdGridOn size={18} />
      </button>

      <button className="tb-btn desktop-only" title="Insérer une image" onClick={onImageClick}>
        <FiImage size={16} />
      </button>

      <div className="tb-audio-wrapper desktop-only">
        <AudioRecorder
          onTranscriptionComplete={handleAudioTranscription}
          onError={handleAudioError}
          variant="toolbar"
        />
      </div>

      {audioError && (
        <span className="tb-audio-error desktop-only" role="status">
          {audioError}
        </span>
      )}

      <div className="tb-divider desktop-only" />

      {/* AI (toujours visible) */}
      <button className="tb-btn tb-btn-ai" title="Assistant IA">
        <FiZap size={16} />
      </button>

      {/* Menu overflow mobile */}
      <button className="tb-btn mobile-only" title="Plus d'outils" onClick={() => setShowMoreMenu(!showMoreMenu)}>
        <FiMoreVertical size={16} />
      </button>
    </div>
  );
};

export default EditorToolbar;

