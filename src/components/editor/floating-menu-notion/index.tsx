/**
 * Menu flottant Notion-like pour l'éditeur
 * Composant principal qui orchestre tous les hooks
 * 
 * ✅ NOUVEAU : Bouton "Add to chat" en mode canvas uniquement
 * @module components/editor/floating-menu-notion
 */

import React, { useState, useCallback } from 'react';
import { FiZap, FiType, FiChevronDown, FiMessageSquare } from 'react-icons/fi';
import type { EditorPrompt } from '@/types/editorPrompts';
import './floating-menu-notion.css';
import TransformMenu from '../TransformMenu';
import AskAIMenu from '../AskAIMenu';
import type { FloatingMenuNotionProps } from './types';
import { useMenuPosition } from './hooks/useMenuPosition';
import { useMenuVisibility } from './hooks/useMenuVisibility';
import { useFormatCommands } from './hooks/useFormatCommands';
import { usePromptExecution } from './hooks/usePromptExecution';
import { MenuButtons } from './components/MenuButtons';
import { createAndEmitCanvasSelection } from '@/utils/canvasSelectionUtils';
import { logger, LogCategory } from '@/utils/logger';

const FloatingMenuNotion: React.FC<FloatingMenuNotionProps> = (props) => {
  const { editor, noteId, noteTitle, noteContent, noteSlug, classeurId, classeurName, toolbarContext = 'editor' } = props;

  // Hooks de logique métier
  const { position, updatePosition, setPosition } = useMenuPosition(editor);
  const { executePrompt, isExecuting } = usePromptExecution({
    editor,
    noteId,
    noteTitle,
    noteContent,
    noteSlug,
    classeurId,
    classeurName
  });
  const formatCommands = useFormatCommands(editor);
  const { menuRef, selectedText } = useMenuVisibility({
    editor,
    position,
    updatePosition,
    setPosition
  });

  // États locaux pour les sous-menus
  const [isTransformMenuOpen, setTransformMenuOpen] = useState(false);
  const [isAskAIMenuOpen, setAskAIMenuOpen] = useState(false);

  // Fermer les sous-menus quand le menu devient invisible
  React.useEffect(() => {
    if (!position.visible) {
      setTransformMenuOpen(false);
      setAskAIMenuOpen(false);
    }
  }, [position.visible]);

  /**
   * Handler pour ajouter la sélection au chat (mode canvas uniquement)
   * Émet un événement 'canvas-selection' qui sera capturé par ChatInput
   * 
   * ✅ Validation stricte : minimum 3 caractères
   * ✅ Ferme le menu après ajout réussi
   */
  const handleAddToChat = useCallback(() => {
    if (!editor) {
      logger.warn(LogCategory.EDITOR, '[FloatingMenuNotion] Éditeur non disponible pour Add to chat');
      return;
    }

    if (!selectedText || selectedText.trim().length < 3) {
      logger.warn(LogCategory.EDITOR, '[FloatingMenuNotion] Sélection invalide pour Add to chat', {
        textLength: selectedText?.length || 0,
        textPreview: selectedText?.substring(0, 20)
      });
      return;
    }

    const { from, to } = editor.state.selection;
    const success = createAndEmitCanvasSelection(
      selectedText,
      noteId,
      noteSlug,
      noteTitle,
      from,
      to
    );

    if (success) {
      // Fermer le menu après ajout réussi
      setPosition(prev => ({ ...prev, visible: false }));
      // Fermer aussi les sous-menus
      setTransformMenuOpen(false);
      setAskAIMenuOpen(false);
      
      logger.info(LogCategory.EDITOR, '[FloatingMenuNotion] ✅ Sélection ajoutée au chat', {
        textLength: selectedText.length,
        textPreview: selectedText.substring(0, 50),
        noteId,
        noteTitle
      });
    } else {
      logger.error(LogCategory.EDITOR, '[FloatingMenuNotion] ❌ Échec ajout sélection au chat', {
        textLength: selectedText.length,
        noteId
      });
    }
  }, [editor, selectedText, noteId, noteSlug, noteTitle, setPosition]);

  // Vérifier si on est en mode canvas
  const isCanvasMode = toolbarContext === 'canvas';

  if (!editor || !position.visible) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="floating-menu-notion"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999
      }}
    >
      <div className="floating-menu-content">
        {/* ✅ Bouton "Add to chat" - Uniquement en mode canvas */}
        {isCanvasMode && (
          <button
            className="floating-menu-button add-to-chat-button"
            onClick={handleAddToChat}
            aria-label="Ajouter la sélection au chat"
            title="Ajouter la sélection au chat"
          >
            <FiMessageSquare size={16} />
            <span>Add to chat</span>
          </button>
        )}

        <button
          className="floating-menu-button ask-ai-dropdown-button"
          onClick={() => {
            setAskAIMenuOpen(!isAskAIMenuOpen);
            setTransformMenuOpen(false);
          }}
          aria-expanded={isAskAIMenuOpen}
        >
          <FiZap size={16} />
          <span>Ask AI</span>
          <FiChevronDown size={14} className="chevron-icon" />
        </button>

        <button
          className="floating-menu-button transform-button"
          onClick={() => {
            setTransformMenuOpen(!isTransformMenuOpen);
            setAskAIMenuOpen(false);
          }}
          aria-expanded={isTransformMenuOpen}
        >
          <FiType size={16} />
          <span>Transformer</span>
          <FiChevronDown size={14} className="chevron-icon" />
        </button>

        <div className="separator"></div>

        <MenuButtons commands={formatCommands} isExecuting={isExecuting} />
      </div>

      {isTransformMenuOpen && editor && (
        <div className="transform-menu-container">
          <TransformMenu editor={editor} onClose={() => setTransformMenuOpen(false)} />
        </div>
      )}

      {isAskAIMenuOpen && editor && (
        <div className="ask-ai-menu-container">
          <AskAIMenu 
            editor={editor} 
            selectedText={selectedText}
            onClose={() => setAskAIMenuOpen(false)}
            onExecutePrompt={async (prompt: EditorPrompt, text: string) => {
              await executePrompt(prompt, text);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FloatingMenuNotion;

