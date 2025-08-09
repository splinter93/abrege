import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { s3Service } from '@/services/s3Service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Anon client only for auth.getUser(token)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
// Service client for DB reads (bypass RLS, we enforce access in code)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const schema = z.object({
  ref: z.string().min(1),
});

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<NextResponse> {
  const { ref } = await params;
  const parse = schema.safeParse({ ref });
  if (!parse.success) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 422 });
  }

  // Resolve file by id or slug
  let file: any = null;
  if (isUUID(ref)) {
    const { data } = await supabase.from('files').select('*').eq('id', ref).maybeSingle();
    file = data;
  } else {
    const { data } = await supabase.from('files').select('*').eq('slug', ref).maybeSingle();
    file = data;
  }

  if (!file || file.deleted_at) {
    return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
  }

  // Optional auth: if requester is the owner, allow access regardless of publish state
  let requesterId: string | null = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    requesterId = user?.id || null;
  }

  const isOwner = requesterId && (requesterId === file.user_id || requesterId === file.owner_id);
  let isPublic = false;

  if (!isOwner) {
    if (file.visibility_mode === 'public') {
      isPublic = true;
    } else if (file.visibility_mode === 'inherit_note' && file.note_id) {
      const { data: note } = await supabase
        .from('articles')
        .select('ispublished')
        .eq('id', file.note_id)
        .maybeSingle();
      isPublic = !!note?.ispublished;
    }
  }

  if (!isOwner && !isPublic) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }

  // Short-lived signed GET from S3
  const signed = await s3Service.generateGetUrl(file.s3_key, 120);
  const url = new URL(signed);
  if (file.etag) url.searchParams.set('v', file.etag);

  return NextResponse.redirect(url.toString(), {
    headers: { 'Cache-Control': isPublic ? 'public, max-age=60, s-maxage=300' : 'private, max-age=0, no-store' },
  });
} 