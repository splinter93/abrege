import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { NoteData } from '../types/editor';
import { simpleLogger as logger } from '@/utils/logger';


export interface UseEditorSaveOptions {
  onSave?: (data: NoteData) => void;
  editor?: {
    getHTML: () => string;
    storage: { markdown: { getMarkdown: () => string } };
  };
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
export default function useEditorSave({ onSave, editor, titleAlign }: UseEditorSaveOptions): UseEditorSaveResult {
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
      if (process.env.NODE_ENV === 'development') {
        // Log autosave déclenchée
         
        logger.dev('[AUTOSAVE] Sauvegarde déclenchée', { newTitle, markdown_content });
      }
      try {
        // Ne pas inclure headerImage dans l'autosave de texte pour éviter les conflits
        await onSave({ title: newTitle, markdown_content, html_content, titleAlign: align });
        setLastSaved(new Date());
      } catch (e) {
        toast.error('Erreur lors de la sauvegarde');
        if (process.env.NODE_ENV === 'development') {
           
          logger.error('[AUTOSAVE] Échec de la sauvegarde', e);
        }
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.error('Erreur : impossible de sauvegarder (éditeur ou callback manquant)');
    }
  }, [onSave, editor, titleAlign]);

  return {
    isSaving,
    lastSaved,
    handleSave,
  };
} 