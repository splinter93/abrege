/**
 * Menu slash commands pour le chat
 * Affiche les prompts disponibles filtrés par query
 * @module components/chat/SlashMenu
 */

'use client';
import React from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import { getIconComponent } from '@/utils/iconMapper';

interface SlashMenuProps {
  // État
  showSlashMenu: boolean;
  filteredPrompts: EditorPrompt[];
  
  // Actions
  onSelectPrompt: (prompt: EditorPrompt) => void;
}

/**
 * Composant SlashMenu
 * Affiche un menu dropdown avec les prompts disponibles
 */
const SlashMenu: React.FC<SlashMenuProps> = ({
  showSlashMenu,
  filteredPrompts,
  onSelectPrompt
}) => {
  if (!showSlashMenu) return null;

  return (
    <div className="chat-slash-menu">
      <div className="chat-note-list-header">
        Prompts disponibles
      </div>
      <div className="chat-note-list">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((prompt) => {
            const PromptIcon = getIconComponent(prompt.icon);
            return (
              <button
                key={prompt.id}
                className="chat-note-item"
                onClick={() => onSelectPrompt(prompt)}
              >
                <PromptIcon size={16} style={{ flexShrink: 0, color: 'var(--chat-text-secondary)' }} />
                <div className="chat-note-item-content">
                  <div className="chat-note-item-title">{prompt.name}</div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="chat-note-list-empty">
            Aucun prompt trouvé
          </div>
        )}
      </div>
    </div>
  );
};

// Mémoisation pour éviter re-renders inutiles
export default React.memo(SlashMenu);

