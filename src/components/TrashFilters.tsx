import React from 'react';
import { motion } from 'framer-motion';
import { Filter, ArrowUp, ArrowDown, Search, X } from 'react-feather';
import type { TrashItem } from '@/types/supabase';

interface TrashFiltersProps {
  items: TrashItem[];
  filteredItems: TrashItem[];
  onFilterChange: (filteredItems: TrashItem[]) => void;
}

type SortOption = 'name' | 'type' | 'trashed_at' | 'expires_at';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'note' | 'folder' | 'classeur' | 'file';

/**
 * Composant de filtrage et tri pour la corbeille
 * Permet de filtrer par type et trier par différents critères
 */
export default function TrashFilters({ items, filteredItems, onFilterChange }: TrashFiltersProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<FilterType>('all');
  const [sortBy, setSortBy] = React.useState<SortOption>('trashed_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  // Appliquer les filtres et le tri
  React.useEffect(() => {
    let filtered = [...items];

    // Filtrage par type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Filtrage par terme de recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term)
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'trashed_at':
          aValue = new Date(a.trashed_at).getTime();
          bValue = new Date(b.trashed_at).getTime();
          break;
        case 'expires_at':
          aValue = new Date(a.expires_at).getTime();
          bValue = new Date(b.expires_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    onFilterChange(filtered);
  }, [items, searchTerm, filterType, sortBy, sortDirection, onFilterChange]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setSortBy('trashed_at');
    setSortDirection('desc');
  };

  const hasActiveFilters = searchTerm.trim() || filterType !== 'all' || sortBy !== 'trashed_at' || sortDirection !== 'desc';

  return (
    <motion.div
      className="trash-filters"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={16} />
          <span>Filtres et tri</span>
        </div>
        {hasActiveFilters && (
          <button
            className="clear-filters-btn"
            onClick={clearFilters}
            title="Effacer tous les filtres"
          >
            <X size={14} />
            Effacer
          </button>
        )}
      </div>

      <div className="filters-content">
        {/* Barre de recherche */}
        <div className="filter-group">
          <div className="search-input-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher dans la corbeille..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filtres par type */}
        <div className="filter-group">
          <label className="filter-label">Type d'élément</label>
          <div className="filter-buttons">
            {[
              { value: 'all', label: 'Tous', count: items.length },
              { value: 'note', label: 'Notes', count: items.filter(i => i.type === 'note').length },
              { value: 'folder', label: 'Dossiers', count: items.filter(i => i.type === 'folder').length },
              { value: 'classeur', label: 'Classeurs', count: items.filter(i => i.type === 'classeur').length },
              { value: 'file', label: 'Fichiers', count: items.filter(i => i.type === 'file').length }
            ].map(({ value, label, count }) => (
              <button
                key={value}
                className={`filter-btn ${filterType === value ? 'active' : ''}`}
                onClick={() => setFilterType(value as FilterType)}
                disabled={count === 0}
              >
                {label}
                <span className="count">({count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options de tri */}
        <div className="filter-group">
          <label className="filter-label">Trier par</label>
          <div className="sort-options">
            {[
              { value: 'trashed_at', label: 'Date de suppression' },
              { value: 'name', label: 'Nom' },
              { value: 'type', label: 'Type' },
              { value: 'expires_at', label: 'Date d\'expiration' }
            ].map(({ value, label }) => (
              <button
                key={value}
                className={`sort-btn ${sortBy === value ? 'active' : ''}`}
                onClick={() => handleSort(value as SortOption)}
              >
                {label}
                {sortBy === value && (
                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="filters-results">
        <span className="results-count">
          {filteredItems.length} élément{filteredItems.length > 1 ? 's' : ''} 
          {hasActiveFilters && ` sur ${items.length}`}
        </span>
      </div>
    </motion.div>
  );
}
