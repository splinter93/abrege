/**
 * Hook pour gérer la recherche et sélection de notes
 * @module hooks/useNoteSearch
 */

import { useState, useCallback, useEffect } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import type { SelectedNote } from './useNotesLoader';
import type { RecentNotesAPIResponse, SearchAPIResponse, RecentNoteAPIResponse, SearchNoteAPIResponse } from '@/types/api';

interface UseNoteSearchOptions {
  getAccessToken: () => Promise<string | null>;
}

/**
 * Hook useNoteSearch
 * Gère la recherche de notes, les notes récentes et la sélection
 */
export function useNoteSearch({ getAccessToken }: UseNoteSearchOptions) {
  const [selectedNotes, setSelectedNotes] = useState<SelectedNote[]>([]);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [recentNotes, setRecentNotes] = useState<SelectedNote[]>([]);
  const [searchedNotes, setSearchedNotes] = useState<SelectedNote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // ✅ Cache avec TTL pour éviter appels API redondants
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const CACHE_TTL_MS = 30000; // 30 secondes

  // Charger les notes récentes (avec cache intelligent)
  const loadRecentNotes = useCallback(async () => {
    // ✅ Skip si cache valide (< 30s) ET notes déjà chargées
    // Note: On utilise une closure pour accéder à recentNotes sans le mettre dans les deps
    const now = Date.now();
    const cacheAge = now - lastLoadTime;
    const hasCachedNotes = recentNotes.length > 0;
    
    if (cacheAge < CACHE_TTL_MS && hasCachedNotes) {
      logger.dev('[useNoteSearch] ⚡ Cache valide, skip reload:', {
        age: Math.round(cacheAge / 1000) + 's',
        count: recentNotes.length
      });
      return;
    }
    
    try {
      const token = await getAccessToken();
      if (!token) {
        logger.warn('[useNoteSearch] ⚠️ Token non disponible, skip load');
        return;
      }

      logger.dev('[useNoteSearch] 🔄 Chargement notes récentes...');

      const response = await fetch('/api/v2/note/recent?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

      const data = await response.json() as RecentNotesAPIResponse;
      if (data.success && data.notes) {
        const formattedNotes: SelectedNote[] = data.notes.map((note: RecentNoteAPIResponse) => ({
          id: note.id,
          slug: note.slug,
          title: note.source_title || 'Sans titre',
          description: note.markdown_content?.substring(0, 200),
          word_count: note.word_count,
          created_at: note.created_at
        }));
        setRecentNotes(formattedNotes);
        setLastLoadTime(Date.now()); // ✅ Mettre à jour cache timestamp
        
        logger.dev('[useNoteSearch] ✅ Notes récentes chargées:', {
          count: formattedNotes.length
        });
      }
    } catch (error) {
      logger.error('[useNoteSearch] Erreur chargement notes récentes:', error);
    }
    // ✅ FIX: Ne PAS mettre recentNotes.length dans les deps (cause infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAccessToken, lastLoadTime]);

  // Recherche de notes avec debounce
  useEffect(() => {
    if (!noteSearchQuery || noteSearchQuery.length < 2) {
      setSearchedNotes([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setIsSearching(false);
          return;
        }

        const response = await fetch(`/api/v2/search?q=${encodeURIComponent(noteSearchQuery)}&type=notes&limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const data = await response.json() as SearchAPIResponse;
        if (data.success && data.results) {
          const formattedNotes: SelectedNote[] = data.results
            .filter((r: SearchNoteAPIResponse) => r.type === 'note')
            .map((note: SearchNoteAPIResponse) => ({
              id: note.id,
              slug: note.slug,
              title: note.title || 'Sans titre',
              description: note.excerpt,
              created_at: note.created_at
            }));
          setSearchedNotes(formattedNotes);
        }
      } catch (error) {
        logger.error('[useNoteSearch] Erreur recherche notes:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [noteSearchQuery, getAccessToken]);

  // Sélectionner/désélectionner une note
  const handleSelectNote = useCallback((note: SelectedNote) => {
    const isAlreadySelected = selectedNotes.find(n => n.id === note.id);
    if (isAlreadySelected) {
      setSelectedNotes(prev => prev.filter(n => n.id !== note.id));
      logger.dev('[useNoteSearch] 🗑️ Note désépinglée:', { noteId: note.id, title: note.title });
    } else {
      setSelectedNotes(prev => [...prev, note]);
      logger.dev('[useNoteSearch] 📎 Note épinglée:', { noteId: note.id, title: note.title, total: selectedNotes.length + 1 });
    }
    setNoteSearchQuery('');
  }, [selectedNotes]);

  // Retirer une note
  const handleRemoveNote = useCallback((noteId: string) => {
    setSelectedNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  // ✅ FIX: Ne PAS charger au montage (token potentiellement pas dispo)
  // Les notes seront chargées à l'ouverture du menu (via ChatInput)
  // useEffect(() => {
  //   loadRecentNotes();
  // }, [loadRecentNotes]);

  return {
    selectedNotes,
    setSelectedNotes,
    noteSearchQuery,
    setNoteSearchQuery,
    recentNotes,
    searchedNotes,
    isSearching,
    handleSelectNote,
    handleRemoveNote,
    loadRecentNotes
  };
}

