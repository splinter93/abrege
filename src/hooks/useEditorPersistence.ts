import { useEffect, useCallback } from 'react';
import { useFileSystemStore, type PersistedNote } from '../store/useFileSystemStore';
import toast from 'react-hot-toast';

/**
 * Hook pour gérer la persistance locale de l'éditeur
 * 
 * Fonctionnalités :
 * - Sauvegarde automatique locale des changements
 * - Indicateur visuel des changements non sauvegardés
 * - Restauration automatique au chargement
 * - Nettoyage après sauvegarde réussie
 */
export function useEditorPersistence() {
  const {
    currentNote,
    hasUnsavedChanges,
    setCurrentNote,
    updateCurrentNote,
    clearCurrentNote,
    setHasUnsavedChanges,
    saveCurrentNoteLocally,
    clearPersistedState,
  } = useFileSystemStore();

  /**
   * Sauvegarde la note actuelle localement
   */
  const saveNoteLocally = useCallback((
    noteId: string,
    title: string,
    content: string
  ) => {
    saveCurrentNoteLocally(noteId, title, content);
  }, [saveCurrentNoteLocally]);

  /**
   * Met à jour le contenu de la note persistée
   */
  const updateNoteContent = useCallback((
    content: string
  ) => {
    if (currentNote) {
      updateCurrentNote({ content });
    }
  }, [currentNote, updateCurrentNote]);

  /**
   * Met à jour le titre de la note persistée
   */
  const updateNoteTitle = useCallback((
    title: string
  ) => {
    if (currentNote) {
      updateCurrentNote({ title });
    }
  }, [currentNote, updateCurrentNote]);

  /**
   * Nettoie l'état persisté après une sauvegarde réussie
   */
  const clearAfterSave = useCallback(() => {
    clearPersistedState();
    toast.success('Note sauvegardée avec succès');
  }, [clearPersistedState]);

  /**
   * Vérifie s'il y a des changements non sauvegardés pour une note
   */
  const hasUnsavedChangesForNote = useCallback((
    noteId: string
  ): boolean => {
    return hasUnsavedChanges && currentNote?.id === noteId;
  }, [hasUnsavedChanges, currentNote]);

  /**
   * Restaure la note persistée si elle existe
   */
  const restorePersistedNote = useCallback((
    noteId: string
  ): PersistedNote | null => {
    if (currentNote && currentNote.id === noteId) {
      // Afficher un toast informatif
      toast.success(
        `Version locale restaurée (${new Date(currentNote.lastModified).toLocaleTimeString()})`,
        {
          duration: 3000,
          icon: '💾',
        }
      );
      return currentNote;
    }
    return null;
  }, [currentNote]);

  /**
   * Efface la note persistée
   */
  const clearNote = useCallback(() => {
    clearCurrentNote();
  }, [clearCurrentNote]);

  /**
   * Affiche un avertissement si l'utilisateur tente de quitter avec des changements non sauvegardés
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Vous avez des changements non sauvegardés. Êtes-vous sûr de vouloir quitter ?';
        return 'Vous avez des changements non sauvegardés. Êtes-vous sûr de vouloir quitter ?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    // État
    currentNote,
    hasUnsavedChanges,
    
    // Actions
    saveNoteLocally,
    updateNoteContent,
    updateNoteTitle,
    clearAfterSave,
    hasUnsavedChangesForNote,
    restorePersistedNote,
    clearNote,
  };
}

/**
 * Hook pour afficher un indicateur visuel des changements non sauvegardés
 */
export function useUnsavedChangesIndicator() {
  const { hasUnsavedChanges } = useFileSystemStore();

  useEffect(() => {
    // Modifier le titre de la page pour indiquer les changements non sauvegardés
    if (hasUnsavedChanges) {
      const originalTitle = document.title;
      document.title = originalTitle.replace(/^\*/, '') + ' *';
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
  };
} 