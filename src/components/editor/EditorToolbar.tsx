import React, { useState, useRef, useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiList, FiCheckSquare, FiImage, FiMic, FiType, FiZap, FiChevronDown, FiSearch } from 'react-icons/fi';
import { AiOutlineOrderedList } from 'react-icons/ai';
import { MdGridOn, MdFormatQuote } from 'react-icons/md';
import { FiCode } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';
import AudioRecorder from '@/components/chat/AudioRecorder';
import './editor-toolbar.css';
import type { FullEditorInstance } from '@/types/editor';

interface EditorToolbarProps {
  editor: FullEditorInstance | null;
  setImageMenuOpen: (open: boolean) => void;
  onFontChange?: (fontName: string) => void;
  currentFont?: string;
  onTranscriptionComplete?: (text: string) => void;
}

interface FontOption {
  name: string;
  label: string;
  category: 'sans-serif' | 'serif' | 'system' | 'monospace';
  preview: string;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, setImageMenuOpen, onFontChange, currentFont = 'Noto Sans', onTranscriptionComplete }) => {
  const isReadonly = !editor;
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Options de police disponibles avec catégories
  const fonts: FontOption[] = [
    { name: 'Noto Sans', label: 'Noto Sans', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Inter', label: 'Inter', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Open Sans', label: 'Open Sans', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Roboto', label: 'Roboto', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Lato', label: 'Lato', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Source Sans 3', label: 'Source Sans 3', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Work Sans', label: 'Work Sans', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Poppins', label: 'Poppins', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Ubuntu', label: 'Ubuntu', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Montserrat', label: 'Montserrat', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Raleway', label: 'Raleway', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'EB Garamond', label: 'EB Garamond', category: 'serif', preview: 'AaBbCcDd' },
    { name: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif', preview: 'AaBbCcDd' },
    { name: 'Georgia', label: 'Georgia', category: 'serif', preview: 'AaBbCcDd' },
    { name: 'Times New Roman', label: 'Times New Roman', category: 'serif', preview: 'AaBbCcDd' },
    { name: 'Arial', label: 'Arial', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Helvetica', label: 'Helvetica', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Verdana', label: 'Verdana', category: 'system', preview: 'AaBbCcDd' },
    { name: 'JetBrains Mono', label: 'JetBrains Mono', category: 'monospace', preview: 'AaBbCcDd' },
    { name: 'Fira Code', label: 'Fira Code', category: 'monospace', preview: 'AaBbCcDd' },
  ];

  // Grouper les polices par catégorie
  const groupedFonts = fonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = [];
    }
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontOption[]>);

  // Filtrer les polices selon la recherche
  const filteredFonts = fonts.filter(font =>
    font.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les polices filtrées
  const filteredGroupedFonts = filteredFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = [];
    }
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontOption[]>);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false);
      }
    };

    if (fontMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fontMenuOpen]);

  // Focus sur l'input de recherche quand le menu s'ouvre
  useEffect(() => {
    if (fontMenuOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [fontMenuOpen]);

  // Changer la police
  const setFont = (fontName: string) => {
    if (onFontChange) {
      onFontChange(fontName);
    }
    setFontMenuOpen(false);
    setSearchTerm('');
  };

  // Obtenir la police actuelle
  const currentFontData = fonts.find(f => f.name === currentFont) || fonts[0];

  return (
    <div className="editor-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {/* Menu de sélection de police */}
      {onFontChange && (
        <div className="toolbar-group font-selector">
          <Tooltip text="Changer la police">
            <div className="font-menu-container" ref={fontMenuRef}>
              <button
                className="toolbar-button font-dropdown-btn"
                onClick={() => setFontMenuOpen(!fontMenuOpen)}
                disabled={isReadonly}
                aria-label="Sélectionner une police"
              >
                <FiType size={16} />
              </button>
              
              {fontMenuOpen && (
                <div className="font-menu-dropdown">
                  {/* Barre de recherche */}
                  <div className="font-menu-search">
                    <FiSearch size={16} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="font-menu-search-input"
                      placeholder="Rechercher une police..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {/* Liste des polices */}
                  <div className="font-menu-list">
                    {Object.entries(filteredGroupedFonts).map(([category, categoryFonts]) => (
                      <div key={category} className="font-menu-category">
                        <div className="font-menu-category-title">
                          {category === 'sans-serif' ? 'Sans-serif' : 
                           category === 'serif' ? 'Serif' : 
                           category === 'monospace' ? 'Monospace' : 'Système'}
                        </div>
                        {categoryFonts.map((font) => {
                          const isSelected = font.name === currentFont;
                          return (
                            <button
                              key={font.name}
                              onClick={() => setFont(font.name)}
                              className={`font-menu-item ${isSelected ? 'selected' : ''}`}
                              style={{ fontFamily: font.name }}
                            >
                              <span className="font-menu-label">{font.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    {filteredFonts.length === 0 && (
                      <div className="font-menu-empty">Aucune police trouvée</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Tooltip>
        </div>
      )}
      
      <div className="toolbar-group">
        <Tooltip text="Gras (Ctrl+B)"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Gras"><FiBold size={18} /></button></Tooltip>
        <Tooltip text="Italique (Ctrl+I)"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italique"><FiItalic size={18} /></button></Tooltip>
        <Tooltip text="Souligné (Ctrl+U)"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleUnderline().run()} aria-label="Souligné"><FiUnderline size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Aligner à gauche"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().setTextAlign('left').run()} aria-label="Aligner à gauche"><FiAlignLeft size={18} /></button></Tooltip>
        <Tooltip text="Centrer"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().setTextAlign('center').run()} aria-label="Centrer"><FiAlignCenter size={18} /></button></Tooltip>
        <Tooltip text="Aligner à droite"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().setTextAlign('right').run()} aria-label="Aligner à droite"><FiAlignRight size={18} /></button></Tooltip>
        <Tooltip text="Justifier"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} aria-label="Justifier"><FiAlignJustify size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Titre 1 (H1)"><button className={`toolbar-button${editor?.isActive && editor.isActive('heading', { level: 1 }) ? ' active' : ''}`} disabled={isReadonly} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Titre 1 (H1)">H1</button></Tooltip>
        <Tooltip text="Titre 2 (H2)"><button className={`toolbar-button${editor?.isActive && editor.isActive('heading', { level: 2 }) ? ' active' : ''}`} disabled={isReadonly} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Titre 2 (H2)">H2</button></Tooltip>
        <Tooltip text="Titre 3 (H3)"><button className={`toolbar-button${editor?.isActive && editor.isActive('heading', { level: 3 }) ? ' active' : ''}`} disabled={isReadonly} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Titre 3 (H3)">H3</button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Liste à puces"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="Liste à puces"><FiList size={18} /></button></Tooltip>
        <Tooltip text="Liste numérotée"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="Liste numérotée"><AiOutlineOrderedList size={18} /></button></Tooltip>
        <Tooltip text="Cases à cocher"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleTaskList().run()} aria-label="Cases à cocher"><FiCheckSquare size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Insérer un tableau"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insérer un tableau"><MdGridOn size={18} style={{ borderRadius: 4 }} /></button></Tooltip>
        <Tooltip text="Citation"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleBlockquote().run()} aria-label="Citation"><MdFormatQuote size={18} /></button></Tooltip>
        <Tooltip text="Bloc de code"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} aria-label="Bloc de code"><FiCode size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Image"><button className="toolbar-button" disabled={isReadonly} onClick={() => setImageMenuOpen(true)} aria-label="Image"><FiImage size={18} /></button></Tooltip>
        <Tooltip text="Dictaphone IA">
          <AudioRecorder
            onTranscriptionComplete={onTranscriptionComplete || (() => {})}
            onError={(error) => console.error('Erreur dictée:', error)}
            disabled={isReadonly}
            variant="toolbar"
          />
        </Tooltip>
        <Tooltip text="Agent IA">
          <button className="toolbar-button ai-button" disabled={isReadonly}>
            <FiZap size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default EditorToolbar; 