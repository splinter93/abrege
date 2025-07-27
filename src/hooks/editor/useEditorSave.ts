import { useState, useCallback, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

interface SaveData {
  title: string;
  content: string;
}

interface UseEditorSaveProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave?: (data: SaveData) => void;
  autoSaveDelay?: number;
}

interface UseEditorSaveReturn {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  lastSaved: Date | null;
  isSaving: boolean;
  save: () => void;
  hasUnsavedChanges: boolean;
}

/**
 * Hook pour la gestion de la sauvegarde de l'éditeur
 * Extrait la logique depuis EditorSaveManager.tsx et synchronise avec le store Zustand
 */
export const useEditorSave = ({
  noteId,
  initialTitle,
  initialContent,
  onSave,
  autoSaveDelay = 2000
}: UseEditorSaveProps): UseEditorSaveReturn => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get update functions from Zustand store
  const updateNote = useFileSystemStore(state => state.updateNote);

  // Track changes
  useEffect(() => {
    const hasChanges = title !== initialTitle || content !== initialContent;
    setHasUnsavedChanges(hasChanges);
  }, [title, content, initialTitle, initialContent]);

  // Auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      save();
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [title, content, hasUnsavedChanges, autoSaveDelay]);

  const save = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    
    try {
      // Update Zustand store
      updateNote(noteId, {
        title,
        content
      });

      // Call custom save handler if provided
      if (onSave) {
        await onSave({ title, content });
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, noteId, updateNote, onSave, hasUnsavedChanges]);

  return {
    title,
    setTitle,
    content,
    setContent,
    lastSaved,
    isSaving,
    save,
    hasUnsavedChanges
  };
}; 