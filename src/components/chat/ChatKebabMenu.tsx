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
            <div className="kebab-theme-options">
              {mounted && availableThemes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => handleThemeChange(themeOption.value)}
                  className={`kebab-theme-option ${theme === themeOption.value ? 'active' : ''}`}
                  disabled={disabled}
                  aria-label={themeOption.label}
                >
                  <span className="kebab-theme-icon">{themeOption.icon}</span>
                  <span className="kebab-theme-label">{themeOption.label}</span>
                  {theme === themeOption.value && (
                    <span className="kebab-theme-check">✓</span>
                  )}
                </button>
              ))}
            </div>
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
