/**
 * Composant CommandPalette - Menu de commande style Notion
 * 
 * Fonctionnalités :
 * - Recherche de notes
 * - Navigation clavier (flèches, Enter, Esc)
 * - Design moderne et épuré
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md :
 * - Composant UI isolé (< 300 lignes)
 * - Props typées strictement
 * - Pas de logique métier (déléguée au hook)
 */

"use client";

import React, { useEffect, useRef } from 'react';
import { Search, MessageSquare, FileText, FolderOpen, Bot } from 'lucide-react';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import type { CommandPaletteOption, CommandPaletteShortcut } from '@/hooks/useCommandPalette';
import './CommandPalette.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Composant CommandPalette
 */
export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    results,
    shortcuts,
    isLoading,
    isLoadingRecent,
    selectedIndex,
    setQuery,
    selectNext,
    selectPrevious,
    executeSelected,
    close: closePalette
  } = useCommandPalette({
    enabled: isOpen,
    isOpen,
    onClose
  });

  /**
   * Focus automatique sur l'input quand le menu s'ouvre
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Petit délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  /**
   * Gérer les raccourcis clavier
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc : Fermer
      if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
        return;
      }

      // Flèche bas : Sélectionner suivant
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNext();
        return;
      }

      // Flèche haut : Sélectionner précédent
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevious();
        return;
      }

      // Enter : Exécuter sélection
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSelected();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePalette, selectNext, selectPrevious, executeSelected]);

  /**
   * Fermer au clic en dehors
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closePalette();
      }
    };

    // Petit délai pour éviter de fermer immédiatement à l'ouverture
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closePalette]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="command-palette-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        closePalette();
      }
    }}>
      <div className="command-palette-container" ref={containerRef}>
        {/* Input de recherche */}
        <div className="command-palette-input-wrapper">
          <Search className="command-palette-search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Rechercher une note..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          {(isLoading || isLoadingRecent) && (
            <div className="command-palette-loading">
              <div className="command-palette-spinner" />
            </div>
          )}
        </div>

        {/* Liste des résultats */}
        {results.length > 0 && (
          <div className="command-palette-results-wrapper">
            {query.trim().length < 2 && (
              <div className="command-palette-results-title">Notes récentes</div>
            )}
            <div className="command-palette-results">
            {results.map((option, index) => (
              <CommandPaletteItem
                key={option.id}
                option={option}
                isSelected={index === selectedIndex}
                onClick={() => {
                  option.action();
                }}
              />
            ))}
            </div>
          </div>
        )}

        {/* État vide (seulement si recherche active) */}
        {!isLoading && query.length >= 2 && results.length === 0 && (
          <div className="command-palette-empty">
            <p>Aucun résultat trouvé</p>
          </div>
        )}

        {/* Aide clavier (seulement si pas de résultats) */}
        {results.length === 0 && query.length < 2 && !isLoading && (
          <div className="command-palette-hint">
            <div className="command-palette-hint-item">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span>Naviguer</span>
            </div>
            <div className="command-palette-hint-item">
              <kbd>Enter</kbd>
              <span>Sélectionner</span>
            </div>
            <div className="command-palette-hint-item">
              <kbd>Esc</kbd>
              <span>Fermer</span>
            </div>
          </div>
        )}

        {/* Bandeau de raccourcis (en bas) */}
        <div className="command-palette-shortcuts">
          {shortcuts.map((shortcut) => (
            <ShortcutButton key={shortcut.id} shortcut={shortcut} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Bouton du bandeau de raccourcis
 */
function ShortcutButton({ shortcut }: { shortcut: CommandPaletteShortcut }) {
  const Icon = shortcut.icon === 'chat' ? MessageSquare
    : shortcut.icon === 'folder' ? FolderOpen
    : shortcut.icon === 'prompt' ? FileText
    : Bot;
  const iconColorClass = `command-palette-shortcut-icon-${shortcut.icon}`;
  return (
    <button
      type="button"
      className="command-palette-shortcut"
      onClick={shortcut.action}
      aria-label={shortcut.title}
    >
      <span className={`command-palette-shortcut-icon ${iconColorClass}`}>
        <Icon size={18} />
      </span>
      <span className="command-palette-shortcut-label">{shortcut.title}</span>
    </button>
  );
}

/**
 * Composant pour un item du menu
 */
interface CommandPaletteItemProps {
  option: CommandPaletteOption;
  isSelected: boolean;
  onClick: () => void;
}

function CommandPaletteItem({ option, isSelected, onClick }: CommandPaletteItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers l'item sélectionné
  React.useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [isSelected]);

  const Icon = option.type === 'action' 
    ? MessageSquare 
    : FileText;

  return (
    <div
      ref={itemRef}
      className={`command-palette-item ${isSelected ? 'command-palette-item-selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => {
        // Optionnel : mettre à jour l'index de sélection au survol
      }}
    >
      <div className="command-palette-item-icon">
        <Icon size={18} />
      </div>
      <div className="command-palette-item-content">
        <div className="command-palette-item-title">{option.title}</div>
        {option.description && (
          <div className="command-palette-item-description">{option.description}</div>
        )}
      </div>
      {option.type === 'action' && (
        <div className="command-palette-item-badge">Action</div>
      )}
    </div>
  );
}

