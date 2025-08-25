import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './FilesToolbar.css';

export type ViewMode = 'grid' | 'list';

interface FilesToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUploadFile: () => void;
  selectedFilesCount: number;
  onDeleteSelected: () => void;
  onRenameSelected: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const FilesToolbar: React.FC<FilesToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onUploadFile,
  selectedFilesCount,
  onDeleteSelected,
  onRenameSelected,
  searchQuery,
  onSearchChange,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <motion.div 
      className="files-toolbar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section gauche - Barre de recherche */}
      <div className="toolbar-left">
        <div className={`search-container ${isSearchFocused ? 'focused' : ''}`}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher des fichiers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="search-clear"
              onClick={() => onSearchChange('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Section centrale - Bouton upload */}
      <div className="toolbar-center">
        <button 
          className="toolbar-btn primary upload-btn"
          onClick={onUploadFile}
        >
          <span className="btn-icon">📁</span>
          <span className="btn-text">Upload</span>
        </button>
      </div>

      {/* Section droite - Actions sur sélection et vue */}
      <div className="toolbar-right">
        {/* Actions sur les fichiers sélectionnés */}
        {selectedFilesCount > 0 && (
          <div className="selection-actions">
            <span className="selection-count">
              {selectedFilesCount} fichier{selectedFilesCount > 1 ? 's' : ''} sélectionné{selectedFilesCount > 1 ? 's' : ''}
            </span>
            <button 
              className="toolbar-btn secondary"
              onClick={onRenameSelected}
            >
              <span className="btn-icon">✏️</span>
              <span className="btn-text">Renommer</span>
            </button>
            <button 
              className="toolbar-btn danger"
              onClick={onDeleteSelected}
            >
              <span className="btn-icon">🗑️</span>
              <span className="btn-text">Supprimer</span>
            </button>
          </div>
        )}

        {/* Boutons de vue */}
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            title="Vue grille"
          >
            <span className="view-icon">⊞</span>
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="Vue liste"
          >
            <span className="view-icon">☰</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default FilesToolbar; 