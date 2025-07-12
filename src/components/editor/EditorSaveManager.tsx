import React, { useState, useCallback } from 'react';

interface EditorSaveManagerProps {
  initialTitle: string;
  initialContent: string;
  onSave: (data: { title: string; content: string }) => void;
  children: (props: {
    title: string;
    setTitle: (t: string) => void;
    content: string;
    setContent: (c: string) => void;
    lastSaved: Date | null;
    isSaving: boolean;
    save: () => void;
  }) => React.ReactNode;
}

/**
 * Centralise la logique de sauvegarde de l’éditeur (auto-save, feedback, etc.)
 */
const EditorSaveManager: React.FC<EditorSaveManagerProps> = ({ initialTitle, initialContent, onSave, children }) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(() => {
    setIsSaving(true);
    onSave({ title, content });
    setLastSaved(new Date());
    setTimeout(() => setIsSaving(false), 500);
  }, [title, content, onSave]);

  // TODO: Ajouter auto-save, debounce, etc.

  return (
    <>{children({ title, setTitle, content, setContent, lastSaved, isSaving, save })}</>
  );
};

export default EditorSaveManager; 