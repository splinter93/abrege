import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiMinus,
  FiCode,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify
} from 'react-icons/fi';

interface FormatButtonProps {
  editor: Editor | null;
  format: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'align-left' | 'align-center' | 'align-right' | 'align-justify';
  title: string;
}

const FormatButton: React.FC<FormatButtonProps> = ({ editor, format, title }) => {
  const getIcon = () => {
    switch (format) {
      case 'bold': return <FiBold size={16} />;
      case 'italic': return <FiItalic size={16} />;
      case 'underline': return <FiUnderline size={16} />;
      case 'strike': return <FiMinus size={16} />;
      case 'code': return <FiCode size={16} />;
      case 'align-left': return <FiAlignLeft size={16} />;
      case 'align-center': return <FiAlignCenter size={16} />;
      case 'align-right': return <FiAlignRight size={16} />;
      case 'align-justify': return <FiAlignJustify size={16} />;
      default: return null;
    }
  };

  const isActive = () => {
    if (!editor) return false;

    switch (format) {
      case 'bold': return editor.isActive('bold');
      case 'italic': return editor.isActive('italic');
      case 'underline': return editor.isActive('underline');
      case 'strike': return editor.isActive('strike');
      case 'code': return editor.isActive('code');
      case 'align-left': return editor.isActive({ textAlign: 'left' });
      case 'align-center': return editor.isActive({ textAlign: 'center' });
      case 'align-right': return editor.isActive({ textAlign: 'right' });
      case 'align-justify': return editor.isActive({ textAlign: 'justify' });
      default: return false;
    }
  };

  const handleClick = () => {
    if (!editor) return;

    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'align-left':
        editor.chain().focus().setTextAlign('left').run();
        break;
      case 'align-center':
        editor.chain().focus().setTextAlign('center').run();
        break;
      case 'align-right':
        editor.chain().focus().setTextAlign('right').run();
        break;
      case 'align-justify':
        editor.chain().focus().setTextAlign('justify').run();
        break;
    }
  };

  return (
    <button
      className={`format-button ${isActive() ? 'active' : ''}`}
      onClick={handleClick}
      title={title}
      disabled={!editor}
    >
      {getIcon()}
    </button>
  );
};

export default FormatButton;
