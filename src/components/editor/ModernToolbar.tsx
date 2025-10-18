/**
 * ModernToolbar - Barre d'outils moderne et modulaire pour l'éditeur
 * @module components/editor/ModernToolbar
 */

import React, { useState } from 'react';
import { FiImage, FiMoreHorizontal } from 'react-icons/fi';
import { MdGridOn } from 'react-icons/md';
import Tooltip from '@/components/Tooltip';
import AudioRecorder from '@/components/chat/AudioRecorder';
import ColorButton from './ColorButton';
import ModernFormatButton from './ModernFormatButton';
import ModernUndoRedoButton from './ModernUndoRedoButton';
import SimpleHeadingButton from './SimpleHeadingButton';
import SimpleListButton from './SimpleListButton';
import SimpleAlignButton from './SimpleAlignButton';
import BlockquoteButton from './BlockquoteButton';
import CodeBlockButton from './CodeBlockButton';
import FontSelector from './FontSelector';
import AIButton from './AIButton';
import ToolbarGroup from './ToolbarGroup';
import './modern-toolbar.css';
import type { FullEditorInstance } from '@/types/editor';

interface ModernToolbarProps {
  editor: FullEditorInstance | null;
  setImageMenuOpen: (open: boolean) => void;
  onFontChange?: (fontName: string, scope?: 'all' | 'headings' | 'body') => void;
  currentFont?: string;
  onTranscriptionComplete?: (text: string) => void;
}

const ModernToolbar: React.FC<ModernToolbarProps> = ({ 
  editor, 
  setImageMenuOpen, 
  onFontChange, 
  currentFont = 'Noto Sans', 
  onTranscriptionComplete 
}) => {
  const isReadonly = !editor;
  const [showMoreTools, setShowMoreTools] = useState(false);

  return (
    <div className="modern-toolbar">
      <div className="toolbar-main">
        {/* Groupe gauche - Formatage de base */}
        <ToolbarGroup align="left">
          <ModernUndoRedoButton editor={editor} type="undo" />
          <ModernUndoRedoButton editor={editor} type="redo" />

          <FontSelector 
            currentFont={currentFont}
            onFontChange={onFontChange}
            disabled={isReadonly}
          />

          <ModernFormatButton editor={editor} format="bold" title="Gras" shortcut="Ctrl+B" />
          <ModernFormatButton editor={editor} format="italic" title="Italique" shortcut="Ctrl+I" />
          <ModernFormatButton editor={editor} format="underline" title="Souligné" shortcut="Ctrl+U" />
        </ToolbarGroup>

        {/* Groupe centre - Structure */}
        <ToolbarGroup align="center">
          <SimpleHeadingButton editor={editor} />
          <SimpleListButton editor={editor} />
          <BlockquoteButton editor={editor} />
          <CodeBlockButton editor={editor} />
        </ToolbarGroup>

        {/* Groupe droite - Outils avancés */}
        <ToolbarGroup align="right">
          <Tooltip text="Insérer un tableau">
            <button 
              className="toolbar-btn" 
              disabled={isReadonly} 
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
              aria-label="Insérer un tableau"
            >
              <MdGridOn size={16} />
            </button>
          </Tooltip>
          
          <Tooltip text="Image">
            <button 
              className="toolbar-btn" 
              disabled={isReadonly} 
              onClick={() => setImageMenuOpen(true)} 
              aria-label="Image"
            >
              <FiImage size={16} />
            </button>
          </Tooltip>

          <Tooltip text="Dictaphone IA">
            <AudioRecorder 
              onTranscriptionComplete={onTranscriptionComplete || (() => {})}
              onError={(error) => logger.error('[Audio] Transcription error', error)}
              disabled={isReadonly}
              variant="toolbar"
            />
          </Tooltip>
          
          <Tooltip text="Plus d'outils">
            <button 
              className={`toolbar-btn toolbar-btn--more ${showMoreTools ? 'active' : ''}`}
              onClick={() => setShowMoreTools(!showMoreTools)}
              aria-label="Plus d'outils"
            >
              <FiMoreHorizontal size={16} />
            </button>
          </Tooltip>

          <AIButton disabled={isReadonly} />
        </ToolbarGroup>
      </div>

      {showMoreTools && (
        <div className="toolbar-advanced">
          <div className="toolbar-advanced-label">Styles avancés</div>
          <ColorButton editor={editor} type="text" />
          <ColorButton editor={editor} type="highlight" />
          <SimpleAlignButton editor={editor} />
        </div>
      )}
    </div>
  );
};

export default ModernToolbar;
