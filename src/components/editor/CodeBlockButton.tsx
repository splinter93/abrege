import React from 'react';
import { Editor } from '@tiptap/react';
import { FiCode } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface CodeBlockButtonProps {
  editor: Editor | null;
}

const CodeBlockButton: React.FC<CodeBlockButtonProps> = ({ editor }) => {
  if (!editor) return null;

  const isActive = editor.isActive('codeBlock');
  const canToggle = editor.can().toggleCodeBlock();

  const handleToggle = () => {
    if (!canToggle) return;
    editor.chain().focus().toggleCodeBlock().run();
  };

  return (
    <Tooltip text="Bloc de code">
      <button
        className={`toolbar-btn ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={!canToggle}
        aria-label="Bloc de code"
        type="button"
      >
        <FiCode size={16} />
      </button>
    </Tooltip>
  );
};

export default CodeBlockButton;
