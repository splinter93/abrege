/**
 * ModernToolbar - Barre d'outils moderne et modulaire pour l'éditeur
 * @module components/editor/ModernToolbar
 */

import React, { useState } from 'react';
import { FiImage, FiMoreHorizontal } from 'react-icons/fi';
import { MdGridOn } from 'react-icons/md';
import Tooltip from '@/components/Tooltip';
import AudioRecorder from '@/components/chat/AudioRecorder';
import { logger } from '@/utils/logger';
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

          {/* Desktop only */}
          <div className="toolbar-group-desktop-only">
            <FontSelector 
              currentFont={currentFont}
              onFontChange={onFontChange}
              disabled={isReadonly}
            />
          </div>

          {/* Toujours visibles */}
          <ModernFormatButton editor={editor} format="bold" title="Gras" shortcut="Ctrl+B" />
          <ModernFormatButton editor={editor} format="italic" title="Italique" shortcut="Ctrl+I" />
          
          {/* Desktop only */}
          <div className="toolbar-group-desktop-only">
            <ModernFormatButton editor={editor} format="underline" title="Souligné" shortcut="Ctrl+U" />
          </div>
        </ToolbarGroup>

        {/* Groupe centre - Structure */}
        <ToolbarGroup align="center">
          {/* Toujours visible */}
          <SimpleHeadingButton editor={editor} />
          
          {/* Desktop only */}
          <div className="toolbar-group-desktop-only">
            <SimpleListButton editor={editor} />
            <BlockquoteButton editor={editor} />
            <CodeBlockButton editor={editor} />
          </div>
        </ToolbarGroup>

        {/* Groupe droite - Outils avancés */}
        <ToolbarGroup align="right">
          {/* Desktop only */}
          <div className="toolbar-group-desktop-only">
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
          </div>
          
          {/* Toujours visible */}
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

          {/* Toujours visible */}
          <Tooltip text="Dictaphone IA">
            <AudioRecorder 
              onTranscriptionComplete={onTranscriptionComplete || (() => {})}
              onError={(error) => logger.error('[Audio] Transcription error', error)}
              disabled={isReadonly}
              variant="toolbar"
            />
          </Tooltip>
          
          {/* Bouton ... (visible seulement mobile) */}
          <Tooltip text="Plus d'outils">
            <button 
              className={`toolbar-btn toolbar-btn--more toolbar-btn--mobile-only ${showMoreTools ? 'active' : ''}`}
              onClick={() => setShowMoreTools(!showMoreTools)}
              aria-label="Plus d'outils"
            >
              <FiMoreHorizontal size={16} />
            </button>
          </Tooltip>

          {/* Toujours visible */}
          <AIButton disabled={isReadonly} />
        </ToolbarGroup>
      </div>

      {showMoreTools && (
        <div className="toolbar-advanced">
          <div className="toolbar-advanced-label">Outils avancés</div>
          <SimpleListButton editor={editor} />
          <BlockquoteButton editor={editor} />
          <CodeBlockButton editor={editor} />
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
          <ModernFormatButton editor={editor} format="underline" title="Souligné" shortcut="Ctrl+U" />
          <ColorButton editor={editor} type="text" />
          <ColorButton editor={editor} type="highlight" />
          <SimpleAlignButton editor={editor} />
        </div>
      )}
    </div>
  );
};

export default ModernToolbar;
