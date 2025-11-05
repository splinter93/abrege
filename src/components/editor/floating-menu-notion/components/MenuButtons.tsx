/**
 * Boutons de formatage du menu flottant
 */

import React from 'react';
import type { FormatCommand } from '../types';

interface MenuButtonsProps {
  commands: FormatCommand[];
  isExecuting: boolean;
}

export const MenuButtons: React.FC<MenuButtonsProps> = ({ commands, isExecuting }) => {
  return (
    <>
      {commands.map((command) => {
        const Icon = command.icon;
        const isActive = command.isActive?.() || false;

        return (
          <button
            key={command.id}
            className={`floating-menu-button ${isActive ? 'active' : ''}`}
            onClick={command.action}
            title={command.label}
            aria-label={command.label}
          >
            {Icon && <Icon size={16} />}
            <span className="button-label">{command.label}</span>
          </button>
        );
      })}

      {isExecuting && (
        <div className="streaming-indicator">
          <span>L'IA écrit</span>
          <div className="streaming-dots">
            <div className="streaming-dot"></div>
            <div className="streaming-dot"></div>
            <div className="streaming-dot"></div>
          </div>
        </div>
      )}
    </>
  );
};

