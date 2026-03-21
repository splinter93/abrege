import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { s3Service } from '@/services/s3Service';
import { logApi } from '@/utils/logger';

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
  let file: { id: string; url?: string; filename: string; deleted_at?: string | null; owner_id?: string; user_id?: string; visibility_mode?: string; status?: string; note_id?: string | null; s3_key?: string; etag?: string | null } | null = null;
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

  const allCookies = request.cookies.getAll();
  logApi.debug('🔍 [public-file] Cookies présents', {
    names: allCookies.map((c) => c.name),
    count: allCookies.length,
  });

  // Optional auth: if requester is the owner, allow access regardless of publish state
  let requesterId: string | null = null;
  let token: string | null = null;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    logApi.debug('🔍 [public-file] Token via Authorization header');
  }
  
  // Fallback to Supabase access token cookie for browser image requests
  if (!token) {
    // Try multiple possible cookie names
    const cookieNames = ['sb-access-token', 'supabase-auth-token', 'sb-3223651c-5580-4471-affb-b3f4456bd729-auth-token'];
    for (const name of cookieNames) {
      const cookie = request.cookies.get(name);
      if (cookie?.value) {
        token = cookie.value;
        logApi.debug('🔍 [public-file] Token via cookie', { cookieName: name });
        break;
      }
    }
  }

  if (token) {
    try {
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      if (error) {
        logApi.debug('🔍 [public-file] Auth error', { message: error.message });
      } else if (user) {
        requesterId = user.id;
        logApi.debug('🔍 [public-file] Utilisateur authentifié', { userId: user.id });
      }
    } catch (err) {
      logApi.debug('🔍 [public-file] Auth exception', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    logApi.debug('🔍 [public-file] Aucun token');
  }

  const isOwner = requesterId && (requesterId === file.user_id || requesterId === file.owner_id);
  logApi.debug('🔍 [public-file] Propriété fichier', {
    fileUserId: file.user_id,
    requesterId,
    isOwner,
  });
  
  let isPublic = false;

  if (!isOwner) {
    if (file.visibility_mode === 'public') {
      isPublic = true;
    } else if (file.visibility_mode === 'inherit_note' && file.note_id) {
      const { data: note } = await supabase
        .from('articles')
        .select('visibility')
        .eq('id', file.note_id)
        .maybeSingle();
      isPublic = note?.visibility !== 'private';
      logApi.debug('🔍 [public-file] Visibilité note', {
        visibility: note?.visibility,
        isPublic,
      });
    }
  }

  if (!isOwner && !isPublic) {
    logApi.debug('🔍 [public-file] Accès refusé (non propriétaire et non public)');
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }

  logApi.debug('🔍 [public-file] Accès OK, redirection S3');
  
  // Short-lived signed GET from S3
  if (!file.s3_key) {
    return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
  }

  const signed = await s3Service.generateGetUrl(file.s3_key, 120);
  const url = new URL(signed);
  if (file.etag) url.searchParams.set('v', file.etag);

  return NextResponse.redirect(url.toString(), {
    headers: { 'Cache-Control': isPublic ? 'public, max-age=60, s-maxage=300' : 'private, max-age=0, no-store' },
  });
} 