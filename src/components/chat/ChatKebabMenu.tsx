"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useLLMStore } from '@/store/useLLMStore';
import { useChatStore } from '@/store/useChatStore';
import './ChatKebabMenu.css';
import { simpleLogger as logger } from '@/utils/logger';

interface ChatKebabMenuProps {
  isWideMode: boolean;
  isFullscreen: boolean;
  historyLimit: number;
  onToggleWideMode: () => void;
  onToggleFullscreen: () => void;
  onHistoryLimitChange: (limit: number) => void;
}

const ChatKebabMenu: React.FC<ChatKebabMenuProps> = ({ 
  isWideMode, 
  isFullscreen, 
  historyLimit,
  onToggleWideMode, 
  onToggleFullscreen,
  onHistoryLimitChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // LLM Provider state
  const { currentProvider, availableProviders, setProvider } = useLLMStore();
  const { selectedAgent } = useChatStore();

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
    setIsOpen(!isOpen);
  };

  const handleWideModeToggle = () => {
    onToggleWideMode();
    setIsOpen(false);
  };

  const handleFullscreenToggle = () => {
    onToggleFullscreen();
    setIsOpen(false);
  };

  const handleHistoryLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value);
    if (!isNaN(newLimit) && newLimit > 0 && newLimit <= 100) {
      onHistoryLimitChange(newLimit);
    }
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = event.target.value;
    setProvider(newProvider);
    logger.dev(`[ChatKebabMenu] 🔄 Provider changé: ${newProvider}`);
  };

  return (
    <div className="chat-kebab-menu" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="kebab-button"
        aria-label="Menu des options"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="kebab-dropdown">
          {/* Section Affichage */}
          <div className="kebab-section">
            <div className="kebab-section-title">Affichage</div>
            
            <button
              onClick={handleWideModeToggle}
              className="kebab-option"
              aria-label={isWideMode ? "Passer en mode normal" : "Passer en mode large"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isWideMode ? (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                ) : (
                  <path d="M2 6h20M2 12h20M2 18h20" />
                )}
              </svg>
              <span>{isWideMode ? "Mode Normal" : "Mode Large"}</span>
              <div className="badge">{isWideMode ? "Normal" : "Large"}</div>
            </button>
            
            <button
              onClick={handleFullscreenToggle}
              className="kebab-option"
              aria-label={isFullscreen ? "Quitter le mode plein écran" : "Passer en mode plein écran"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isFullscreen ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                ) : (
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 1 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                )}
              </svg>
              <span>{isFullscreen ? "Quitter Plein Écran" : "Plein Écran"}</span>
            </button>
          </div>

          {/* Section Configuration */}
          <div className="kebab-section">
            <div className="kebab-section-title">Configuration</div>
            
            <div className="kebab-input-group">
              <label className="kebab-input-label">Limite d'historique</label>
              <input 
                type="number"
                value={historyLimit} 
                onChange={handleHistoryLimitChange}
                className="kebab-input"
                min="1"
                max="100"
                placeholder="10"
              />
            </div>

            <div className="kebab-input-group">
              <label className="kebab-input-label">
                Provider IA
                {selectedAgent && (
                  <span className="agent-override-indicator">
                    (Agent: {selectedAgent.name})
                  </span>
                )}
              </label>
              <select 
                value={currentProvider} 
                onChange={handleProviderChange}
                className="kebab-select"
                disabled={!!selectedAgent}
                title={selectedAgent ? `Provider forcé par l'agent ${selectedAgent.name}` : 'Choisir le provider'}
              >
                <option value="synesia">🤖 Synesia</option>
                <option value="deepseek">🔍 DeepSeek</option>
              </select>
              {selectedAgent && (
                <div className="agent-override-message">
                  Provider forcé par l'agent sélectionné
                </div>
              )}
            </div>
          </div>

          {/* Section Statut */}
          <div className="kebab-section">
            <div className="kebab-section-title">Statut</div>
            
            <div className="kebab-option">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Connecté</span>
              <div className="status-indicator"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatKebabMenu; 