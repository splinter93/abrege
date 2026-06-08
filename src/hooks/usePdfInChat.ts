/**
 * Hook pour parser des PDFs via S3 + Mistral OCR puis créer une note et l'attacher au chat.
 * Flow : upload S3 (presigned) → parse via s3_key → nouvelle note → injectée dans le chat.
 */

import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { chatSuccess } from '@/utils/chatToast';
import { useAuth } from '@/hooks/useAuth';
import type { SelectedNote } from './useNotesLoader';
import { pdfParserService, validatePdfFile } from '@/features/pdf-parsing';
import { chatPdfUploadService } from '@/services/chatPdfUploadService';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';
import { getOrCreateQuicknotesFolders } from '@/utils/quicknotesUtils';

interface UsePdfInChatOptions {
  sessionId: string;
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

export function usePdfInChat({ sessionId, setSelectedNotes }: UsePdfInChatOptions) {
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  const handlePdfFiles = useCallback(
    async (files: File[]) => {
      const pdfFiles = files.filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfFiles.length === 0) return;

      if (!sessionId?.trim()) {
        setPdfError('Session chat invalide');
        return;
      }

      setPdfError(null);

      const token = await getAccessToken();
      if (!token) {
        setPdfError('Authentification requise');
        return;
      }

      let quicknotesFolders;
      try {
        quicknotesFolders = await getOrCreateQuicknotesFolders();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setPdfError(`Erreur Quicknotes: ${message}`);
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
          setIsUploadingPdf(true);
          let uploaded;
          try {
            uploaded = await chatPdfUploadService.uploadPdf(file, sessionId, token);
          } finally {
            setIsUploadingPdf(false);
          }

          setIsParsingPdf(true);
          let parseResult;
          try {
            parseResult = await pdfParserService.parseFromS3Key(
              uploaded.key,
              {
                resultType: 'markdown',
                splitByPage: false,
                includeTables: true,
              },
              token
            );
          } finally {
            setIsParsingPdf(false);
          }

          if (!parseResult.success || !parseResult.data) {
            setPdfError(parseResult.error ?? 'Erreur de parsing');
            logger.warn('[usePdfInChat] Parse échoué', {
              requestId: parseResult.requestId,
              error: parseResult.error,
              s3Key: uploaded.key,
            });
            continue;
          }

          const title = noteTitleFromFileName(file.name);
          const markdown =
            parseResult.data.fullMarkdown ?? parseResult.data.fullText ?? '';

          const createPayload = {
            source_title: title,
            markdown_content: markdown,
            notebook_id: quicknotesFolders.quicknotesClasseurId,
            folder_id: quicknotesFolders.pdfFolderId,
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
            s3Key: uploaded.key,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setPdfError(message);
          logger.error('[usePdfInChat] Erreur', { error: err, fileName: file.name });
        }
      }
    },
    [sessionId, setSelectedNotes, getAccessToken]
  );

  const clearPdfError = useCallback(() => setPdfError(null), []);

  const isPdfBusy = isUploadingPdf || isParsingPdf;

  return {
    handlePdfFiles,
    isUploadingPdf,
    isParsingPdf,
    isPdfBusy,
    pdfError,
    clearPdfError,
  };
}
