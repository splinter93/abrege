/**
 * Menu slash commands pour le chat
 * Affiche les prompts disponibles filtrés par query
 * ✅ REFACTO : Navigation clavier (↑↓ Enter Esc) comme MentionMenu
 * @module components/chat/SlashMenu
 */

'use client';
import React, { useEffect, useRef } from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import { getIconComponent } from '@/utils/iconMapper';

interface SlashMenuProps {
  // État
  show: boolean;
  filteredPrompts: EditorPrompt[];
  
  // Position du menu (calculée depuis textarea)
  position: { top: number; left: number } | null;
  
  // Actions
  onSelectPrompt: (prompt: EditorPrompt) => void;
  
  // Callback fermer menu (pour Escape)
  onClose?: () => void;
}

/**
 * Composant SlashMenu
 * Affiche un menu dropdown avec les prompts disponibles
 * ✅ Support navigation clavier (↑↓ Enter Esc)
 * ✅ Position dynamique au-dessus du / (comme MentionMenu)
 */
const SlashMenu: React.FC<SlashMenuProps> = ({
  show,
  filteredPrompts,
  position,
  onSelectPrompt,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  // Reset selected index quand les prompts changent
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPrompts]);
  
  // ✅ Navigation clavier (exactement comme MentionMenu)
  useEffect(() => {
    if (!show) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredPrompts.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredPrompts[selectedIndex]) {
        e.preventDefault();
        onSelectPrompt(filteredPrompts[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, filteredPrompts, selectedIndex, onSelectPrompt, onClose]);
  
  // ✅ Fermer menu sur clic extérieur (comme MentionMenu)
  useEffect(() => {
    if (!show) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose]);
  
  if (!show || !position) return null;

  return (
    <div 
      ref={menuRef} 
      className="chat-slash-menu"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)' // AU-DESSUS du /
      }}
    >
      <div className="chat-note-list-header">
        Prompts disponibles
      </div>
      <div className="chat-note-list">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((prompt, index) => {
            const PromptIcon = getIconComponent(prompt.icon);
            return (
              <button
                key={prompt.id}
                className={`chat-note-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => onSelectPrompt(prompt)}
                onMouseEnter={() => setSelectedIndex(index)}
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

