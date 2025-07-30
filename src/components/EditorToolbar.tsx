import React, { useState, useRef, useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiList, FiCheckSquare, FiImage, FiMic, FiType, FiZap, FiSearch } from 'react-icons/fi';
import { AiOutlineOrderedList } from 'react-icons/ai';
import { MdGridOn, MdFormatQuote } from 'react-icons/md';
import { FiCode } from 'react-icons/fi';
import Tooltip from './Tooltip';

interface EditorToolbarProps {
  editor: {
    view: { dom: HTMLElement };
    chain: () => unknown;
    isActive: (type: string, attrs?: { level?: number }) => boolean;
  } | null;
  setImageMenuOpen: (open: boolean) => void;
  onFontChange?: (fontName: string) => void;
  currentFont?: string;
}

interface FontOption {
  name: string;
  label: string;
  category: 'sans-serif' | 'serif' | 'system';
  preview?: string;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, setImageMenuOpen, onFontChange, currentFont = 'Noto Sans' }) => {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  if (!editor) return null;
  
  const fonts: FontOption[] = [
    // Polices système modernes (garanties de fonctionner)
    { name: 'Inter', label: 'Inter', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Open Sans', label: 'Open Sans', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Roboto', label: 'Roboto', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Lato', label: 'Lato', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Source Sans 3', label: 'Source Sans 3', category: 'sans-serif', preview: 'AaBbCcDd' },
    { name: 'Work Sans', label: 'Work Sans', category: 'sans-serif', preview: 'AaBbCcDd' },
    
    // Polices système (fonctionnent toujours)
    { name: 'Arial', label: 'Arial', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Helvetica', label: 'Helvetica', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Verdana', label: 'Verdana', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Georgia', label: 'Georgia', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Palatino', label: 'Palatino', category: 'system', preview: 'AaBbCcDd' },
    { name: 'Times New Roman', label: 'Times New Roman', category: 'system', preview: 'AaBbCcDd' },
  ];
  
  // Fonction pour charger une police Google Fonts dynamiquement
  const loadGoogleFont = (fontName: string) => {
    return new Promise((resolve) => {
      // Vérifier si la police est déjà chargée
      if (document.fonts.check(`12px "${fontName}"`)) {
        console.log('[Font] Police déjà chargée:', fontName);
        resolve(true);
        return;
      }

      // Créer le lien pour charger la police
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@400&display=swap`;
      
      link.onload = () => {
        console.log('[Font] Police chargée avec succès:', fontName);
        resolve(true);
      };
      
      link.onerror = () => {
        console.log('[Font] Erreur de chargement de la police:', fontName);
        resolve(false);
      };
      
      document.head.appendChild(link);
    });
  };

  const setFont = async (fontName: string) => {
    // Log pour debug
    console.log('[Font] Application de la police:', fontName);
    
    // Charger la police Google Fonts si nécessaire
    if (fontName !== 'Arial' && fontName !== 'Helvetica' && fontName !== 'Verdana' && 
        fontName !== 'Georgia' && fontName !== 'Palatino' && fontName !== 'Times New Roman') {
      console.log('[Font] Chargement de la police Google Fonts:', fontName);
      await loadGoogleFont(fontName);
    }
    
    // Vérifier si la police est chargée
    const testElement = document.createElement('div');
    testElement.style.fontFamily = fontName;
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.textContent = 'Test';
    document.body.appendChild(testElement);
    
    const computedFont = window.getComputedStyle(testElement).fontFamily;
    console.log('[Font] Police calculée:', computedFont);
    
    document.body.removeChild(testElement);
    
    // Vérifier si la police est réellement chargée
    const isFontLoaded = computedFont.includes(fontName);
    console.log('[Font] Police chargée:', isFontLoaded);
    
    // MODIFIER LA VARIABLE CSS AU LIEU D'APPLIQUER DIRECTEMENT
    const fontWithFallback = `${fontName}, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif`;
    
    // Modifier la variable CSS globale
    document.documentElement.style.setProperty('--editor-font-family', fontWithFallback);
    console.log('[Font] Variable CSS modifiée:', fontWithFallback);
    
    // CIBLER SPÉCIFIQUEMENT L'ÉDITEUR PROSEMIRROR
    const editorElement = editor.view.dom;
    if (editorElement) {
      // Appliquer à l'élément principal de l'éditeur
      editorElement.style.setProperty('font-family', fontWithFallback, 'important');
      
      // Appliquer à TOUS les éléments de l'éditeur
      const allElements = editorElement.querySelectorAll('*');
      allElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.setProperty('font-family', fontWithFallback, 'important');
        }
      });
      
      console.log('[Font] Police appliquée à tous les éléments ProseMirror:', fontWithFallback);
    }
    
    // Notifie le parent du changement de police
    if (onFontChange) {
      onFontChange(fontName);
    }
    
    setFontMenuOpen(false);
    setSearchTerm('');
  };
  
  // Filtre les polices selon la recherche
  const filteredFonts = fonts.filter(font => 
    font.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Groupe les polices par catégorie
  const groupedFonts = filteredFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = [];
    }
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontOption[]>);
  
  // Ferme le menu de police quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.font-menu-container')) {
        setFontMenuOpen(false);
        setSearchTerm('');
      }
    };
    
    if (fontMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [fontMenuOpen]);
  
  // Focus sur la recherche quand le menu s'ouvre
  useEffect(() => {
    if (fontMenuOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [fontMenuOpen]);
  
  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fontMenuOpen) return;
      
      if (e.key === 'Escape') {
        setFontMenuOpen(false);
        setSearchTerm('');
      }
      
      if (e.key === 'Enter' && filteredFonts.length > 0) {
        setFont(filteredFonts[0].name);
      }
    };
    
    if (fontMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [fontMenuOpen, filteredFonts]);
  
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
            <div className="font-menu-dropdown">
              {/* Barre de recherche */}
              <div className="font-menu-search">
                <FiSearch size={14} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Rechercher une police..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="font-menu-search-input"
                />
              </div>
              
              {/* Liste des polices */}
              <div className="font-menu-list">
                {Object.entries(groupedFonts).map(([category, categoryFonts]) => (
                  <div key={category} className="font-menu-category">
                    <div className="font-menu-category-title">
                      {category === 'sans-serif' ? 'Sans-serif' : 
                       category === 'serif' ? 'Serif' : 'Système'}
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
                          <span className="font-menu-preview">{font.preview}</span>
                          <span className="font-menu-label">{font.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                
                {filteredFonts.length === 0 && (
                  <div className="font-menu-empty">
                    Aucune police trouvée
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Tooltip text="Gras (Ctrl+B)"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleBold().run()} aria-label="Gras"><FiBold size={18} /></button></Tooltip>
        <Tooltip text="Italique (Ctrl+I)"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleItalic().run()} aria-label="Italique"><FiItalic size={18} /></button></Tooltip>
        <Tooltip text="Souligné (Ctrl+U)"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleUnderline().run()} aria-label="Souligné"><FiUnderline size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Aligner à gauche"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().setTextAlign('left').run()} aria-label="Aligner à gauche"><FiAlignLeft size={18} /></button></Tooltip>
        <Tooltip text="Centrer"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().setTextAlign('center').run()} aria-label="Centrer"><FiAlignCenter size={18} /></button></Tooltip>
        <Tooltip text="Aligner à droite"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().setTextAlign('right').run()} aria-label="Aligner à droite"><FiAlignRight size={18} /></button></Tooltip>
        <Tooltip text="Justifier"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().setTextAlign('justify').run()} aria-label="Justifier"><FiAlignJustify size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Titre 1 (H1)"><button className={`toolbar-button${editor.isActive && editor.isActive('heading', { level: 1 }) ? ' active' : ''}`} onClick={() => (editor.chain() as any).focus().toggleHeading({ level: 1 }).run()} aria-label="Titre 1 (H1)">H1</button></Tooltip>
        <Tooltip text="Titre 2 (H2)"><button className={`toolbar-button${editor.isActive && editor.isActive('heading', { level: 2 }) ? ' active' : ''}`} onClick={() => (editor.chain() as any).focus().toggleHeading({ level: 2 }).run()} aria-label="Titre 2 (H2)">H2</button></Tooltip>
        <Tooltip text="Titre 3 (H3)"><button className={`toolbar-button${editor.isActive && editor.isActive('heading', { level: 3 }) ? ' active' : ''}`} onClick={() => (editor.chain() as any).focus().toggleHeading({ level: 3 }).run()} aria-label="Titre 3 (H3)">H3</button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Liste à puces"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleBulletList().run()} aria-label="Liste à puces"><FiList size={18} /></button></Tooltip>
        <Tooltip text="Liste numérotée"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleOrderedList().run()} aria-label="Liste numérotée"><AiOutlineOrderedList size={18} /></button></Tooltip>
        <Tooltip text="Cases à cocher"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleTaskList().run()} aria-label="Cases à cocher"><FiCheckSquare size={18} /></button></Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip text="Insérer un tableau"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insérer un tableau"><MdGridOn size={18} style={{ borderRadius: 4 }} /></button></Tooltip>
        <Tooltip text="Citation"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleBlockquote().run()} aria-label="Citation"><MdFormatQuote size={18} /></button></Tooltip>
        <Tooltip text="Bloc de code"><button className="toolbar-button" onClick={() => (editor.chain() as any).focus().toggleCodeBlock().run()} aria-label="Bloc de code"><FiCode size={18} /></button></Tooltip>
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