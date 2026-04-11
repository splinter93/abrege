import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const patchSchema = z.object({
  status: z.enum(['accepted', 'blocked']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const context = { operation: 'v2_teammates_patch', component: 'API_V2', id };

  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 },
    );
  }
  const userId = authResult.userId!;
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Service non configuré' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }
  const nextStatus = parsed.data.status;

  const { data: row, error: fetchErr } = await service
    .from('teammates')
    .select('id, user_id, teammate_id, status, requested_by')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    logApi.info(`[v2_teammates] PATCH fetch: ${fetchErr.message}`, context);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  if (row.teammate_id !== userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'Demande déjà traitée' }, { status: 409 });
  }

  const { error: upErr } = await service.from('teammates').update({ status: nextStatus }).eq('id', id);

  if (upErr) {
    logApi.info(`[v2_teammates] PATCH update: ${upErr.message}`, context);
    return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const context = { operation: 'v2_teammates_delete', component: 'API_V2', id };

  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 },
    );
  }
  const userId = authResult.userId!;
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Service non configuré' }, { status: 500 });
  }

  const { data: row, error: fetchErr } = await service
    .from('teammates')
    .select('id, user_id, teammate_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    logApi.info(`[v2_teammates] DELETE fetch: ${fetchErr.message}`, context);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Relation introuvable' }, { status: 404 });
  }

  if (row.user_id !== userId && row.teammate_id !== userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { error: delErr } = await service.from('teammates').delete().eq('id', id);

  if (delErr) {
    logApi.info(`[v2_teammates] DELETE: ${delErr.message}`, context);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
