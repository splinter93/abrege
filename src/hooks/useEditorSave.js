import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export interface UseEditorSaveOptions {
  onSave?: (data: {
    title: string;
    markdown_content: string;
    html_content: string;
    headerImage?: string | null;
    titleAlign?: string;
  }) => void;
  editor?: {
    getHTML: () => string;
    storage: { markdown: { getMarkdown: () => string } };
  };
  headerImage?: string | null;
  titleAlign?: string;
}

export interface UseEditorSaveResult {
  isSaving: boolean;
  lastSaved: Date;
  handleSave: (newTitle: string, _content: string, align?: string) => void;
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
  const handleSave = useCallback((newTitle: string, _content: string, align = titleAlign) => {
    if (onSave && editor) {
      setIsSaving(true);
      const html_content = editor.getHTML();
      const markdown_content = editor.storage.markdown.getMarkdown();
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