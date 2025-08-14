'use client';
import React, { useState } from 'react';
import ChatFullscreenV2 from './ChatFullscreenV2';
import ChatWidget from './ChatWidget';

interface ChatModeToggleProps {
  defaultMode?: 'fullscreen' | 'widget';
  widgetPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  widgetSize?: 'small' | 'medium' | 'large';
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({
  defaultMode = 'fullscreen',
  widgetPosition = 'bottom-right',
  widgetSize = 'medium'
}) => {
  const [mode, setMode] = useState<'fullscreen' | 'widget'>(defaultMode);
  const [widgetOpen, setWidgetOpen] = useState(defaultMode === 'widget');

  const handleModeChange = (newMode: 'fullscreen' | 'widget') => {
    setMode(newMode);
    if (newMode === 'widget') {
      setWidgetOpen(true);
    }
  };

  // Si on est en mode fullscreen, afficher le chat fullscreen
  if (mode === 'fullscreen') {
    return (
      <div style={{ position: 'relative' }}>
        <ChatFullscreenV2 />
        
        {/* Bouton pour passer en mode widget */}
        <button
          onClick={() => handleModeChange('widget')}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'var(--chat-accent-primary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Passer en mode widget"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Si on est en mode widget, afficher le widget
  return (
    <ChatWidget
      isOpen={widgetOpen}
      onToggle={setWidgetOpen}
      position={widgetPosition}
      size={widgetSize}
    />
  );
};

export default ChatModeToggle; 