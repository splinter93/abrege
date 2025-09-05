import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiCode,
  FiMinus
} from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface ModernFormatButtonProps {
  editor: Editor | null;
  format: 'bold' | 'italic' | 'underline' | 'strike' | 'code';
  title: string;
  shortcut?: string;
}

const ModernFormatButton: React.FC<ModernFormatButtonProps> = ({ 
  editor, 
  format, 
  title, 
  shortcut 
}) => {
  if (!editor) return null;

  const isActive = editor.isActive(format);
  const canToggle = editor.can().toggleMark(format);

  const handleClick = () => {
    if (!canToggle) return;
    
    editor.chain().focus().toggleMark(format).run();
  };

  const getIcon = () => {
    switch (format) {
      case 'bold':
        return <FiBold size={16} />;
      case 'italic':
        return <FiItalic size={16} />;
      case 'underline':
        return <FiUnderline size={16} />;
      case 'strike':
        return <FiMinus size={16} />;
      case 'code':
        return <FiCode size={16} />;
      default:
        return null;
    }
  };

  const tooltipText = shortcut ? `${title} (${shortcut})` : title;

  return (
    <Tooltip text={tooltipText}>
      <button
        className={`toolbar-btn format-btn ${isActive ? 'active' : ''}`}
        onClick={handleClick}
        disabled={!canToggle}
        aria-label={title}
        type="button"
      >
        {getIcon()}
      </button>
    </Tooltip>
  );
};

export default ModernFormatButton;
