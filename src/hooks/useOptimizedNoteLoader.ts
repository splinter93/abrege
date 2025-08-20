import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedNoteService } from '@/services/optimizedNoteService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { supabase } from '@/supabaseClient';
import { retryWithBackoff } from '@/utils/retryUtils';
import { noteConcurrencyManager } from '@/utils/concurrencyManager';

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

      console.log('[useOptimizedNoteLoader] 🚀 Début chargement note:', { noteRef, preloadContent });

      // Vérifier l'authentification
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) {
        throw new Error('Authentication required');
      }
      const userId = sessionData.session.user.id;

      // Phase 1 : Charger les métadonnées (rapide) avec retry
      console.log('[useOptimizedNoteLoader] 📖 Phase 1: Chargement métadonnées...');
      const metadata = await retryWithBackoff(
        () => optimizedNoteService.getNoteMetadata(noteRef, userId),
        { maxRetries: 2, baseDelay: 500 }
      );
      console.log('[useOptimizedNoteLoader] ✅ Métadonnées récupérées:', metadata);
      
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
        visibility: 'private',
        folder_id: metadata.folder_id
      };

      // Ajouter/mettre à jour la note dans le store
      if (existingNote) {
        updateNote(noteRef, noteData);
      } else {
        addNote(noteData as any);
      }

      // Phase 2 : Charger le contenu si demandé avec gestion de concurrence
      if (preloadContent && !cancelledRef.current) {
        console.log('[useOptimizedNoteLoader] 📖 Phase 2: Chargement contenu...');
        try {
          // 🔧 Utiliser le gestionnaire de concurrence pour éviter les chargements multiples
          const content = await noteConcurrencyManager.getOrCreateLoadingPromise(
            `note_content_${noteRef}_${userId}`,
            () => retryWithBackoff(
              () => optimizedNoteService.getNoteContent(noteRef, userId),
              { maxRetries: 2, baseDelay: 1000 }
            )
          );
          
          console.log('[useOptimizedNoteLoader] ✅ Contenu récupéré:', {
            id: content.id,
            markdown_length: content.markdown_content?.length || 0,
            html_length: content.html_content?.length || 0,
            markdown_preview: content.markdown_content?.substring(0, 100) + '...'
          });
          
          // 🔧 IMPORTANT : Mettre à jour le store Zustand IMMÉDIATEMENT
          // Ne pas dépendre de cancelledRef.current pour cette mise à jour critique
          const updatedNoteData = {
            ...noteData,
            markdown_content: content.markdown_content,
            content: content.markdown_content,
            html_content: content.html_content || ''
          };

          console.log('[useOptimizedNoteLoader] 🔄 Mise à jour note avec contenu:', {
            id: noteRef,
            markdown_length: updatedNoteData.markdown_content?.length || 0,
            content_length: updatedNoteData.content?.length || 0,
            markdown_preview: updatedNoteData.markdown_content?.substring(0, 100) + '...'
          });

          // 🔧 Mise à jour IMMÉDIATE du store Zustand
          if (existingNote) {
            console.log('[useOptimizedNoteLoader] 🔄 Mise à jour note existante dans le store');
            updateNote(noteRef, updatedNoteData);
          } else {
            console.log('[useOptimizedNoteLoader] ➕ Ajout nouvelle note dans le store');
            addNote(updatedNoteData as any);
          }
          
          // 🔍 Vérifier que la note est bien dans le store après mise à jour
          setTimeout(() => {
            const store = useFileSystemStore.getState();
            const noteInStore = store.notes[noteRef];
            console.log('[useOptimizedNoteLoader] 🔍 Vérification store après mise à jour:', {
              noteInStore: !!noteInStore,
              hasMarkdown: !!noteInStore?.markdown_content,
              markdownLength: noteInStore?.markdown_content?.length || 0,
              hasContent: !!noteInStore?.content,
              contentLength: noteInStore?.content?.length || 0
            });
          }, 100);
          
          console.log('[useOptimizedNoteLoader] ✅ Note mise à jour dans le store:', {
            id: noteRef,
            markdown_length: updatedNoteData.markdown_content?.length || 0,
            content_length: updatedNoteData.content?.length || 0
          });
          
        } catch (contentError) {
          console.error('[useOptimizedNoteLoader] ❌ Erreur Phase 2 (contenu):', contentError);
        }
      } else {
        console.log('[useOptimizedNoteLoader] ⏭️ Phase 2 ignorée:', { preloadContent, cancelled: cancelledRef.current });
        
        // 🔧 CHARGEMENT ASYNCHRONE : Charger le contenu même si le composant se démonte
        if (preloadContent) {
          console.log('[useOptimizedNoteLoader] 🚀 Chargement asynchrone du contenu...');
          
          // Charger le contenu en arrière-plan sans bloquer avec retry
          noteConcurrencyManager.getOrCreateLoadingPromise(
            `note_content_async_${noteRef}_${userId}`,
            () => retryWithBackoff(
              () => optimizedNoteService.getNoteContent(noteRef, userId),
              { maxRetries: 2, baseDelay: 1000 }
            )
          )
            .then(content => {
              console.log('[useOptimizedNoteLoader] ✅ Contenu chargé asynchronement:', {
                id: content.id,
                markdown_length: content.markdown_content?.length || 0
              });
              
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
                console.log('[useOptimizedNoteLoader] ✅ Store mis à jour asynchronement');
              } else {
                store.addNote(updatedNoteData as any);
                console.log('[useOptimizedNoteLoader] ✅ Note ajoutée asynchronement au store');
              }
            })
            .catch(error => {
              console.error('[useOptimizedNoteLoader] ❌ Erreur chargement asynchrone:', error);
            });
        }
      }

    } catch (e) {
      if (!cancelledRef.current) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        setError(errorMessage);
        console.error('[useOptimizedNoteLoader] ❌ Erreur chargement note:', e);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        loadingRef.current = false;
        console.log('[useOptimizedNoteLoader] 🏁 Chargement terminé');
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