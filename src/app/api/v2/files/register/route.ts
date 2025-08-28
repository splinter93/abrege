import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { s3Service } from '@/services/s3Service';
import { logger, LogCategory } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const schema = z.object({
  key: z.string(),
  file_name: z.string(),
  file_type: z.string(),
  file_size: z.number(),
  scope: z.object({
    note_ref: z.string().optional()
  }).optional(),
  visibility_mode: z.enum(['private', 'public']).default('private')
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { operation: 'v2_files_register', component: 'API_V2', clientType };
  logger.info(LogCategory.API, '🚀 Début register fichier', context);

  const auth = await getAuthenticatedUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }
  const userId = auth.userId!;

  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide', details: parsed.error.flatten() }, { status: 422 });
  }
  const { key, file_name, file_type, file_size, scope, visibility_mode } = parsed.data;

  try {
    const head = await s3Service.getHeadObject(key);
    if (!head.contentLength || head.contentLength !== file_size) {
      return NextResponse.json({ error: 'Taille invalide' }, { status: 400 });
    }
    if (head.contentType && head.contentType !== file_type) {
      return NextResponse.json({ error: 'Type MIME invalide' }, { status: 400 });
    }

    let noteId: string | null = null;
    if (scope?.note_ref) {
      const resolved = await V2ResourceResolver.resolveRef(scope.note_ref, 'note', userId, context);
      if (!resolved.success) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }
      noteId = resolved.id;
    }

    const canonicalUrl = s3Service.getObjectUrl(key);

    // Check if exists by s3_key
    const { data: existing, error: checkError } = await supabase
      .from('files')
      .select('*')
      .eq('s3_key', key)
      .maybeSingle();

    if (checkError) {
      logger.error(LogCategory.API, `❌ DB check error: ${checkError.message}`, { ...context, error: checkError });
      return NextResponse.json({ error: `Erreur DB: ${checkError.message}` }, { status: 500 });
    }

    let row = existing;

    if (!existing) {
      const insertPayload = {
        user_id: userId,
        owner_id: userId,
        note_id: noteId,
        filename: file_name,
        mime_type: file_type,
        size: file_size,
        url: canonicalUrl,
        preview_url: null,
        visibility_mode,
        s3_key: key,
        etag: head.etag || null,
        visibility: 'private' as const,
      } as any;

      const { data: created, error: insertError } = await supabase
        .from('files')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError || !created) {
        const msg = insertError?.message || 'Insertion échouée';
        logger.error(LogCategory.API, `❌ DB insert error: ${msg}`, { ...context, error: insertError });
        return NextResponse.json({ error: `Erreur DB: ${msg}` }, { status: 500 });
      }
      row = created;
    }

    const signedUrl = await s3Service.generateGetUrl(key, 180);
    const publicControlUrl = `/api/v1/public/file/${row.id}${row.etag ? `?v=${row.etag}` : ''}`;

    return NextResponse.json({ file: row, signed_url: signedUrl, public_control_url: publicControlUrl }, { status: 200 });
  } catch (error: any) {
    logger.error(LogCategory.API, `❌ Erreur register: ${error?.message || error}`, { ...context, error });
    return NextResponse.json({ error: 'Erreur register' }, { status: 500 });
  }
} 