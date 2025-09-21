"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, SortAsc, SortDesc } from 'lucide-react';
import './SearchFiles.css';

export interface SearchFilesProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterChange?: (filters: FileFilters) => void;
  onSortChange?: (sort: FileSortOptions) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface FileFilters {
  type?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
}

export interface FileSortOptions {
  field: 'filename' | 'size' | 'created_at';
  order: 'asc' | 'desc';
}

const SearchFiles: React.FC<SearchFilesProps> = ({
  searchQuery,
  onSearchChange,
  onFilterChange,
  onSortChange,
  placeholder = "Rechercher des fichiers...",
  className = '',
  disabled = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FileFilters>({});
  const [sortOptions, setSortOptions] = useState<FileSortOptions>({
    field: 'created_at',
    order: 'desc'
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Gérer le clic en dehors pour fermer les filtres
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleFilterChange = useCallback((newFilters: Partial<FileFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  const handleSortChange = useCallback((field: FileSortOptions['field']) => {
    const newOrder = sortOptions.field === field && sortOptions.order === 'desc' ? 'asc' : 'desc';
    const newSort = { field, order: newOrder };
    setSortOptions(newSort);
    onSortChange?.(newSort);
  }, [sortOptions, onSortChange]);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    onFilterChange?.({});
  }, [onFilterChange]);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <div className={`search-files-container ${className}`}>
      {/* Barre de recherche principale */}
      <div className={`search-files-input-container ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
        <div className="search-files-icon">
          <Search size={18} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="search-files-input"
          disabled={disabled}
        />
        
        <div className="search-files-actions">
          {searchQuery && (
            <motion.button
              className="search-files-clear"
              onClick={handleClearSearch}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={14} />
            </motion.button>
          )}
          
          <button
            className={`search-files-filter ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            disabled={disabled}
          >
            <Filter size={16} />
            {hasActiveFilters && <div className="filter-indicator" />}
          </button>
        </div>
      </div>

      {/* Panneau de filtres */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            ref={filtersRef}
            className="search-files-filters"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="filters-header">
              <h4>Filtres et tri</h4>
              {hasActiveFilters && (
                <button
                  className="clear-filters-btn"
                  onClick={clearAllFilters}
                >
                  Effacer tout
                </button>
              )}
            </div>

            <div className="filters-content">
              {/* Filtre par type */}
              <div className="filter-group">
                <label>Type de fichier</label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange({ type: e.target.value || undefined })}
                  className="filter-select"
                >
                  <option value="">Tous les types</option>
                  <option value="image">Images</option>
                  <option value="pdf">PDF</option>
                  <option value="document">Documents</option>
                  <option value="video">Vidéos</option>
                  <option value="audio">Audio</option>
                  <option value="archive">Archives</option>
                </select>
              </div>

              {/* Tri */}
              <div className="filter-group">
                <label>Trier par</label>
                <div className="sort-options">
                  {(['filename', 'size', 'created_at'] as const).map((field) => (
                    <button
                      key={field}
                      className={`sort-option ${sortOptions.field === field ? 'active' : ''}`}
                      onClick={() => handleSortChange(field)}
                    >
                      {field === 'filename' && 'Nom'}
                      {field === 'size' && 'Taille'}
                      {field === 'created_at' && 'Date'}
                      {sortOptions.field === field && (
                        sortOptions.order === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchFiles;
