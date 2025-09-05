import React from 'react';
import { Editor } from '@tiptap/react';
import { FiRotateCcw, FiRotateCw } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface ModernUndoRedoButtonProps {
  editor: Editor | null;
  type: 'undo' | 'redo';
}

const ModernUndoRedoButton: React.FC<ModernUndoRedoButtonProps> = ({ editor, type }) => {
  if (!editor) return null;

  const isUndo = type === 'undo';
  const isRedo = type === 'redo';

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  const handleClick = () => {
    if (isUndo && canUndo) {
      editor.chain().focus().undo().run();
    } else if (isRedo && canRedo) {
      editor.chain().focus().redo().run();
    }
  };

  const isDisabled = isUndo ? !canUndo : !canRedo;
  const title = isUndo ? 'Annuler (Ctrl+Z)' : 'Refaire (Ctrl+Y)';
  const Icon = isUndo ? FiRotateCcw : FiRotateCw;

  return (
    <Tooltip text={title}>
      <button
        className={`toolbar-btn undo-redo-btn ${isUndo ? 'undo' : 'redo'}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={title}
        type="button"
      >
        <Icon size={16} />
      </button>
    </Tooltip>
  );
};

export default ModernUndoRedoButton;
