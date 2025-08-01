"use client";
import React, { useState, useRef, useEffect } from 'react';

interface ChatKebabMenuProps {
  isWideMode: boolean;
  onToggleWideMode: () => void;
}

const ChatKebabMenu: React.FC<ChatKebabMenuProps> = ({ isWideMode, onToggleWideMode }) => {
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
        </div>
      )}
    </div>
  );
};

export default ChatKebabMenu; 