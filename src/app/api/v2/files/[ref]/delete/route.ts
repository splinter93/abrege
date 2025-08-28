import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const paramsSchema = z.object({ ref: z.string().min(1) });

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = { operation: 'v2_files_delete', component: 'API_V2', clientType };

  const auth = await getAuthenticatedUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }
  const userId = auth.userId!;

  const { ref } = await params;
  const parse = paramsSchema.safeParse({ ref });
  if (!parse.success) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 422 });
  }

  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Find file owned by user
  const query = supabase.from('files').select('*').eq('user_id', userId).limit(1);
  const { data: file, error: findErr } = isUUID(ref)
    ? await query.eq('id', ref).maybeSingle()
    : await query.eq('slug', ref).maybeSingle();

  if (findErr || !file) {
    return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
  }

  // Soft delete
  const { error: delErr } = await supabase
    .from('files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', file.id);

  if (delErr) {
    logApi(context.operation, `❌ Erreur soft delete: ${delErr.message}`, context);
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
} 