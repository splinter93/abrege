import React, { useState, useRef, useEffect } from 'react';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiAlignLeft, 
  FiAlignCenter, 
  FiAlignRight, 
  FiAlignJustify,
  FiCheckSquare,
  FiImage,
  FiMic,
  FiType,
  FiZap,
  FiChevronDown,
  FiSearch,
  FiCode,
  FiRotateCcw,
  FiRotateCw,
  FiMoreHorizontal
} from 'react-icons/fi';
import { AiOutlineOrderedList } from 'react-icons/ai';
import { MdGridOn, MdFormatQuote } from 'react-icons/md';
import Tooltip from '@/components/Tooltip';
import { logger, LogCategory } from '@/utils/logger';
import AudioRecorder from '@/components/chat/AudioRecorder';
import ColorButton from './ColorButton';
import ModernFormatButton from './ModernFormatButton';
import ModernUndoRedoButton from './ModernUndoRedoButton';
import SimpleHeadingButton from './SimpleHeadingButton';
import SimpleListButton from './SimpleListButton';
import SimpleAlignButton from './SimpleAlignButton';
import BlockquoteButton from './BlockquoteButton';
import CodeBlockButton from './CodeBlockButton';
import './modern-toolbar.css';
import '@/styles/simple-editor-components.css';
import type { FullEditorInstance } from '@/types/editor';

interface ModernToolbarProps {
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
}

const ModernToolbar: React.FC<ModernToolbarProps> = ({ 
  editor, 
  setImageMenuOpen, 
  onFontChange, 
  currentFont = 'Noto Sans', 
  onTranscriptionComplete 
}) => {
  const isReadonly = !editor;
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  
  // Polices simplifiées
  const fonts: FontOption[] = [
    { name: 'Noto Sans', label: 'Noto Sans', category: 'sans-serif' },
    { name: 'Inter', label: 'Inter', category: 'sans-serif' },
    { name: 'Roboto', label: 'Roboto', category: 'sans-serif' },
    { name: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
    { name: 'Lato', label: 'Lato', category: 'sans-serif' },
    { name: 'Poppins', label: 'Poppins', category: 'sans-serif' },
    { name: 'Georgia', label: 'Georgia', category: 'serif' },
    { name: 'Times New Roman', label: 'Times New Roman', category: 'serif' },
    { name: 'JetBrains Mono', label: 'JetBrains Mono', category: 'monospace' },
    { name: 'Fira Code', label: 'Fira Code', category: 'monospace' },
  ];

  // Filtrer les polices
  const filteredFonts = fonts.filter(font =>
    font.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setColorMenuOpen(false);
      }
    };

    if (fontMenuOpen || colorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fontMenuOpen, colorMenuOpen]);

  // Focus sur l'input de recherche
  useEffect(() => {
    if (fontMenuOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [fontMenuOpen]);

  const setFont = (fontName: string) => {
    if (onFontChange) {
      onFontChange(fontName);
    }
    setFontMenuOpen(false);
    setSearchTerm('');
  };

  const currentFontData = fonts.find(f => f.name === currentFont) || fonts[0];

  return (
    <div className="modern-toolbar">
      {/* Section principale - Outils essentiels */}
      <div className="toolbar-main">
        {/* Groupe gauche - Formatage de base */}
        <div className="toolbar-group-left">
          {/* Undo/Redo */}
          <div className="toolbar-section">
            <ModernUndoRedoButton editor={editor} type="undo" />
            <ModernUndoRedoButton editor={editor} type="redo" />
          </div>

          {/* Séparateur */}
          <div className="toolbar-separator" />

          {/* Menu de police */}
          {onFontChange && (
            <div className="toolbar-section font-section" ref={fontMenuRef}>
              <Tooltip text="Changer la police">
                <button
                  className="toolbar-btn"
                  onClick={() => setFontMenuOpen(!fontMenuOpen)}
                  disabled={isReadonly}
                  aria-label="Sélectionner une police"
                >
                  <FiType size={16} />
                </button>
              </Tooltip>
              
              {fontMenuOpen && (
                <div className="font-dropdown">
                  <div className="font-search">
                    <FiSearch size={14} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="font-search-input"
                      placeholder="Rechercher une police..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="font-list">
                    {filteredFonts.map((font) => {
                      const isSelected = font.name === currentFont;
                      return (
                        <button
                          key={font.name}
                          onClick={() => setFont(font.name)}
                          className={`font-item ${isSelected ? 'selected' : ''}`}
                          style={{ fontFamily: font.name }}
                        >
                          <span className="font-name">{font.label}</span>
                          <span className="font-category">{font.category}</span>
                        </button>
                      );
                    })}
                    {filteredFonts.length === 0 && (
                      <div className="font-empty">Aucune police trouvée</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formatage de base */}
          <div className="toolbar-section">
            <ModernFormatButton editor={editor} format="bold" title="Gras" shortcut="Ctrl+B" />
            <ModernFormatButton editor={editor} format="italic" title="Italique" shortcut="Ctrl+I" />
            <ModernFormatButton editor={editor} format="underline" title="Souligné" shortcut="Ctrl+U" />
          </div>

          {/* Couleurs */}
          <div className="toolbar-section">
            <ColorButton editor={editor} type="text" />
            <ColorButton editor={editor} type="highlight" />
          </div>

          {/* Alignement */}
          <div className="toolbar-section">
            <SimpleAlignButton editor={editor} />
          </div>
        </div>

        {/* Groupe centre - Structure */}
        <div className="toolbar-group-center">
          {/* Titres et paragraphes */}
          <div className="toolbar-section">
            <SimpleHeadingButton editor={editor} />
          </div>

          {/* Listes */}
          <div className="toolbar-section">
            <SimpleListButton editor={editor} />
          </div>

          {/* Blocs */}
          <div className="toolbar-section">
            <BlockquoteButton editor={editor} />
            <CodeBlockButton editor={editor} />
          </div>
        </div>

        {/* Groupe droite - Outils avancés */}
        <div className="toolbar-group-right">
          {/* Outils avancés */}
          <div className="toolbar-section">
            <Tooltip text="Insérer un tableau">
              <button 
                className="toolbar-btn" 
                disabled={isReadonly} 
                onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
                aria-label="Insérer un tableau"
              >
                <MdGridOn size={16} />
              </button>
            </Tooltip>
            
            <Tooltip text="Image">
              <button 
                className="toolbar-btn" 
                disabled={isReadonly} 
                onClick={() => setImageMenuOpen(true)} 
                aria-label="Image"
              >
                <FiImage size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Outils IA */}
          <div className="toolbar-section">
            <Tooltip text="Dictaphone IA">
              <AudioRecorder
                onTranscriptionComplete={onTranscriptionComplete || (() => {})}
                onError={(error) => logger.error(LogCategory.EDITOR, 'Erreur dictée:', error)}
                disabled={isReadonly}
                variant="toolbar"
              />
            </Tooltip>
            
            {/* Bouton "Plus" pour les outils secondaires */}
            <Tooltip text="Plus d'outils">
              <button 
                className={`toolbar-btn more-btn ${showMoreTools ? 'active' : ''}`}
                onClick={() => setShowMoreTools(!showMoreTools)}
                aria-label="Plus d'outils"
              >
                <FiMoreHorizontal size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Éclair tout à droite */}
          <div className="toolbar-section">
            <Tooltip text="Agent IA">
              <button className="toolbar-btn ai-btn" disabled={isReadonly}>
                <FiZap size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Section des outils avancés (collapsible) */}
      {showMoreTools && (
        <div className="toolbar-advanced">
          {/* Outils avancés supplémentaires */}
        </div>
      )}
    </div>
  );
};

export default ModernToolbar;
