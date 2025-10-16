/**
 * AIButton - Bouton Agent IA avec style spécial
 * @module components/editor/AIButton
 */

import React from 'react';
import { FiZap } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface AIButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

const AIButton: React.FC<AIButtonProps> = ({ disabled = false, onClick }) => {
  return (
    <Tooltip text="Agent IA">
      <button 
        className="toolbar-btn toolbar-btn--ai" 
        disabled={disabled}
        onClick={onClick}
        aria-label="Ouvrir l'agent IA"
      >
        <FiZap size={16} />
      </button>
    </Tooltip>
  );
};

export default AIButton;

