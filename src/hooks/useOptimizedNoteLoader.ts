import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedNoteService } from '@/services/optimizedNoteService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { supabase } from '@/supabaseClient';
import { retryWithBackoff } from '@/utils/retryUtils';
import { noteConcurrencyManager } from '@/utils/concurrencyManager';
import { simpleLogger } from '@/utils/logger';

interface UseOptimizedNoteLoaderProps {
  noteRef: string;
  autoLoad?: boolean;
  preloadContent?: boolean;
}

interface NoteData {
  id: string;
  source_title: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string;
  slug: string;
  [key: string]: unknown;
}

interface UseOptimizedNoteLoaderReturn {
  note: NoteData | null;
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
 * - Gestion d'erreur robuste avec retry
 * - Gestion de concurrence pour éviter les chargements multiples
 */
export const useOptimizedNoteLoader = ({
  noteRef,
  autoLoad = true,
  preloadContent = true
}: UseOptimizedNoteLoaderProps): UseOptimizedNoteLoaderReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const addNote = useFileSystemStore(s => s.addNote);
  const updateNote = useFileSystemStore(s => s.updateNote);
  const existingNote = useFileSystemStore(s => s.notes[noteRef]);
  
  // 🔧 Utiliser la note du store Zustand comme source de vérité
  const note = existingNote;
  
  const loadingRef = useRef(false);
  const cancelledRef = useRef(false);

  // 🔧 Fonction de chargement optimisé en deux phases avec retry
  const loadNote = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      simpleLogger.dev(`[useOptimizedNoteLoader] 🚀 Début chargement: ${noteRef}`, { preloadContent });

      // Vérifier l'authentification
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) {
        throw new Error('Authentication required');
      }
      const userId = sessionData.session.user.id;

      // Phase 1 : Charger les métadonnées (rapide) avec retry
      simpleLogger.dev('[useOptimizedNoteLoader] 📖 Phase 1: Métadonnées...');
      const metadata = await retryWithBackoff(
        () => optimizedNoteService.getNoteMetadata(noteRef, userId),
        { maxRetries: 2, baseDelay: 500 }
      );
      simpleLogger.dev('[useOptimizedNoteLoader] ✅ Métadonnées OK:', { 
        id: metadata.id, 
        classeur_id: metadata.classeur_id 
      });
      
      // Créer la note avec les métadonnées
      const noteData = {
        id: metadata.id,
        source_title: metadata.source_title || 'Untitled',
        markdown_content: existingNote?.markdown_content || '',
        content: existingNote?.content || '',
        html_content: existingNote?.html_content || '',
        header_image: metadata.header_image || null,
        header_image_offset: metadata.header_image_offset ?? 50,
        header_image_blur: metadata.header_image_blur ?? 0,
        header_image_overlay: metadata.header_image_overlay ?? 0,
        header_title_in_image: metadata.header_title_in_image ?? false,
        wide_mode: metadata.wide_mode || false,
        font_family: metadata.font_family || null,
        updated_at: metadata.updated_at,
        created_at: metadata.created_at,
        slug: metadata.slug,
        public_url: '',
        visibility: 'private',
        folder_id: metadata.folder_id,
        classeur_id: metadata.classeur_id // ✅ AJOUTÉ
      };

      // Ajouter/mettre à jour la note dans le store
      if (existingNote) {
        updateNote(noteRef, noteData);
      } else {
        addNote(noteData as NoteData);
      }

      // Phase 2 : Charger le contenu si demandé avec gestion de concurrence
      if (preloadContent && !cancelledRef.current) {
        simpleLogger.dev('[useOptimizedNoteLoader] 📖 Phase 2: Contenu...');
        try {
          // 🔧 Utiliser le gestionnaire de concurrence pour éviter les chargements multiples
          const content = await noteConcurrencyManager.getOrCreateLoadingPromise(
            `note_content_${noteRef}_${userId}`,
            () => retryWithBackoff(
              () => optimizedNoteService.getNoteContent(noteRef, userId),
              { maxRetries: 2, baseDelay: 1000 }
            )
          );
          
          // 🔧 IMPORTANT : Mettre à jour le store Zustand IMMÉDIATEMENT
          const updatedNoteData = {
            ...noteData,
            markdown_content: content.markdown_content,
            content: content.markdown_content,
            html_content: content.html_content || ''
          };

          // 🔧 Mise à jour IMMÉDIATE du store Zustand
          if (existingNote) {
            updateNote(noteRef, updatedNoteData);
          } else {
            addNote(updatedNoteData as NoteData);
          }
          
          simpleLogger.dev(`[useOptimizedNoteLoader] ✅ Contenu chargé: ${updatedNoteData.markdown_content?.length || 0}B`);
          
        } catch (contentError) {
          simpleLogger.error('[useOptimizedNoteLoader] ❌ Erreur Phase 2:', contentError);
        }
      } else {
        // 🔧 CHARGEMENT ASYNCHRONE : Charger le contenu même si le composant se démonte
        if (preloadContent) {
          simpleLogger.dev('[useOptimizedNoteLoader] 🚀 Chargement asynchrone...');
          
          // Charger le contenu en arrière-plan sans bloquer avec retry
          noteConcurrencyManager.getOrCreateLoadingPromise(
            `note_content_async_${noteRef}_${userId}`,
            () => retryWithBackoff(
              () => optimizedNoteService.getNoteContent(noteRef, userId),
              { maxRetries: 2, baseDelay: 1000 }
            )
          )
            .then(content => {
              // Mettre à jour le store même si le composant n'existe plus
              const updatedNoteData = {
                ...noteData,
                markdown_content: content.markdown_content,
                content: content.markdown_content,
                html_content: content.html_content || ''
              };
              
              // Utiliser directement le store Zustand
              const store = useFileSystemStore.getState();
              if (store.notes[noteRef]) {
                store.updateNote(noteRef, updatedNoteData);
              } else {
                store.addNote(updatedNoteData as NoteData);
              }
              
              simpleLogger.dev(`[useOptimizedNoteLoader] ✅ Async content: ${content.markdown_content?.length || 0}B`);
            })
            .catch(error => {
              simpleLogger.error('[useOptimizedNoteLoader] ❌ Erreur async:', error);
            });
        }
      }

    } catch (e) {
      if (!cancelledRef.current) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        setError(errorMessage);
        simpleLogger.error('[useOptimizedNoteLoader] ❌ Erreur chargement:', e);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        loadingRef.current = false;
        simpleLogger.dev('[useOptimizedNoteLoader] 🏁 Terminé');
      }
    }
  }, [noteRef, preloadContent, addNote, updateNote, existingNote]);

  // 🔄 Fonction de rafraîchissement avec retry
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
      simpleLogger.dev('[useOptimizedNoteLoader] Preload error:', error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, noteRef]); // ✅ Stable dependencies seulement

  // 🚀 Préchargement des notes liées après chargement
  useEffect(() => {
    if (note && preloadContent) {
      preloadRelatedNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, preloadContent]); // ✅ note?.id évite re-trigger à chaque mutation

  return {
    note,
    loading,
    error,
    loadNote,
    refreshNote,
    preloadRelatedNotes
  };
}; 