import React, { useState } from 'react';
import { FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiList, FiCheckSquare, FiImage, FiMic, FiType, FiZap } from 'react-icons/fi';
import { AiOutlineOrderedList } from 'react-icons/ai';
import { MdGridOn, MdFormatQuote } from 'react-icons/md';
import { FiCode } from 'react-icons/fi';
import Tooltip from './Tooltip';

interface EditorToolbarProps {
  editor: any;
  setImageMenuOpen: (open: boolean) => void;
  onFontChange?: (fontName: string) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, setImageMenuOpen, onFontChange }) => {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  
  if (!editor) return null;
  
  const fonts = [
    { name: 'Noto Sans', label: 'Noto Sans' },
    { name: 'Inter', label: 'Inter' },
    { name: 'Arial', label: 'Arial' },
    { name: 'Palatino', label: 'Palatino' },
    { name: 'var(--font-open-sans)', label: 'Open Sans' },
    { name: 'var(--font-eb-garamond)', label: 'EB Garamond' },
    { name: 'var(--font-roboto)', label: 'Roboto' },
    { name: 'var(--font-lato)', label: 'Lato' },
    { name: 'var(--font-source-sans-3)', label: 'Source Sans 3' },
    { name: 'var(--font-work-sans)', label: 'Work Sans' },
    { name: 'var(--font-cormorant-garamond)', label: 'Cormorant Garamond' },
  ];
  
  const setFont = (fontName: string) => {
    // Applique la police à l'éditeur
    const editorElement = editor.view.dom;
    if (editorElement) {
      editorElement.style.fontFamily = fontName;
    }
    
    // Notifie le parent du changement de police
    if (onFontChange) {
      onFontChange(fontName);
    }
    
    setFontMenuOpen(false);
  };
  
  // Ferme le menu de police quand on clique ailleurs
  React.useEffect(() => {
    if (!fontMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.font-menu-container')) {
        setFontMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fontMenuOpen]);
  
  return (
    <div className="editor-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <div className="toolbar-group">
        <div className="font-menu-container" style={{ position: 'relative' }}>
          <Tooltip text="Police">
            <button 
              className="toolbar-button" 
              onClick={() => setFontMenuOpen(!fontMenuOpen)}
              aria-label="Police"
            >
              <FiType size={18} />
            </button>
          </Tooltip>
          {fontMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              background: '#1a1a1c',
              border: '1px solid #2a2a2c',
              borderRadius: 8,
              padding: '8px 0',
              minWidth: 150,
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              marginTop: 4
            }}>
              {fonts.map((font) => (
                <button
                  key={font.name}
                  onClick={() => setFont(font.name)}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: '#D4D4D4',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: font.name,
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2a2c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Tooltip text="Gras (Ctrl+B)"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Gras"><FiBold size={18} /></button></Tooltip>
        <Tooltip text="Italique (Ctrl+I)"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italique"><FiItalic size={18} /></button></Tooltip>
        <Tooltip text="Souligné (Ctrl+U)"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Souligné"><FiUnderline size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Aligner à gauche"><button className="toolbar-button" onClick={() => editor.chain().focus().setTextAlign('left').run()} aria-label="Aligner à gauche"><FiAlignLeft size={18} /></button></Tooltip>
        <Tooltip text="Centrer"><button className="toolbar-button" onClick={() => editor.chain().focus().setTextAlign('center').run()} aria-label="Centrer"><FiAlignCenter size={18} /></button></Tooltip>
        <Tooltip text="Aligner à droite"><button className="toolbar-button" onClick={() => editor.chain().focus().setTextAlign('right').run()} aria-label="Aligner à droite"><FiAlignRight size={18} /></button></Tooltip>
        <Tooltip text="Justifier"><button className="toolbar-button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} aria-label="Justifier"><FiAlignJustify size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Titre 1 (H1)"><button className={`toolbar-button${editor.isActive && editor.isActive('heading', { level: 1 }) ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Titre 1 (H1)">H1</button></Tooltip>
        <Tooltip text="Titre 2 (H2)"><button className={`toolbar-button${editor.isActive && editor.isActive('heading', { level: 2 }) ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Titre 2 (H2)">H2</button></Tooltip>
        <Tooltip text="Titre 3 (H3)"><button className={`toolbar-button${editor.isActive && editor.isActive('heading', { level: 3 }) ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Titre 3 (H3)">H3</button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Liste à puces"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Liste à puces"><FiList size={18} /></button></Tooltip>
        <Tooltip text="Liste numérotée"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Liste numérotée"><AiOutlineOrderedList size={18} /></button></Tooltip>
        <Tooltip text="Cases à cocher"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleTaskList().run()} aria-label="Cases à cocher"><FiCheckSquare size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Insérer un tableau"><button className="toolbar-button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insérer un tableau"><MdGridOn size={18} style={{ borderRadius: 4 }} /></button></Tooltip>
        <Tooltip text="Citation"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Citation"><MdFormatQuote size={18} /></button></Tooltip>
        <Tooltip text="Bloc de code"><button className="toolbar-button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="Bloc de code"><FiCode size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Image"><button className="toolbar-button" onClick={() => setImageMenuOpen(true)} aria-label="Image"><FiImage size={18} /></button></Tooltip>
        <Tooltip text="Dictaphone IA"><button className="toolbar-button"><FiMic size={18} /></button></Tooltip>
        <Tooltip text="Agent IA">
          <button className="toolbar-button ai-button">
            <FiZap size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default EditorToolbar; 