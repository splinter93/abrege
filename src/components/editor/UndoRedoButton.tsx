import React from 'react';
import { Editor } from '@tiptap/react';
import { FiRotateCcw, FiRotateCw } from 'react-icons/fi';

interface UndoRedoButtonProps {
  editor: Editor | null;
  type: 'undo' | 'redo';
}

const UndoRedoButton: React.FC<UndoRedoButtonProps> = ({ editor, type }) => {
  const isUndo = type === 'undo';
  const isRedo = type === 'redo';

  const canUndo = editor?.can().undo() || false;
  const canRedo = editor?.can().redo() || false;

  const handleClick = () => {
    if (!editor) return;

    if (isUndo) {
      editor.chain().focus().undo().run();
    } else {
      editor.chain().focus().redo().run();
    }
  };

  const isDisabled = isUndo ? !canUndo : !canRedo;
  const title = isUndo ? 'Annuler (Ctrl+Z)' : 'Refaire (Ctrl+Y)';

  return (
    <button
      className={`undo-redo-button ${isUndo ? 'undo' : 'redo'}`}
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
    >
      {isUndo ? <FiRotateCcw size={16} /> : <FiRotateCw size={16} />}
    </button>
  );
};

export default UndoRedoButton;
