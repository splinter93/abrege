"use client";
import React, { useState, useRef, useEffect } from 'react';

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

  const handleHistoryLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value);
    onHistoryLimitChange(newLimit);
  };

  return (
    <div className="chat-kebab-menu" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="kebab-button"
        aria-label="Menu des options"
        aria-expanded={isOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="kebab-dropdown">
          <button
            onClick={handleWideModeToggle}
            className="kebab-option"
            aria-label={isWideMode ? "Passer en mode normal" : "Passer en mode large"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isWideMode ? (
                // Icon for normal mode (narrow)
                <path d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                // Icon for wide mode (expand)
                <path d="M2 6h20M2 12h20M2 18h20" />
              )}
            </svg>
            <span>{isWideMode ? "Mode Normal" : "Mode Large"}</span>
          </button>
          
          <button
            onClick={handleFullscreenToggle}
            className="kebab-option"
            aria-label={isFullscreen ? "Quitter le mode plein écran" : "Passer en mode plein écran"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isFullscreen ? (
                // Icon for exit fullscreen
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              ) : (
                // Icon for enter fullscreen
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 1 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              )}
            </svg>
            <span>{isFullscreen ? "Quitter Plein Écran" : "Plein Écran"}</span>
          </button>

          <div className="kebab-option history-limit-selector">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Historique:</span>
            <select 
              value={historyLimit} 
              onChange={handleHistoryLimitChange}
              className="history-limit-select"
              onClick={(e) => e.stopPropagation()}
            >
              <option value={5}>5 messages</option>
              <option value={10}>10 messages</option>
              <option value={15}>15 messages</option>
              <option value={20}>20 messages</option>
              <option value={30}>30 messages</option>
              <option value={50}>50 messages</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatKebabMenu; 