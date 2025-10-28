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

  // Charger les notes récentes
  const loadRecentNotes = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

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
          word_count: note.word_count
        }));
        setRecentNotes(formattedNotes);
      }
    } catch (error) {
      logger.error('[useNoteSearch] Erreur chargement notes récentes:', error);
    }
  }, [getAccessToken]);

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
              description: note.excerpt
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
    } else {
      setSelectedNotes(prev => [...prev, note]);
    }
    setNoteSearchQuery('');
  }, [selectedNotes]);

  // Retirer une note
  const handleRemoveNote = useCallback((noteId: string) => {
    setSelectedNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  // Charger les notes récentes au montage
  useEffect(() => {
    loadRecentNotes();
  }, [loadRecentNotes]);

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

