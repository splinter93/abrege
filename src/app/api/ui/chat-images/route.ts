import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { s3Service } from '@/services/s3Service';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Schéma de validation pour l'upload d'images de chat
 */
const UploadImageSchema = z.object({
  file_name: z.string().min(1),
  file_type: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
  file_size: z.number().int().positive().max(26214400), // 25 Mo max (limite Grok)
  session_id: z.string().uuid(),
});

/**
 * POST /api/ui/chat-images
 * 
 * Génère une presigned URL pour uploader une image de chat vers S3
 * 
 * Body:
 * - file_name: string
 * - file_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
 * - file_size: number (max 25 Mo)
 * - session_id: string (UUID de la session chat)
 * 
 * Returns:
 * - upload_url: string (presigned URL S3)
 * - key: string (clé S3 pour récupérer l'URL finale)
 * - public_url: string (URL publique finale)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { operation: 'ui_chat_images_upload', component: 'API_UI', clientType };
  
  logger.info(LogCategory.API, '🚀 Upload image chat - début', context);

  try {
    // ✅ Authentification
    const auth = await getAuthenticatedUser(request);
    if (!auth.success) {
      logger.error(LogCategory.API, '❌ Auth failed', { error: auth.error });
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }
    const userId = auth.userId!;

    // ✅ Validation du payload
    const body = await request.json();
    const parsed = UploadImageSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.error(LogCategory.API, '❌ Validation failed', { errors: parsed.error.flatten() });
      return NextResponse.json({ 
        error: 'Payload invalide', 
        details: parsed.error.flatten() 
      }, { status: 422 });
    }

    const { file_name, file_type, file_size, session_id } = parsed.data;

    logger.debug(LogCategory.API, '📋 Upload image:', { 
      fileName: file_name, 
      fileType: file_type,
      fileSize: `${(file_size / 1024 / 1024).toFixed(2)} Mo`,
      sessionId: session_id
    });

    // ✅ Générer une clé S3 structurée
    // Format: chat-images/{userId}/{sessionId}/{timestamp}-{random}.{ext}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = file_type.split('/')[1]; // 'image/jpeg' → 'jpeg'
    const fileName = `${timestamp}-${random}.${extension}`;
    const key = `chat-images/${userId}/${session_id}/${fileName}`;

    logger.debug(LogCategory.API, '🔑 S3 key généré:', { key });

    // ✅ Générer presigned URL pour upload
    const { url } = await s3Service.generateUploadUrl({
      fileName: key,
      fileType: file_type,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxSize: 26214400, // 25 Mo
      expiresIn: 900, // 15 min
    });

    // ✅ Générer l'URL publique (pour affichage après upload)
    const publicUrl = s3Service.getObjectUrl(key);

    logger.info(LogCategory.API, '✅ Presigned URL générée', { key, publicUrl });

    return NextResponse.json({
      success: true,
      upload_url: url,
      key: key,
      public_url: publicUrl,
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(LogCategory.API, '❌ Erreur upload image chat:', { 
      error: errorMessage, 
      ...context 
    });
    
    return NextResponse.json({ 
      success: false,
      error: 'Erreur lors de la génération de l\'URL d\'upload' 
    }, { status: 500 });
  }
}

