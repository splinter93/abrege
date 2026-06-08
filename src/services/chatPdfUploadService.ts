import { logger, LogCategory } from '@/utils/logger';
import { validatePdfFile } from '@/features/pdf-parsing/utils/validatePdfFile';

export interface UploadedChatPdf {
  key: string;
  fileName: string;
  size: number;
  uploadedAt: number;
}

/**
 * Service d'upload des PDF de chat vers S3.
 *
 * Flow:
 * 1. POST /api/ui/chat-pdfs → presigned URL
 * 2. PUT direct vers S3 (contourne limite Vercel 4.5 Mo)
 * 3. Retourne la clé S3 pour parse via /api/pdf/parse?s3_key=
 */
export class ChatPdfUploadService {
  private static instance: ChatPdfUploadService;
  private readonly apiEndpoint = '/api/ui/chat-pdfs';

  private constructor() {}

  static getInstance(): ChatPdfUploadService {
    if (!ChatPdfUploadService.instance) {
      ChatPdfUploadService.instance = new ChatPdfUploadService();
    }
    return ChatPdfUploadService.instance;
  }

  /**
   * Upload un PDF vers S3 via presigned URL.
   */
  async uploadPdf(
    file: File,
    sessionId: string,
    token: string
  ): Promise<UploadedChatPdf> {
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      throw new Error(validation.error ?? 'Fichier PDF invalide');
    }

    const mimeType = file.type === 'application/pdf' ? file.type : 'application/pdf';

    const presignResponse = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_name: file.name,
        file_type: mimeType,
        file_size: file.size,
        session_id: sessionId,
      }),
    });

    if (!presignResponse.ok) {
      let message = `Erreur API: ${presignResponse.status}`;
      try {
        const errorBody = (await presignResponse.json()) as { error?: string };
        if (errorBody.error) message = errorBody.error;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(message);
    }

    const presignData = (await presignResponse.json()) as {
      upload_url?: string;
      key?: string;
    };

    if (!presignData.upload_url || !presignData.key) {
      throw new Error('Réponse presign invalide');
    }

    const uploadResponse = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Erreur upload S3: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    logger.info(LogCategory.API, '[ChatPdfUpload] PDF uploadé sur S3', {
      key: presignData.key,
      fileName: file.name,
      size: file.size,
    });

    return {
      key: presignData.key,
      fileName: file.name,
      size: file.size,
      uploadedAt: Date.now(),
    };
  }
}

export const chatPdfUploadService = ChatPdfUploadService.getInstance();
