import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { NoteData } from '../types/editor';

export interface UseEditorSaveOptions {
  onSave?: (data: NoteData) => void;
  editor?: {
    getHTML: () => string;
    storage: { markdown: { getMarkdown: () => string } };
  };
  headerImage?: string | null;
  titleAlign?: 'left' | 'center' | 'right';
}

export interface UseEditorSaveResult {
  isSaving: boolean;
  lastSaved: Date;
  handleSave: (newTitle: string, _content: string, align?: 'left' | 'center' | 'right') => void;
}

/**
 * Hook pour gérer la sauvegarde de l'éditeur (logique extraite de Editor.jsx).
 * @param {Object} options - { onSave, editor, headerImage, titleAlign }
 */
export default function useEditorSave({ onSave, editor, headerImage, titleAlign }: UseEditorSaveOptions): UseEditorSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(new Date());

  /**
   * Fonction de sauvegarde à appeler depuis l'éditeur
   */
  const handleSave = useCallback((newTitle: string, _content: string, align?: 'left' | 'center' | 'right') => {
    if (onSave && editor) {
      setIsSaving(true);
      const html_content = editor.getHTML();
      let markdown_content = editor.storage.markdown.getMarkdown();
      // Patch : retire les backslash devant les titres après une image
      markdown_content = markdown_content.replace(/\\(#+ )/g, '$1');
      // Patch : ajoute un saut de ligne après chaque image si le suivant est un titre
      markdown_content = markdown_content.replace(/(\!\[.*?\]\(.*?\))\s*(#+ )/g, '$1\n\n$2');
      onSave({ title: newTitle, markdown_content, html_content, headerImage, titleAlign: align });
      setLastSaved(new Date());
      setIsSaving(false);
      toast.success('Note sauvegardée !');
    } else {
      toast.error('Erreur : impossible de sauvegarder (éditeur ou callback manquant)');
    }
  }, [onSave, editor, headerImage, titleAlign]);

  return {
    isSaving,
    lastSaved,
    handleSave,
  };
} 