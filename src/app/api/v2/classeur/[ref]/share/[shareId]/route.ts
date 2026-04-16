import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const patchSchema = z.object({
  permission_level: z.enum(['read', 'write']),
});

/**
 * PATCH /api/v2/classeur/{ref}/share/{shareId}
 * Modifie le permission_level d'un partage existant (read ↔ write).
 * Réservé au shared_by (owner du classeur).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string; shareId: string }> },
): Promise<NextResponse> {
  const { ref, shareId } = await params;
  const context = { operation: 'v2_classeur_share_patch', component: 'API_V2', ref, shareId };

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
    return NextResponse.json({ error: 'permission_level invalide (read | write)' }, { status: 400 });
  }
  const { permission_level } = parsed.data;

  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json({ error: resolveResult.error }, { status: resolveResult.status });
  }
  const classeurId = resolveResult.id;

  const { data: share, error: fErr } = await service
    .from('classeur_shares')
    .select('id, classeur_id, shared_by, shared_with, permission_level')
    .eq('id', shareId)
    .maybeSingle();

  if (fErr || !share || share.classeur_id !== classeurId) {
    return NextResponse.json({ error: 'Partage introuvable' }, { status: 404 });
  }

  if (share.shared_by !== userId) {
    return NextResponse.json({ error: 'Seul le propriétaire peut modifier les permissions' }, { status: 403 });
  }

  const { data: updated, error: uErr } = await service
    .from('classeur_shares')
    .update({ permission_level })
    .eq('id', shareId)
    .select('id, classeur_id, shared_by, shared_with, permission_level, created_at')
    .single();

  if (uErr) {
    logApi.info(`[v2_classeur_share_patch] ${uErr.message}`, context);
    return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    share: {
      shareId: updated.id,
      sharedWith: updated.shared_with,
      permissionLevel: updated.permission_level,
      createdAt: updated.created_at,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string; shareId: string }> },
): Promise<NextResponse> {
  const { ref, shareId } = await params;
  const context = { operation: 'v2_classeur_share_delete', component: 'API_V2', ref, shareId };

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

  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json({ error: resolveResult.error }, { status: resolveResult.status });
  }
  const classeurId = resolveResult.id;

  const { data: share, error: fErr } = await service
    .from('classeur_shares')
    .select('id, classeur_id, shared_by, shared_with')
    .eq('id', shareId)
    .maybeSingle();

  if (fErr || !share || share.classeur_id !== classeurId) {
    return NextResponse.json({ error: 'Partage introuvable' }, { status: 404 });
  }

  if (share.shared_by !== userId && share.shared_with !== userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { error: dErr } = await service.from('classeur_shares').delete().eq('id', shareId);
  if (dErr) {
    logApi.info(`[v2_classeur_share_delete] ${dErr.message}`, context);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
