import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { s3Service } from '@/services/s3Service';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logger, LogCategory } from '@/utils/logger';
import { MAX_PDF_FILE_SIZE_BYTES } from '@/features/pdf-parsing/utils/validatePdfFile';
import { CHAT_PDF_S3_PREFIX } from '@/features/pdf-parsing/utils/resolveChatPdfS3Key';

const UploadPdfSchema = z.object({
  file_name: z.string().min(1),
  file_type: z.literal('application/pdf'),
  file_size: z.number().int().positive().max(MAX_PDF_FILE_SIZE_BYTES),
  session_id: z.string().uuid(),
});

/**
 * POST /api/ui/chat-pdfs
 *
 * Génère une presigned URL pour uploader un PDF de chat vers S3 (contourne limite Vercel 4.5 Mo).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { operation: 'ui_chat_pdfs_upload', component: 'API_UI', clientType };

  logger.info(LogCategory.API, 'Upload PDF chat - début', context);

  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.success) {
      logger.error(LogCategory.API, 'Auth failed', { error: auth.error });
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();
    const parsed = UploadPdfSchema.safeParse(body);

    if (!parsed.success) {
      logger.error(LogCategory.API, 'Validation failed', { errors: parsed.error.flatten() });
      return NextResponse.json(
        { error: 'Payload invalide', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { file_name, file_type, file_size, session_id } = parsed.data;

    logger.debug(LogCategory.API, 'Upload PDF chat:', {
      fileName: file_name,
      fileSize: `${(file_size / 1024 / 1024).toFixed(2)} Mo`,
      sessionId: session_id,
    });

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const key = `${CHAT_PDF_S3_PREFIX}/${userId}/${session_id}/${timestamp}-${random}.pdf`;

    const { url } = await s3Service.generateUploadUrl({
      fileName: key,
      fileType: file_type,
      allowedTypes: ['application/pdf'],
      maxSize: MAX_PDF_FILE_SIZE_BYTES,
      expiresIn: 900,
    });

    logger.info(LogCategory.API, 'Presigned URL PDF générée', { key });

    return NextResponse.json(
      {
        success: true,
        upload_url: url,
        key,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(LogCategory.API, 'Erreur upload PDF chat:', {
      error: errorMessage,
      ...context,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la génération de l\'URL d\'upload',
      },
      { status: 500 }
    );
  }
}
