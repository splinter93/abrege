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

  // Debug: log all cookies to see what's available
  const allCookies = request.cookies.getAll();
  console.log('🔍 [DEBUG] All cookies:', allCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })));

  // Optional auth: if requester is the owner, allow access regardless of publish state
  let requesterId: string | null = null;
  let token: string | null = null;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    console.log('🔍 [DEBUG] Using Authorization header token');
  }
  
  // Fallback to Supabase access token cookie for browser image requests
  if (!token) {
    // Try multiple possible cookie names
    const cookieNames = ['sb-access-token', 'supabase-auth-token', 'sb-3223651c-5580-4471-affb-b3f4456bd729-auth-token'];
    for (const name of cookieNames) {
      const cookie = request.cookies.get(name);
      if (cookie?.value) {
        token = cookie.value;
        console.log('🔍 [DEBUG] Using cookie token from:', name);
        break;
      }
    }
  }

  if (token) {
    try {
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      if (error) {
        console.log('🔍 [DEBUG] Auth error:', error.message);
      } else if (user) {
        requesterId = user.id;
        console.log('🔍 [DEBUG] Authenticated user:', user.id);
      }
    } catch (err) {
      console.log('🔍 [DEBUG] Auth exception:', err);
    }
  } else {
    console.log('🔍 [DEBUG] No token found');
  }

  const isOwner = requesterId && (requesterId === file.user_id || requesterId === file.owner_id);
  console.log('🔍 [DEBUG] File owner:', file.user_id, 'Requester:', requesterId, 'IsOwner:', isOwner);
  
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
      console.log('🔍 [DEBUG] Note published:', note?.ispublished, 'IsPublic:', isPublic);
    }
  }

  if (!isOwner && !isPublic) {
    console.log('🔍 [DEBUG] Access denied - not owner and not public');
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }

  console.log('🔍 [DEBUG] Access granted, redirecting to S3');
  
  // Short-lived signed GET from S3
  const signed = await s3Service.generateGetUrl(file.s3_key, 120);
  const url = new URL(signed);
  if (file.etag) url.searchParams.set('v', file.etag);

  return NextResponse.redirect(url.toString(), {
    headers: { 'Cache-Control': isPublic ? 'public, max-age=60, s-maxage=300' : 'private, max-age=0, no-store' },
  });
} 