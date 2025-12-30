/**
 * Menu flottant Notion-like pour l'éditeur
 * Composant principal qui orchestre tous les hooks
 */

import React, { useState } from 'react';
import { FiZap, FiType, FiChevronDown } from 'react-icons/fi';
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

const FloatingMenuNotion: React.FC<FloatingMenuNotionProps> = (props) => {
  const { editor, noteId, noteTitle, noteContent, noteSlug, classeurId, classeurName } = props;

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

