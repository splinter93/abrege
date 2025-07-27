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
  handleSave: (title: string, content: string, align?: 'left' | 'center' | 'right') => Promise<void>;
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
  const handleSave = useCallback(async (newTitle: string, _content: string, align?: 'left' | 'center' | 'right') => {
    if (onSave && editor) {
      setIsSaving(true);
      const html_content = editor.getHTML();
      let markdown_content = editor.storage.markdown.getMarkdown();
      markdown_content = markdown_content.replace(/\\(#+ )/g, '$1');
      markdown_content = markdown_content.replace(/(\!\[.*?\]\(.*?\))\s*(#+ )/g, '$1\n\n$2');
      try {
        await onSave({ title: newTitle, markdown_content, html_content, headerImage, titleAlign: align });
        setLastSaved(new Date());
        toast.success('Saved', {
          duration: 2000,
          position: 'bottom-right',
          style: {
            background: '#000000',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '8px 12px',
            minWidth: 0,
            fontSize: 13,
          },
        });
      } catch {
        toast.error('Erreur lors de la sauvegarde');
      } finally {
        setIsSaving(false);
      }
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