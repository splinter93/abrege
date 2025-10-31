/**
 * Menu autocomplete pour mentions inline (@note dans textarea)
 * ⚠️ DISTINCT de NoteSelector (qui gère le bouton @ pour épinglage)
 * 
 * Responsabilités :
 * - Affichage popup AU-DESSUS du @ dans textarea
 * - Recherche/sélection de notes pour mentions légères
 * - Navigation clavier (↑↓ Enter Esc)
 * 
 * Conformité : < 200 lignes, props typées strictement
 * @module components/chat/MentionMenu
 */

'use client';
import React, { useEffect, useRef } from 'react';
import { FileText } from 'react-feather';
import type { SelectedNote } from '@/hooks/useNotesLoader';

interface MentionMenuProps {
  /** Afficher le menu */
  show: boolean;
  
  /** Query de recherche */
  searchQuery: string;
  
  /** Notes récentes */
  recentNotes: SelectedNote[];
  
  /** Notes trouvées par recherche */
  searchedNotes: SelectedNote[];
  
  /** État de recherche */
  isSearching: boolean;
  
  /** Position du menu (calculée depuis textarea) */
  position: { top: number; left: number } | null;
  
  /** Callback sélection note */
  onSelectNote: (note: SelectedNote) => void;
  
  /** Callback fermer menu */
  onClose: () => void;
}

/**
 * Menu autocomplete pour mentions inline
 * Positionné dynamiquement au-dessus du @ dans textarea
 */
const MentionMenu: React.FC<MentionMenuProps> = ({
  show,
  searchQuery,
  recentNotes,
  searchedNotes,
  isSearching,
  position,
  onSelectNote,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  // Notes à afficher (recherche ou récentes)
  const displayedNotes = searchQuery.length >= 2 ? searchedNotes : recentNotes;
  
  // Reset selected index quand les notes changent
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayedNotes]);
  
  // Navigation clavier
  useEffect(() => {
    if (!show) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, displayedNotes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && displayedNotes[selectedIndex]) {
        e.preventDefault();
        onSelectNote(displayedNotes[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, displayedNotes, selectedIndex, onSelectNote, onClose]);
  
  // ✅ Fermer menu sur clic extérieur
  useEffect(() => {
    if (!show) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose]);
  
  if (!show || !position) return null;
  
  return (
    <div 
      ref={menuRef}
      className="mention-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)' // AU-DESSUS du @
      }}
    >
      
      {/* Liste des notes */}
      <div className="mention-menu-list">
        {isSearching ? (
          <div className="mention-menu-loading">
            <span>Recherche...</span>
          </div>
        ) : displayedNotes.length === 0 ? (
          <div className="mention-menu-empty">
            <span>
              {searchQuery.length >= 2 
                ? 'Aucune note trouvée' 
                : 'Aucune note récente'}
            </span>
          </div>
        ) : (
          displayedNotes.map((note, index) => (
            <div
              key={note.id}
              className={`mention-menu-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelectNote(note)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText size={16} className="mention-menu-item-icon" />
              <div className="mention-menu-item-content">
                <div className="mention-menu-item-title">{note.title}</div>
                {note.description && (
                  <div className="mention-menu-item-description">
                    {note.description.substring(0, 80)}
                    {note.description.length > 80 ? '...' : ''}
                  </div>
                )}
              </div>
              {note.word_count && (
                <div className="mention-menu-item-meta">
                  {note.word_count} mots
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MentionMenu;

