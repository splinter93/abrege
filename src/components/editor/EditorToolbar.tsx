import React, { useState, useRef, useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiList, FiCheckSquare, FiImage, FiMic, FiType, FiZap, FiChevronDown, FiSearch } from 'react-icons/fi';
import { AiOutlineOrderedList } from 'react-icons/ai';
import { MdGridOn, MdFormatQuote } from 'react-icons/md';
import { FiCode } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';
import AudioRecorder from '@/components/chat/AudioRecorder';
import ColorButton from './ColorButton';
import FormatButton from './FormatButton';
import UndoRedoButton from './UndoRedoButton';
import HeadingDropdown from './HeadingDropdown';
import ListDropdown from './ListDropdown';
import TextAlignButton from './TextAlignButton';
import BlockquoteButton from './BlockquoteButton';
import CodeBlockButton from './CodeBlockButton';
import TurnIntoDropdown from './TurnIntoDropdown';
import './editor-toolbar.css';
import '@/styles/simple-editor-components.css';
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
    <div className="editor-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', gap: '8px' }}>
      {/* Undo/Redo tout à gauche */}
      <div className="toolbar-group">
        <UndoRedoButton editor={editor} type="undo" />
        <UndoRedoButton editor={editor} type="redo" />
      </div>
      
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
        <FormatButton editor={editor} format="bold" title="Gras (Ctrl+B)" />
        <FormatButton editor={editor} format="italic" title="Italique (Ctrl+I)" />
        <FormatButton editor={editor} format="underline" title="Souligné (Ctrl+U)" />
        <FormatButton editor={editor} format="strike" title="Barré" />
        <FormatButton editor={editor} format="code" title="Code" />
      </div>
      <div className="toolbar-group">
        <ColorButton editor={editor} type="text" />
        <ColorButton editor={editor} type="highlight" />
      </div>
      <div className="toolbar-group">
        <TextAlignButton editor={editor} />
      </div>
      <div className="toolbar-group">
        <HeadingDropdown editor={editor} />
      </div>
      <div className="toolbar-group">
        <ListDropdown editor={editor} />
      </div>
      <div className="toolbar-group">
        <TurnIntoDropdown editor={editor} />
      </div>
      <div className="toolbar-group">
        <Tooltip text="Insérer un tableau"><button className="toolbar-button" disabled={isReadonly} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insérer un tableau"><MdGridOn size={18} style={{ borderRadius: 4 }} /></button></Tooltip>
        <BlockquoteButton editor={editor} />
        <CodeBlockButton editor={editor} />
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