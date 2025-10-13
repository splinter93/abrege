/**
 * Menu Ask AI - Actions IA sur le texte sélectionné
 * @module components/editor/AskAIMenu
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  FiEdit3,
  FiMessageSquare,
  FiCheckCircle,
  FiCode,
  FiGlobe,
  FiTrendingUp,
  FiAlertCircle,
  FiList
} from 'react-icons/fi';
import './ask-ai-menu.css';

interface AskAIMenuProps {
  editor: Editor;
  selectedText: string;
  onClose: () => void;
  onAskAI?: (prompt: string, selectedText: string) => void;
}

const AskAIMenu: React.FC<AskAIMenuProps> = ({ 
  editor, 
  selectedText,
  onClose, 
  onAskAI 
}) => {
  const handleAction = (prompt: string) => {
    if (onAskAI) {
      onAskAI(prompt, selectedText);
    }
    onClose();
  };

  const aiActions = [
    {
      id: 'improve',
      icon: FiTrendingUp,
      label: 'Améliorer l\'écriture',
      prompt: 'Améliore ce texte en le rendant plus clair et professionnel'
    },
    {
      id: 'fix',
      icon: FiCheckCircle,
      label: 'Corriger orthographe',
      prompt: 'Corrige l\'orthographe et la grammaire de ce texte'
    },
    {
      id: 'simplify',
      icon: FiEdit3,
      label: 'Simplifier',
      prompt: 'Simplifie ce texte pour le rendre plus accessible'
    },
    {
      id: 'expand',
      icon: FiMessageSquare,
      label: 'Développer',
      prompt: 'Développe et enrichis ce texte avec plus de détails'
    },
    {
      id: 'summarize',
      icon: FiList,
      label: 'Résumer',
      prompt: 'Résume ce texte de manière concise'
    },
    {
      id: 'translate',
      icon: FiGlobe,
      label: 'Traduire',
      prompt: 'Traduis ce texte en anglais'
    },
    {
      id: 'explain',
      icon: FiAlertCircle,
      label: 'Expliquer',
      prompt: 'Explique ce concept de manière simple et claire'
    },
    {
      id: 'code',
      icon: FiCode,
      label: 'Générer du code',
      prompt: 'Génère du code basé sur cette description'
    }
  ];

  return (
    <div className="ask-ai-menu">
      <div className="ask-ai-header">
        <span>Actions IA</span>
      </div>
      <div className="ask-ai-items">
        {aiActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className="ask-ai-item"
              onClick={() => handleAction(action.prompt)}
            >
              <Icon size={16} className="ask-ai-item-icon" />
              <span className="ask-ai-item-label">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AskAIMenu;

