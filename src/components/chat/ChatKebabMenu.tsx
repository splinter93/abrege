"use client";
import React, { useState, useRef, useEffect } from 'react';

interface ChatKebabMenuProps {
  isWideMode: boolean;
  isFullscreen: boolean;
  onToggleWideMode: () => void;
  onToggleFullscreen: () => void;
}

const ChatKebabMenu: React.FC<ChatKebabMenuProps> = ({ isWideMode, isFullscreen, onToggleWideMode, onToggleFullscreen }) => {
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
        </div>
      )}
    </div>
  );
};

export default ChatKebabMenu; 