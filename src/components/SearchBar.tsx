"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { simpleLogger as logger } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import './SearchBar.css';

interface SearchResult {
  type: 'note' | 'folder' | 'classeur';
  id: string;
  title: string;
  slug: string;
  classeur_id?: string;
  score: number;
  excerpt?: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearchResult?: (result: SearchResult) => void;
  className?: string;
  maxResults?: number;
  searchTypes?: string[];
}

/**
 * Composant de barre de recherche réutilisable
 * Connecté à l'endpoint /api/v2/search
 */
const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Rechercher des notes...",
  onSearchResult,
  className = "",
  maxResults = 10,
  searchTypes = ['all']
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fonction pour récupérer les headers d'authentification
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    try {
      if (typeof window === 'undefined') {
        return { 'Content-Type': 'application/json' };
      }

      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'search_bar'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      return headers;
    } catch (error) {
      logger.error('[SearchBar] Erreur récupération headers auth:', error);
      return { 'Content-Type': 'application/json' };
    }
  }, []);

  // Fonction de recherche
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(false);

    try {
      // Récupérer les headers d'authentification
      const headers = await getAuthHeaders();
      
      // Construire les paramètres de recherche
      const searchParams = new URLSearchParams({
        q: searchQuery.trim(),
        limit: maxResults.toString()
      });
      
      if (searchTypes.length === 1 && searchTypes[0] !== 'all') {
        searchParams.set('type', searchTypes[0]);
      } else if (searchTypes.length > 1) {
        searchParams.set('type', 'all');
      }
      
      // Appel à l'endpoint de recherche
      const response = await fetch(`/api/v2/search?${searchParams.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erreur de recherche: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        setSearchResults(data.results);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } catch (error) {
      logger.error('[SearchBar] Erreur lors de la recherche:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, getAuthHeaders, maxResults, searchTypes]);

  // Navigation vers un résultat
  const handleSearchResultClick = useCallback((result: SearchResult) => {
    // Si un callback personnalisé est fourni, l'utiliser
    if (onSearchResult) {
      onSearchResult(result);
      setShowSearchResults(false);
      setSearchQuery('');
      return;
    }

    // Navigation par défaut
    if (result.type === 'note') {
      router.push(`/private/note/${result.slug}`);
    } else if (result.type === 'folder') {
      router.push(`/private/dossiers/${result.slug}`);
    } else if (result.type === 'classeur') {
      router.push(`/private/classeurs/${result.slug}`);
    }
    
    // Masquer les résultats après navigation
    setShowSearchResults(false);
    setSearchQuery('');
  }, [router, onSearchResult]);


  // Gestion du focus pour masquer le placeholder
  const handleInputClick = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Effet pour masquer les résultats quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Icône selon le type de résultat
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'note': return '📝';
      case 'folder': return '📁';
      case 'classeur': return '📚';
      default: return '📄';
    }
  };

  return (
    <div className={`search-bar-container ${className}`} ref={searchContainerRef}>
      <form onSubmit={handleSearch} className="search-bar-form">
        <Search size={20} className="search-bar-icon" />
        <input 
          type="text" 
          placeholder={isFocused ? "" : placeholder}
          className="search-bar-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        {searchQuery.trim().length > 0 && (
          <button 
            type="submit" 
            className="search-bar-submit-btn"
            disabled={isSearching}
          >
            {isSearching ? '...' : '→'}
          </button>
        )}
      </form>

      {/* Résultats de recherche */}
      {showSearchResults && (
        <div className="search-bar-results">
          {searchResults.length > 0 ? (
            <div className="search-bar-results-list">
              {searchResults.map((result) => (
                <div 
                  key={`${result.type}-${result.id}`}
                  className="search-bar-result-item"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="search-bar-result-header">
                    <span className="search-bar-result-type">
                      {getResultIcon(result.type)}
                    </span>
                    <span className="search-bar-result-title">{result.title}</span>
                    <span className="search-bar-result-score">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  {result.excerpt && (
                    <div className="search-bar-result-excerpt">{result.excerpt}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="search-bar-no-results">
              Aucun résultat trouvé pour "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 
export type { SearchResult, SearchBarProps };