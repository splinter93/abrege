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
// Ordre critique : variables de base en premier
import '@/styles/variables.css';
import '@/styles/design-system.css';
import '@/styles/typography.css';
import '@/styles/glassmorphism-variables.css';
import './modern-toolbar.css';
import '@/styles/simple-editor-components.css';
import '@/styles/unified-blocks.css'; // Système unifié pour tous les blocs
import type { FullEditorInstance } from '@/types/editor';

interface ModernToolbarProps {
  editor: FullEditorInstance | null;
  setImageMenuOpen: (open: boolean) => void;
  onFontChange?: (fontName: string, scope?: 'all' | 'headings' | 'body') => void;
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
  const [fontScope, setFontScope] = useState<'all' | 'headings' | 'body'>('all');
  const [audioError, setAudioError] = useState<string | null>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  
  // Polices disponibles dans l'éditeur
  const fonts: FontOption[] = [
    // Sans-serif modernes
    { name: 'Noto Sans', label: 'Noto Sans', category: 'sans-serif' },
    { name: 'Inter', label: 'Inter', category: 'sans-serif' },
    { name: 'Roboto', label: 'Roboto', category: 'sans-serif' },
    { name: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
    { name: 'Lato', label: 'Lato', category: 'sans-serif' },
    { name: 'Poppins', label: 'Poppins', category: 'sans-serif' },
    { name: 'Figtree', label: 'Figtree', category: 'sans-serif' },
    { name: 'Work Sans', label: 'Work Sans', category: 'sans-serif' },
    { name: 'Source Sans Pro', label: 'Source Sans Pro', category: 'sans-serif' },
    { name: 'Ubuntu', label: 'Ubuntu', category: 'sans-serif' },
    { name: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
    { name: 'Raleway', label: 'Raleway', category: 'sans-serif' },
    
    // Serif classiques
    { name: 'Georgia', label: 'Georgia', category: 'serif' },
    { name: 'Times New Roman', label: 'Times New Roman', category: 'serif' },
    { name: 'EB Garamond', label: 'EB Garamond', category: 'serif' },
    { name: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif' },
    
    // Monospace pour le code
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
      onFontChange(fontName, fontScope);
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
          <ModernUndoRedoButton editor={editor} type="undo" />
          <ModernUndoRedoButton editor={editor} type="redo" />

          {/* Séparateur */}
          <div className="toolbar-separator" />

          {/* Sélecteur de police */}
          <div className="font-section" ref={fontMenuRef}>
            <Tooltip text="Police">
              <button 
                className="font-btn" 
                onClick={() => setFontMenuOpen(!fontMenuOpen)}
                disabled={isReadonly}
              >
                <span className="font-label">{currentFontData.label}</span>
                <FiChevronDown size={14} className="chevron" />
              </button>
            </Tooltip>
            
            {fontMenuOpen && (
              <div className="font-dropdown">
                {/* Recherche de police */}
                <div className="font-search">
                  <FiSearch size={16} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Rechercher une police..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="font-search-input"
                  />
                </div>

                {/* Options de scope */}
                <div className="font-scope-options">
                  <button
                    className={`font-scope-btn ${fontScope === 'all' ? 'active' : ''}`}
                    onClick={() => setFontScope('all')}
                  >
                    Tout
                  </button>
                  <button
                    className={`font-scope-btn ${fontScope === 'headings' ? 'active' : ''}`}
                    onClick={() => setFontScope('headings')}
                  >
                    Titres
                  </button>
                  <button
                    className={`font-scope-btn ${fontScope === 'body' ? 'active' : ''}`}
                    onClick={() => setFontScope('body')}
                  >
                    Corps
                  </button>
                </div>

                {/* Liste des polices */}
                <div className="font-list">
                  {filteredFonts.length > 0 ? (
                    filteredFonts.map((font) => (
                      <button
                        key={font.name}
                        className={`font-item ${currentFont === font.name ? 'selected' : ''}`}
                        onClick={() => setFont(font.name)}
                      >
                        <span className="font-name">{font.label}</span>
                        <span className="font-category">{font.category}</span>
                      </button>
                    ))
                  ) : (
                    <div className="font-empty">Aucune police trouvée</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Formatage de base */}
          <ModernFormatButton editor={editor} format="bold" title="Gras" shortcut="Ctrl+B" />
          <ModernFormatButton editor={editor} format="italic" title="Italique" shortcut="Ctrl+I" />
          <ModernFormatButton editor={editor} format="underline" title="Souligné" shortcut="Ctrl+U" />

          {/* Couleurs */}
          <ColorButton editor={editor} type="text" />
          <ColorButton editor={editor} type="highlight" />

          {/* Séparateur */}
          <div className="toolbar-separator" />

          {/* Alignement */}
          <SimpleAlignButton editor={editor} />
        </div>

        {/* Groupe centre - Structure */}
        <div className="toolbar-group-center">
          {/* Titres et paragraphes */}
          <SimpleHeadingButton editor={editor} />

          {/* Listes */}
          <SimpleListButton editor={editor} />

          {/* Blocs */}
          <BlockquoteButton editor={editor} />
          <CodeBlockButton editor={editor} />
        </div>

        {/* Groupe droite - Outils avancés */}
        <div className="toolbar-group-right">
          {/* Outils avancés */}
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

          {/* Outils IA */}
          <Tooltip text="Dictaphone IA">
            <AudioRecorder 
              onTranscriptionComplete={onTranscriptionComplete || (() => {})}
              onError={setAudioError}
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

          {/* Éclair tout à droite */}
          <Tooltip text="Agent IA">
            <button className="toolbar-btn ai-btn" disabled={isReadonly}>
              <FiZap size={16} />
            </button>
          </Tooltip>
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
