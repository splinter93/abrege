import React from 'react';
import { Editor } from '@tiptap/react';
import { FiMessageSquare } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface BlockquoteButtonProps {
  editor: Editor | null;
}

const BlockquoteButton: React.FC<BlockquoteButtonProps> = ({ editor }) => {
  if (!editor) return null;

  const isActive = editor.isActive('blockquote');
  const canToggle = editor.can().toggleBlockquote();

  const handleToggle = () => {
    if (!canToggle) return;
    editor.chain().focus().toggleBlockquote().run();
  };

  return (
    <Tooltip text="Citation">
      <button
        className={`toolbar-btn ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={!canToggle}
        aria-label="Citation"
        type="button"
      >
        <FiMessageSquare size={16} />
      </button>
    </Tooltip>
  );
};

export default BlockquoteButton;
