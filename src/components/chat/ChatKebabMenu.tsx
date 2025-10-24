"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useTheme, CHAT_THEMES, type ChatTheme } from '@/hooks/useTheme';
import './ChatKebabMenu.css';

interface ChatKebabMenuProps {
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
  disabled?: boolean;
}

const ChatKebabMenu: React.FC<ChatKebabMenuProps> = ({ 
  historyLimit,
  onHistoryLimitChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // LLM Provider state
  const { selectedAgent } = useChatStore();
  
  // Theme state
  const { theme, setTheme, availableThemes, mounted } = useTheme();
  
  // ✅ SUPPRIMÉ: Hook pour les préférences de streaming (faux streaming)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleFullscreenToggle = () => {
    if (disabled) return;
    // TODO: Implémenter toggle fullscreen
    setIsOpen(false);
  };


  const handleHistoryLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newLimit = parseInt(event.target.value);
    if (!isNaN(newLimit) && newLimit > 0 && newLimit <= 100) {
      onHistoryLimitChange(newLimit);
    }
  };

  const handleThemeChange = (newTheme: ChatTheme) => {
    if (disabled) return;
    setTheme(newTheme);
  };

  // Font state
  const [selectedFont, setSelectedFont] = useState<string>('figtree');
  const [selectedColorPalette, setSelectedColorPalette] = useState<string>('soft-dark');

  // 🎨 PALETTES DE COULEURS PRÉDÉFINIES
  const availableColorPalettes = [
    { 
      value: 'soft-dark', 
      label: 'Sombre Doux', 
      preview: '🌙',
      colors: {
        '--chat-text-primary': '#b5bcc4',
        '--chat-text-secondary': '#a3a9b2', 
        '--chat-text-muted': '#7a8088'
      }
    },
    { 
      value: 'warm-dark', 
      label: 'Sombre Chaud', 
      preview: '🔥',
      colors: {
        '--chat-text-primary': '#d4c5a9',
        '--chat-text-secondary': '#c4b599',
        '--chat-text-muted': '#9a8b6f'
      }
    },
    { 
      value: 'cool-dark', 
      label: 'Sombre Froid', 
      preview: '❄️',
      colors: {
        '--chat-text-primary': '#a8b8d8',
        '--chat-text-secondary': '#9aa8c8',
        '--chat-text-muted': '#6b7a9a'
      }
    },
    { 
      value: 'high-contrast', 
      label: 'Contraste Élevé', 
      preview: '⚡',
      colors: {
        '--chat-text-primary': '#ffffff',
        '--chat-text-secondary': '#e5e5e5',
        '--chat-text-muted': '#a0a0a0'
      }
    }
  ];

  useEffect(() => {
    // Charger la font sauvegardée et l'appliquer
    const savedFont = localStorage.getItem('chat-font-preference');
    if (savedFont) {
      setSelectedFont(savedFont);
      // Appliquer immédiatement
      const fontMap: Record<string, string> = {
        'figtree': "'Figtree', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        'geist': "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        'noto-sans': "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        'manrope': "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      };
      document.documentElement.style.setProperty('--font-chat-base', fontMap[savedFont]);
    }

    // Charger la palette de couleurs sauvegardée et l'appliquer
    const savedColors = localStorage.getItem('chat-color-preference');
    if (savedColors) {
      setSelectedColorPalette(savedColors);
      // Appliquer la palette par défaut (soft-dark) si pas trouvée
      const palette = availableColorPalettes.find(p => p.value === savedColors) || availableColorPalettes[0];
      if (palette) {
        Object.entries(palette.colors).forEach(([property, value]) => {
          document.documentElement.style.setProperty(property, value);
        });
      }
    }
  }, []);

  const availableFonts = [
    { value: 'figtree', label: 'Figtree', preview: 'Figtree' },
    { value: 'geist', label: 'Geist', preview: 'Geist' },
    { value: 'inter', label: 'Inter', preview: 'Inter' },
    { value: 'noto-sans', label: 'Noto Sans', preview: 'Noto Sans' },
    { value: 'manrope', label: 'Manrope', preview: 'Manrope' },
  ];

  const handleFontChange = (fontValue: string) => {
    if (disabled) return;
    setSelectedFont(fontValue);
    localStorage.setItem('chat-font-preference', fontValue);
    
    // Appliquer la font via CSS variable
    const fontMap: Record<string, string> = {
      'figtree': "'Figtree', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'geist': "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'noto-sans': "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'manrope': "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    };
    
    document.documentElement.style.setProperty('--font-chat-base', fontMap[fontValue]);
  };

  const handleColorPaletteChange = (paletteValue: string) => {
    if (disabled) return;
    setSelectedColorPalette(paletteValue);
    localStorage.setItem('chat-color-preference', paletteValue);
    
    const palette = availableColorPalettes.find(p => p.value === paletteValue);
    if (palette) {
      Object.entries(palette.colors).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
      });
    }
  };

  return (
    <div className="chat-kebab-menu" ref={menuRef}>
      <button
        onClick={handleToggle}
        className={`kebab-button ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Menu des options"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="kebab-dropdown">
          {/* Quitter Plein écran */}
          <button
            onClick={handleFullscreenToggle}
            className="kebab-option"
            aria-label="Quitter le mode plein écran"
            disabled={disabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
            <span>Quitter Plein écran</span>
          </button>


          {/* Historique des messages réglable */}
          <div className="kebab-input-group">
            <label className="kebab-input-label">Historique des messages réglable</label>
            <input 
              type="number"
              value={historyLimit} 
              onChange={handleHistoryLimitChange}
              className="kebab-input"
              min="1"
              max="100"
              placeholder="10"
              disabled={disabled}
            />
          </div>

          {/* Sélecteur de thème */}
          <div className="kebab-section">
            <label className="kebab-section-label">Thème d'affichage</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as ChatTheme)}
              className="kebab-font-select"
              disabled={disabled || !mounted}
            >
              {availableThemes.map((themeOption) => (
                <option 
                  key={themeOption.value} 
                  value={themeOption.value}
                >
                  {themeOption.icon} {themeOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de police */}
          <div className="kebab-section">
            <label className="kebab-section-label">Police de caractères</label>
            <select
              value={selectedFont}
              onChange={(e) => handleFontChange(e.target.value)}
              className="kebab-font-select"
              disabled={disabled}
            >
              {availableFonts.map((font) => (
                <option 
                  key={font.value} 
                  value={font.value}
                  style={{ fontFamily: font.preview }}
                >
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de palette de couleurs */}
          <div className="kebab-section">
            <label className="kebab-section-label">Palette de couleurs</label>
            <select
              value={selectedColorPalette}
              onChange={(e) => handleColorPaletteChange(e.target.value)}
              className="kebab-font-select"
              disabled={disabled}
            >
              {availableColorPalettes.map((palette) => (
                <option 
                  key={palette.value} 
                  value={palette.value}
                >
                  {palette.preview} {palette.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modèle */}
          <div className="kebab-option">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a2 2 0 00-2 2v2H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2z"/>
            </svg>
            <span>Modèle: {selectedAgent?.model || 'Non défini'}</span>
          </div>

          {/* Provider */}
          <div className="kebab-option">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Provider: {selectedAgent?.provider || 'Non défini'}</span>
          </div>

          {/* ✅ SUPPRIMÉ: Section Streaming (faux streaming) */}
        </div>
      )}
    </div>
  );
};

export default ChatKebabMenu;// Force rebuild - Thu Aug 14 15:05:54 CEST 2025
