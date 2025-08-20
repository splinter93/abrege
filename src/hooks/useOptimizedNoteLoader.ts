import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedNoteService } from '@/services/optimizedNoteService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { supabase } from '@/supabaseClient';

interface UseOptimizedNoteLoaderProps {
  noteRef: string;
  autoLoad?: boolean;
  preloadContent?: boolean;
}

interface UseOptimizedNoteLoaderReturn {
  note: any;
  loading: boolean;
  error: string | null;
  loadNote: () => Promise<void>;
  refreshNote: () => Promise<void>;
  preloadRelatedNotes: () => Promise<void>;
}

/**
 * Hook optimisé pour le chargement des notes
 * - Chargement en deux phases : métadonnées puis contenu
 * - Cache intelligent avec OptimizedNoteService
 * - Préchargement des notes liées
 * - Gestion d'erreur robuste
 */
export const useOptimizedNoteLoader = ({
  noteRef,
  autoLoad = true,
  preloadContent = true
}: UseOptimizedNoteLoaderProps): UseOptimizedNoteLoaderReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<any>(null);
  
  const addNote = useFileSystemStore(s => s.addNote);
  const updateNote = useFileSystemStore(s => s.updateNote);
  const existingNote = useFileSystemStore(s => s.notes[noteRef]);
  
  const loadingRef = useRef(false);
  const cancelledRef = useRef(false);

  // 🔧 Fonction de chargement optimisé en deux phases
  const loadNote = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Vérifier l'authentification
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) {
        throw new Error('Authentication required');
      }
      const userId = sessionData.session.user.id;

      // Phase 1 : Charger les métadonnées (rapide)
      const metadata = await optimizedNoteService.getNoteMetadata(noteRef, userId);
      
      // Créer la note avec les métadonnées
      const noteData = {
        id: metadata.id,
        source_title: metadata.source_title || 'Untitled',
        markdown_content: existingNote?.markdown_content || '',
        content: existingNote?.content || '',
        html_content: existingNote?.html_content || '',
        header_image: metadata.header_image || null,
        header_image_offset: 50,
        header_image_blur: 0,
        header_image_overlay: 0,
        header_title_in_image: false,
        wide_mode: metadata.wide_mode || false,
        font_family: metadata.font_family || null,
        updated_at: metadata.updated_at,
        created_at: metadata.created_at,
        slug: metadata.slug,
        public_url: '',
        visibility: 'private'
      };

      // Ajouter/mettre à jour la note dans le store
      if (existingNote) {
        updateNote(noteRef, noteData);
      } else {
        addNote(noteData as any);
      }
      
      setNote(noteData);

      // Phase 2 : Charger le contenu si demandé
      if (preloadContent && !cancelledRef.current) {
        const content = await optimizedNoteService.getNoteContent(noteRef, userId);
        
        if (!cancelledRef.current) {
          const updatedNoteData = {
            ...noteData,
            markdown_content: content.markdown_content,
            content: content.markdown_content,
            html_content: content.html_content || ''
          };

          if (existingNote) {
            updateNote(noteRef, updatedNoteData);
          } else {
            addNote(updatedNoteData as any);
          }
          
          setNote(updatedNoteData);
        }
      }

    } catch (e) {
      if (!cancelledRef.current) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        setError(errorMessage);
        console.error('[useOptimizedNoteLoader] Error loading note:', e);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [noteRef, preloadContent, addNote, updateNote, existingNote]);

  // 🔄 Fonction de rafraîchissement
  const refreshNote = useCallback(async () => {
    // Invalider le cache pour forcer le rechargement
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) {
      optimizedNoteService.invalidateNoteCache(noteRef, sessionData.session.user.id);
    }
    await loadNote();
  }, [noteRef, loadNote]);

  // 🚀 Préchargement des notes liées (même classeur)
  const preloadRelatedNotes = useCallback(async () => {
    if (!note?.folder_id) return;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) return;
      
      const userId = sessionData.session.user.id;
      
      // Récupérer les notes du même dossier
      const { data: relatedNotes } = await supabase
        .from('articles')
        .select('id, slug')
        .eq('folder_id', note.folder_id)
        .eq('user_id', userId)
        .limit(10);
      
      if (relatedNotes) {
        // Précharger les métadonnées des notes liées
        const preloadPromises = relatedNotes
          .filter(n => n.id !== note.id)
          .map(n => optimizedNoteService.getNoteMetadata(n.id, userId));
        
        // Exécuter en arrière-plan sans bloquer
        Promise.allSettled(preloadPromises);
      }
    } catch (error) {
      // Erreur silencieuse pour le préchargement
      console.debug('[useOptimizedNoteLoader] Preload error:', error);
    }
  }, [note?.folder_id, note?.id]);

  // 🔄 Chargement automatique
  useEffect(() => {
    if (autoLoad && noteRef) {
      loadNote();
    }
    
    return () => {
      cancelledRef.current = true;
    };
  }, [autoLoad, noteRef, loadNote]);

  // 🚀 Préchargement des notes liées après chargement
  useEffect(() => {
    if (note && preloadContent) {
      preloadRelatedNotes();
    }
  }, [note, preloadContent, preloadRelatedNotes]);

  return {
    note,
    loading,
    error,
    loadNote,
    refreshNote,
    preloadRelatedNotes
  };
}; 