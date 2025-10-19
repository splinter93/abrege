import React, { useEffect, useCallback } from 'react';
import { optimizedNoteService } from '@/services/optimizedNoteService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { supabase } from '@/supabaseClient';

interface NotePreloaderProps {
  classeurId?: string;
  folderId?: string;
  userId?: string;
  maxNotes?: number;
  enabled?: boolean;
}

/**
 * Composant de préchargement intelligent des notes
 * - Précharge les notes des classeurs/dossiers ouverts
 * - Utilise le cache intelligent d'OptimizedNoteService
 * - Exécution en arrière-plan sans bloquer l'UI
 * - Gestion automatique des erreurs
 */
const NotePreloader: React.FC<NotePreloaderProps> = ({
  classeurId,
  folderId,
  userId,
  maxNotes = 20,
  enabled = true
}) => {
  const { setNotes } = useFileSystemStore();

  // 🔧 Préchargement des notes d'un classeur
  const preloadClasseurNotes = useCallback(async () => {
    if (!classeurId || !userId || !enabled) return;

    try {
      // Récupérer les notes du classeur
      const { data: notes } = await supabase
        .from('articles')
        .select('id, slug, source_title, folder_id, created_at, updated_at')
        .eq('classeur_id', classeurId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(maxNotes);

      if (notes && notes.length > 0) {
        // Précharger les métadonnées en arrière-plan
        const preloadPromises = notes.map(note => 
          optimizedNoteService.getNoteMetadata(note.id, userId)
        );

        // Exécuter en parallèle sans bloquer
        Promise.allSettled(preloadPromises).then(results => {
          const successfulNotes = results
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<unknown>).value);

          // Mettre à jour le store avec les notes préchargées
          if (successfulNotes.length > 0) {
            const notesToAdd = successfulNotes.map(metadata => ({
              id: metadata.id,
              source_title: metadata.source_title || 'Untitled',
              markdown_content: '',
              content: '',
              html_content: '',
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
            }));

            setNotes(notesToAdd);
          }
        });
      }
    } catch (error) {
      console.debug('[NotePreloader] Classeur preload error:', error);
    }
  }, [classeurId, userId, enabled, maxNotes, setNotes]);

  // 🔧 Préchargement des notes d'un dossier
  const preloadFolderNotes = useCallback(async () => {
    if (!folderId || !userId || !enabled) return;

    try {
      // Récupérer les notes du dossier
      const { data: notes } = await supabase
        .from('articles')
        .select('id, slug, source_title, created_at, updated_at')
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(maxNotes);

      if (notes && notes.length > 0) {
        // Précharger les métadonnées en arrière-plan
        const preloadPromises = notes.map(note => 
          optimizedNoteService.getNoteMetadata(note.id, userId)
        );

        // Exécuter en parallèle sans bloquer
        Promise.allSettled(preloadPromises);
      }
    } catch (error) {
      console.debug('[NotePreloader] Folder preload error:', error);
    }
  }, [folderId, userId, enabled, maxNotes]);

  // 🔧 Préchargement des notes récemment consultées
  const preloadRecentNotes = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      // Récupérer les notes récemment modifiées
      const { data: notes } = await supabase
        .from('articles')
        .select('id, slug, source_title, folder_id, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(Math.floor(maxNotes / 2));

      if (notes && notes.length > 0) {
        // Précharger les métadonnées en arrière-plan
        const preloadPromises = notes.map(note => 
          optimizedNoteService.getNoteMetadata(note.id, userId)
        );

        // Exécuter en parallèle sans bloquer
        Promise.allSettled(preloadPromises);
      }
    } catch (error) {
      console.debug('[NotePreloader] Recent notes preload error:', error);
    }
  }, [userId, enabled, maxNotes]);

  // 🚀 Exécution du préchargement
  useEffect(() => {
    if (!enabled) return;

    // Précharger en fonction des paramètres fournis
    if (classeurId) {
      preloadClasseurNotes();
    } else if (folderId) {
      preloadFolderNotes();
    } else {
      // Préchargement général des notes récentes
      preloadRecentNotes();
    }
  }, [enabled, classeurId, folderId, preloadClasseurNotes, preloadFolderNotes, preloadRecentNotes]);

  // Composant invisible - pas de rendu UI
  return null;
};

export default NotePreloader; 