import React, { useState, useRef, useEffect } from 'react';
import { 
  FiBold, FiItalic, FiUnderline, FiList, FiCheckSquare, 
  FiImage, FiMic, FiZap, FiCode, FiChevronDown, FiGrid,
  FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify,
  FiList as FiOrderedList, FiQuote, FiTable, FiPalette
} from 'react-icons/fi';
import type { Editor as TiptapEditor } from '@tiptap/react';
import Tooltip from '@/components/Tooltip';

interface EditorToolbarProps {
  editor: TiptapEditor | null;
  setImageMenuOpen: (open: boolean) => void;
}

interface BlockType {
  id: string;
  label: string;
  action: () => void;
  isActive: () => boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, setImageMenuOpen }) => {
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const blockMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(event.target as Node)) {
        setBlockMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setColorMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const blockTypes: BlockType[] = [
    { id: 'paragraph', label: 'Paragraph', action: () => editor.chain().focus().setParagraph().run(), isActive: () => editor.isActive('paragraph') },
    { id: 'h1', label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
    { id: 'h2', label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
    { id: 'h3', label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
  ];

  const activeBlock = blockTypes.find(b => b.isActive());
  const activeBlockLabel = activeBlock ? activeBlock.label : 'Paragraph';

  const colorOptions = [
    { name: 'text', label: 'Couleur du texte', color: '#000000' },
    { name: 'highlight', label: 'Surlignage', color: '#ffff00' },
  ];

  return (
    <div className="editor-toolbar">
      {/* Group 1: Block Type Selector */}
      <div className="toolbar-group">
        <div className="block-type-selector" ref={blockMenuRef}>
          <Tooltip text="Format de texte">
            <button className="toolbar-button" onClick={() => setBlockMenuOpen(!blockMenuOpen)}>
              <span>{activeBlockLabel}</span>
              <FiChevronDown size={16} />
            </button>
          </Tooltip>
          {blockMenuOpen && (
            <div className="block-type-menu">
              {blockTypes.map(block => (
                <button 
                  key={block.id} 
                  className={`block-type-menu-item${block.isActive() ? ' active' : ''}`}
                  onClick={() => {
                    block.action();
                    setBlockMenuOpen(false);
                  }}
                >
                  {block.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Group 2: Basic Text Formatting */}
      <div className="toolbar-group">
        <Tooltip text="Gras (Ctrl+B)"><button className={`toolbar-button${editor.isActive('bold') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Gras"><FiBold size={16} /></button></Tooltip>
        <Tooltip text="Italique (Ctrl+I)"><button className={`toolbar-button${editor.isActive('italic') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italique"><FiItalic size={16} /></button></Tooltip>
        <Tooltip text="Souligné (Ctrl+U)"><button className={`toolbar-button${editor.isActive('underline') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Souligné"><FiUnderline size={16} /></button></Tooltip>
      </div>

      {/* Group 3: Color and Highlight Menu */}
      <div className="toolbar-group">
        <div className="color-menu-selector" ref={colorMenuRef}>
          <Tooltip text="Couleur et surlignage">
            <button className="toolbar-button" onClick={() => setColorMenuOpen(!colorMenuOpen)}>
              <FiPalette size={16} />
            </button>
          </Tooltip>
          {colorMenuOpen && (
            <div className="color-menu">
              {colorOptions.map(option => (
                <button 
                  key={option.name} 
                  className="color-menu-item"
                  onClick={() => {
                    // Ici on peut ajouter la logique pour appliquer la couleur/surlignage
                    setColorMenuOpen(false);
                  }}
                >
                  <div 
                    className="color-preview" 
                    style={{ backgroundColor: option.color }}
                  />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Group 4: Text Alignment */}
      <div className="toolbar-group">
        <Tooltip text="Aligner à gauche"><button className={`toolbar-button${editor.isActive({ textAlign: 'left' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('left').run()} aria-label="Aligner à gauche"><FiAlignLeft size={16} /></button></Tooltip>
        <Tooltip text="Centrer"><button className={`toolbar-button${editor.isActive({ textAlign: 'center' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('center').run()} aria-label="Centrer"><FiAlignCenter size={16} /></button></Tooltip>
        <Tooltip text="Aligner à droite"><button className={`toolbar-button${editor.isActive({ textAlign: 'right' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('right').run()} aria-label="Aligner à droite"><FiAlignRight size={16} /></button></Tooltip>
        <Tooltip text="Justifier"><button className={`toolbar-button${editor.isActive({ textAlign: 'justify' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('justify').run()} aria-label="Justifier"><FiAlignJustify size={16} /></button></Tooltip>
      </div>

      {/* Group 5: Lists */}
      <div className="toolbar-group">
        <Tooltip text="Liste à puces"><button className={`toolbar-button${editor.isActive('bulletList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Liste à puces"><FiList size={16} /></button></Tooltip>
        <Tooltip text="Liste numérotée"><button className={`toolbar-button${editor.isActive('orderedList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Liste numérotée"><FiOrderedList size={16} /></button></Tooltip>
        <Tooltip text="Cases à cocher"><button className={`toolbar-button${editor.isActive('taskList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleTaskList().run()} aria-label="Cases à cocher"><FiCheckSquare size={16} /></button></Tooltip>
      </div>

      {/* Group 6: Block Elements */}
      <div className="toolbar-group">
        <Tooltip text="Citation"><button className={`toolbar-button${editor.isActive('blockquote') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Citation"><FiQuote size={16} /></button></Tooltip>
        <Tooltip text="Bloc de code"><button className={`toolbar-button${editor.isActive('codeBlock') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="Bloc de code"><FiCode size={16} /></button></Tooltip>
      </div>
      
      {/* Group 7: Insertions */}
      <div className="toolbar-group">
        <Tooltip text="Insérer un tableau"><button className={`toolbar-button${editor.isActive('table') ? ' active' : ''}`} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insérer un tableau"><FiTable size={16} /></button></Tooltip>
        <Tooltip text="Image"><button className={`toolbar-button${editor.isActive('image') ? ' active' : ''}`} onClick={() => setImageMenuOpen(true)} aria-label="Image"><FiImage size={16} /></button></Tooltip>
      </div>

      {/* Group 8: AI Tools (à droite) */}
      <div className="toolbar-group toolbar-group-right">
        <Tooltip text="Agent IA">
          <button className={`toolbar-button ai-button${editor.isActive('ai') ? ' active' : ''}`}>
            <FiZap size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Dictaphone IA"><button className={`toolbar-button${editor.isActive('audio') ? ' active' : ''}`}><FiMic size={16} /></button></Tooltip>
      </div>
    </div>
  );
};

export default EditorToolbar; 