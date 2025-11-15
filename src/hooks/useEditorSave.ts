import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getEditorMarkdown } from '@/utils/editorHelpers';
// Type pour les données de sauvegarde
interface NoteData {
  title: string;
  markdown_content: string;
  html_content: string;
  titleAlign?: 'left' | 'center' | 'right';
}
import { simpleLogger as logger } from '@/utils/logger';
import { sanitizeNoteEmbedHtml } from '@/utils/sanitizeNoteEmbedHtml';

const isEmptyProseMirrorHtml = (html: string): boolean => {
  if (!html) {
    return true;
  }

  const normalized = html
    .replace(/<br\s+class="ProseMirror-trailingBreak"\s*\/?>/gi, '<br/>')
    .replace(/\s+/g, '')
    .toLowerCase();

  return /^<p>(?:<br\/?>)*<\/p>$/.test(normalized);
};

const normalizeHtmlContent = (html: string): string => {
  if (!html) {
    return '';
  }

  const trimmed = html.trim();
  if (!trimmed || isEmptyProseMirrorHtml(trimmed)) {
    return '';
  }

  return trimmed.replace(/<br\s+class="ProseMirror-trailingBreak"\s*\/?>/gi, '<br/>');
};


export interface UseEditorSaveOptions {
  onSave?: (data: NoteData) => void;
  editor?: {
    getHTML: () => string;
    storage?: { markdown?: { getMarkdown?: () => string } };
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
export default function useEditorSave({ onSave, editor }: UseEditorSaveOptions): UseEditorSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(new Date());

  /**
   * Fonction de sauvegarde à appeler depuis l'éditeur
   */
  const handleSave = useCallback(async (newTitle: string, _content: string, align?: 'left' | 'center' | 'right') => {
    if (onSave && editor) {
      setIsSaving(true);
      const rawHtmlContent = editor.getHTML();
      const sanitizedHtml = sanitizeNoteEmbedHtml(rawHtmlContent);
      const html_content = normalizeHtmlContent(sanitizedHtml);
      let markdown_content = getEditorMarkdown(editor);
      
      // 🔧 FIX: Supprimer l'échappement des titres (ex: \# → #)
      markdown_content = markdown_content.replace(/\\(#+ )/g, '$1');
      
      // 🔧 FIX COMPLET: Ajouter des sauts de ligne entre images et éléments markdown de bloc
      // Gère: titres (#), blockquotes (>), listes (-, *, 1.), code blocks (```), lignes horizontales (---)
      // Utilise un lookahead pour détecter les éléments de bloc sans les capturer
      markdown_content = markdown_content.replace(
        /(\!\[.*?\]\(.*?\))(\s*)(?=[#>*\-`]|\d+\.)/gm,
        (_match, image, whitespace) => {
          // Compter les sauts de ligne existants
          const lineBreaks = (whitespace.match(/\n/g) || []).length;
          // S'assurer qu'il y a au moins 2 sauts de ligne (ligne vide) entre l'image et l'élément suivant
          if (lineBreaks < 2) {
            return `${image}\n\n`;
          }
          return image + whitespace;
        }
      );
      
      if (process.env.NODE_ENV === 'development') {
        // Log autosave déclenchée
         
        logger.dev('[AUTOSAVE] Sauvegarde déclenchée', { newTitle, markdown_content });
      }
      try {
        // Ne pas inclure headerImage dans l'autosave de texte pour éviter les conflits
        await onSave({ title: newTitle, markdown_content, html_content, titleAlign: align });
        setLastSaved(new Date());
        
        // Toast de succès simple
        toast.success('Saved', {
          duration: 2000,
          icon: '✓',
          position: 'bottom-right',
          style: {
            background: 'rgba(34, 197, 94, 0.95)',
            color: 'white',
            fontWeight: 500,
            fontSize: '14px',
            padding: '8px 14px',
            borderRadius: '8px',
          },
        });
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
  }, [onSave, editor]);

  return {
    isSaving,
    lastSaved,
    handleSave,
  };
} 