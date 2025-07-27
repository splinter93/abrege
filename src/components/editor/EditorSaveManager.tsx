import React from 'react';
import { useEditorSave } from '@/hooks/editor/useEditorSave';

interface EditorSaveManagerProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave?: (data: { title: string; content: string }) => void;
  children: (props: {
    title: string;
    setTitle: (t: string) => void;
    content: string;
    setContent: (c: string) => void;
    lastSaved: Date | null;
    isSaving: boolean;
    save: () => void;
    hasUnsavedChanges: boolean;
  }) => React.ReactNode;
}

/**
 * Centralise la logique de sauvegarde de l'éditeur (auto-save, feedback, etc.)
 * Utilise le hook useEditorSave pour une meilleure séparation des responsabilités
 */
const EditorSaveManager: React.FC<EditorSaveManagerProps> = ({ 
  noteId, 
  initialTitle, 
  initialContent, 
  onSave, 
  children 
}) => {
  const {
    title,
    setTitle,
    content,
    setContent,
    lastSaved,
    isSaving,
    save,
    hasUnsavedChanges
  } = useEditorSave({
    noteId,
    initialTitle,
    initialContent,
    onSave
  });

  return (
    <>{children({ 
      title, 
      setTitle, 
      content, 
      setContent, 
      lastSaved, 
      isSaving, 
      save,
      hasUnsavedChanges 
    })}</>
  );
};

export default EditorSaveManager; 