/**
 * FontSelector - Sélecteur de police avec recherche et scope
 * @module components/editor/FontSelector
 */

import React, { useState, useRef, useEffect } from 'react';
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
  const [fontScope, setFontScope] = useState<'all' | 'headings' | 'body'>('all');
  const menuRef = useRef<HTMLDivElement>(null);

  const currentFontData = FONTS.find(f => f.name === currentFont) || FONTS[0];

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

  const handleFontSelect = (fontName: string) => {
    if (onFontChange) {
      onFontChange(fontName, fontScope);
    }
    setIsOpen(false);
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
            {FONTS.map((font) => (
              <button
                key={font.name}
                className={`font-selector__item ${currentFont === font.name ? 'selected' : ''}`}
                onClick={() => handleFontSelect(font.name)}
              >
                <span className="font-selector__item-name">{font.label}</span>
                <span className="font-selector__item-category">{font.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontSelector;

