import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { s3Service } from '@/services/s3Service';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { logger, LogCategory } from '@/utils/logger';

const schema = z.object({
  file_name: z.string().min(1),
  file_type: z.string().min(1),
  file_size: z.number().int().positive(),
  scope: z.object({
    note_ref: z.string().min(1).optional(),
  }).optional(),
  visibility_mode: z.enum(['inherit_note', 'private', 'public']).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { operation: 'v2_files_presign_upload', component: 'API_V2', clientType };
  logger.info(LogCategory.API, '🚀 Début presign upload', context);

  // Auth
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }
  const userId = auth.userId!;

  // Validate
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide', details: parsed.error.flatten() }, { status: 422 });
  }
  const { file_name, file_type, file_size, scope } = parsed.data;

  try {
    // Validate type/size
    s3Service.validateFileType(file_type, ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    s3Service.validateFileSize(file_size, 8 * 1024 * 1024);

    // Resolve note if provided, but we don't enforce ownership here (handled on register)
    let noteId: string | undefined;
    if (scope?.note_ref) {
      const resolved = await V2ResourceResolver.resolveRef(scope.note_ref, 'note', userId, context);
      if (!resolved.success) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }
      noteId = resolved.id;
    }

    // Generate structured key
    const key = s3Service.generateStructuredKey(userId, file_name);

    const { url } = await s3Service.generateUploadUrl({
      fileName: key,
      fileType: file_type,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxSize: 8 * 1024 * 1024,
      expiresIn: 900, // 15 min
    });

    return NextResponse.json({
      upload_url: url,
      key,
      headers: { 'Content-Type': file_type },
    }, { status: 200 });
  } catch (error: any) {
    logger.error(LogCategory.API, `❌ Erreur presign: ${error?.message || error}`, { ...context, error });
    return NextResponse.json({ error: 'Erreur presign' }, { status: 500 });
  }
} 