/**
 * FontSelector - Sélecteur de police avec recherche et scope
 * @module components/editor/FontSelector
 */

import React, { useState, useRef, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface FontOption {
  name: string;
  label: string;
  category: 'sans-serif' | 'serif' | 'system' | 'monospace';
}

interface FontSelectorProps {
  currentFont?: string;
  onFontChange?: (fontName: string, scope?: 'all' | 'headings' | 'body') => void;
  disabled?: boolean;
}

const FONTS: FontOption[] = [
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

const FontSelector: React.FC<FontSelectorProps> = ({
  currentFont = 'Noto Sans',
  onFontChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fontScope, setFontScope] = useState<'all' | 'headings' | 'body'>('all');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentFontData = FONTS.find(f => f.name === currentFont) || FONTS[0];
  const filteredFonts = FONTS.filter(font =>
    font.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleFontSelect = (fontName: string) => {
    if (onFontChange) {
      onFontChange(fontName, fontScope);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="font-selector" ref={menuRef}>
      <Tooltip text="Police">
        <button 
          className="font-selector__trigger" 
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          aria-label="Sélectionner une police"
          aria-expanded={isOpen}
        >
          <span className="font-selector__label">{currentFontData.label}</span>
        </button>
      </Tooltip>
      
      {isOpen && (
        <div className="font-selector__dropdown">
          <div className="font-selector__search">
            <FiSearch size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une police..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="font-selector__search-input"
            />
          </div>

          <div className="font-selector__scope">
            <button
              className={`font-selector__scope-btn ${fontScope === 'all' ? 'active' : ''}`}
              onClick={() => setFontScope('all')}
            >
              Tout
            </button>
            <button
              className={`font-selector__scope-btn ${fontScope === 'headings' ? 'active' : ''}`}
              onClick={() => setFontScope('headings')}
            >
              Titres
            </button>
            <button
              className={`font-selector__scope-btn ${fontScope === 'body' ? 'active' : ''}`}
              onClick={() => setFontScope('body')}
            >
              Corps
            </button>
          </div>

          <div className="font-selector__list">
            {filteredFonts.length > 0 ? (
              filteredFonts.map((font) => (
                <button
                  key={font.name}
                  className={`font-selector__item ${currentFont === font.name ? 'selected' : ''}`}
                  onClick={() => handleFontSelect(font.name)}
                >
                  <span className="font-selector__item-name">{font.label}</span>
                  <span className="font-selector__item-category">{font.category}</span>
                </button>
              ))
            ) : (
              <div className="font-selector__empty">Aucune police trouvée</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontSelector;

