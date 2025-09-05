import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiAlignLeft, 
  FiAlignCenter, 
  FiAlignRight,
  FiLink,
  FiCode,
  FiQuote
} from 'react-icons/fi';
import { MdFormatQuote } from 'react-icons/md';
import FormatButton from './FormatButton';
import ColorButton from './ColorButton';

interface FloatingToolbarProps {
  editor: Editor | null;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="floating-toolbar">
      <div className="floating-toolbar-group">
        <FormatButton editor={editor} format="bold" title="Gras" />
        <FormatButton editor={editor} format="italic" title="Italique" />
        <FormatButton editor={editor} format="underline" title="Souligné" />
      </div>
      
      <div className="floating-toolbar-group">
        <FormatButton editor={editor} format="align-left" title="Aligner à gauche" />
        <FormatButton editor={editor} format="align-center" title="Centrer" />
        <FormatButton editor={editor} format="align-right" title="Aligner à droite" />
      </div>
      
      <div className="floating-toolbar-group">
        <ColorButton editor={editor} type="text" />
        <ColorButton editor={editor} type="highlight" />
      </div>
      
      <div className="floating-toolbar-group">
        <button
          className={`floating-toolbar-button ${editor.isActive('link') ? 'active' : ''}`}
          onClick={() => {
            // Toggle link
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              const url = window.prompt('URL du lien:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }
          }}
          title="Lien"
        >
          <FiLink size={16} />
        </button>
        
        <button
          className={`floating-toolbar-button ${editor.isActive('codeBlock') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Bloc de code"
        >
          <FiCode size={16} />
        </button>
        
        <button
          className={`floating-toolbar-button ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citation"
        >
          <MdFormatQuote size={16} />
        </button>
      </div>
    </div>
  );
};

export default FloatingToolbar;
