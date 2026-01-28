/**
 * Hook pour parser des PDFs via l'API Hybrid Parser puis créer une note et l'attacher au chat
 * Phase 1 : parse → nouvelle note → injectée dans le chat (selectedNotes)
 */

import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { chatSuccess } from '@/utils/chatToast';
import { useAuth } from '@/hooks/useAuth';
import type { SelectedNote } from './useNotesLoader';
import { hybridPdfParserService, validatePdfFile } from '@/services/hybridPdfParserService';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';

interface UsePdfInChatOptions {
  setSelectedNotes: React.Dispatch<React.SetStateAction<SelectedNote[]>>;
}

/**
 * Titre de note à partir du nom de fichier (sans .pdf, nettoyé)
 */
function noteTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').trim();
  return base.length > 0 ? base.slice(0, 255) : 'Document PDF';
}

/**
 * Construit un SelectedNote à partir de la réponse API create note
 */
function toSelectedNote(note: {
  id: string;
  slug: string;
  source_title?: string;
  created_at?: string;
  markdown_content?: string;
}): SelectedNote {
  const title = note.source_title ?? 'Sans titre';
  const wordCount = note.markdown_content
    ? note.markdown_content.trim().split(/\s+/).filter(Boolean).length
    : undefined;
  return {
    id: note.id,
    slug: note.slug,
    title,
    description: note.markdown_content?.substring(0, 200),
    word_count: wordCount,
    created_at: note.created_at,
  };
}

export function usePdfInChat({ setSelectedNotes }: UsePdfInChatOptions) {
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  const handlePdfFiles = useCallback(
    async (files: File[]) => {
      const pdfFiles = files.filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfFiles.length === 0) return;

      setPdfError(null);
      setIsParsingPdf(true);

      const token = await getAccessToken();
      if (!token) {
        setPdfError('Authentification requise');
        setIsParsingPdf(false);
        return;
      }

      const v2Api = V2UnifiedApi.getInstance();

      for (const file of pdfFiles) {
        const validation = validatePdfFile(file);
        if (!validation.valid) {
          setPdfError(validation.error ?? 'Fichier invalide');
          continue;
        }

        try {
          const parseResult = await hybridPdfParserService.parse(
            file,
            {
              resultType: 'markdown',
              splitByPage: false,
              includeTables: true,
            },
            token
          );

          if (!parseResult.success || !parseResult.data) {
            setPdfError(parseResult.error ?? 'Erreur de parsing');
            logger.warn('[usePdfInChat] Parse échoué', {
              requestId: parseResult.requestId,
              error: parseResult.error,
            });
            continue;
          }

          const title = noteTitleFromFileName(file.name);
          const markdown =
            parseResult.data.fullMarkdown ?? parseResult.data.fullText ?? '';

          // Note orpheline (sans classeur) : API accepte notebook_id null/omis
          // Exception justifiée : CreateNoteData requiert notebook_id: string mais l'API v2/note/create
          // accepte null (validé par Zod schema). Le type TypeScript ne reflète pas cette flexibilité.
          const createPayload = {
            source_title: title,
            markdown_content: markdown,
            notebook_id: null,
          } as unknown as Parameters<typeof v2Api.createNote>[0];

          const createResult = await v2Api.createNote(createPayload);

          if (!createResult.success || !createResult.note) {
            setPdfError(createResult.error ?? 'Erreur création note');
            logger.warn('[usePdfInChat] Création note échouée', {
              error: createResult.error,
            });
            continue;
          }

          const newNote = toSelectedNote(createResult.note);
          setSelectedNotes((prev) => [...prev, newNote]);
          chatSuccess('PDF ajouté à la conversation');
          logger.info('[usePdfInChat] PDF ajouté au chat', {
            noteId: newNote.id,
            title: newNote.title,
            requestId: parseResult.requestId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setPdfError(message);
          logger.error('[usePdfInChat] Erreur', { error: err, fileName: file.name });
        }
      }

      setIsParsingPdf(false);
    },
    [setSelectedNotes]
  );

  const clearPdfError = useCallback(() => setPdfError(null), []);

  return {
    handlePdfFiles,
    isParsingPdf,
    pdfError,
    clearPdfError,
  };
}
