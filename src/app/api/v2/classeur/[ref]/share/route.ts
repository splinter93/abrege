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

const postSchema = z.object({
  teammate_id: z.string().uuid(),
  permission_level: z.enum(['read', 'write']),
});

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  surname: string | null;
  profile_picture: string | null;
};

function displayName(u: Pick<UserRow, 'name' | 'surname' | 'username' | 'email'>): string {
  const fullName = [u.name, u.surname].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (u.username?.trim()) return u.username.trim();
  if (u.email?.trim()) return u.email.split('@')[0]!;
  return 'Utilisateur';
}

async function assertAcceptedTeammate(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  a: string,
  b: string,
): Promise<{ ok: boolean; serverError?: string }> {
  const { data, error } = await service
    .from('teammates')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(user_id.eq.${a},teammate_id.eq.${b}),and(user_id.eq.${b},teammate_id.eq.${a})`)
    .limit(1)
    .maybeSingle();
  if (error) {
    logApi.info(`[v2_classeur_share] teammate check: ${error.message}`);
    return { ok: false, serverError: error.message };
  }
  return { ok: !!data };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
): Promise<NextResponse> {
  const { ref } = await params;
  const context = { operation: 'v2_classeur_share_list', component: 'API_V2', ref };

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

  const { data: classeur, error: cErr } = await service
    .from('classeurs')
    .select('id, user_id')
    .eq('id', classeurId)
    .eq('is_in_trash', false)
    .maybeSingle();

  if (cErr || !classeur || classeur.user_id !== userId) {
    return NextResponse.json({ error: 'Classeur introuvable ou accès refusé' }, { status: 403 });
  }

  const { data: shares, error: sErr } = await service
    .from('classeur_shares')
    .select('id, permission_level, created_at, shared_with')
    .eq('classeur_id', classeurId)
    .eq('shared_by', userId);

  if (sErr) {
    logApi.info(`[v2_classeur_share] GET list ${sErr.message}`, context);
    return NextResponse.json({ error: 'Erreur lecture partages' }, { status: 500 });
  }

  const ids = [...new Set((shares ?? []).map((x: { shared_with: string }) => x.shared_with))];
  const userMap = new Map<string, UserRow>();
  if (ids.length) {
    const { data: users } = await service
      .from('users')
      .select('id, email, username, name, surname, profile_picture')
      .in('id', ids);
    for (const u of users ?? []) {
      userMap.set((u as UserRow).id, u as UserRow);
    }
  }

  const items = (shares ?? []).map(
    (s: {
      id: string;
      permission_level: string;
      created_at: string;
      shared_with: string;
    }) => {
      const u = userMap.get(s.shared_with);
      return {
        shareId: s.id,
        sharedWith: s.shared_with,
        name: u ? displayName(u) : 'Utilisateur',
        email: u?.email ?? '',
        permissionLevel: s.permission_level,
        createdAt: s.created_at,
      };
    },
  );

  return NextResponse.json({ success: true, items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
): Promise<NextResponse> {
  const { ref } = await params;
  const context = { operation: 'v2_classeur_share_post', component: 'API_V2', ref };

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
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }
  const { teammate_id: teammateId, permission_level: permissionLevel } = parsed.data;

  if (teammateId === userId) {
    return NextResponse.json({ error: 'Cible invalide' }, { status: 400 });
  }

  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json({ error: resolveResult.error }, { status: resolveResult.status });
  }
  const classeurId = resolveResult.id;

  const { data: classeur, error: cErr } = await service
    .from('classeurs')
    .select('id, user_id')
    .eq('id', classeurId)
    .eq('is_in_trash', false)
    .maybeSingle();

  if (cErr || !classeur || classeur.user_id !== userId) {
    return NextResponse.json({ error: 'Classeur introuvable ou accès refusé' }, { status: 403 });
  }

  const { ok: okTeammate, serverError: teammateErr } = await assertAcceptedTeammate(
    service,
    userId,
    teammateId,
  );
  if (teammateErr) {
    return NextResponse.json({ error: 'Erreur serveur lors de la vérification' }, { status: 500 });
  }
  if (!okTeammate) {
    return NextResponse.json(
      { error: 'Partage réservé aux coéquipiers acceptés' },
      { status: 403 },
    );
  }

  const { data: inserted, error: insErr } = await service
    .from('classeur_shares')
    .insert({
      classeur_id: classeurId,
      shared_by: userId,
      shared_with: teammateId,
      permission_level: permissionLevel,
    })
    .select('id, permission_level, created_at, shared_with')
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      return NextResponse.json({ error: 'Déjà partagé avec ce coéquipier' }, { status: 409 });
    }
    logApi.info(`[v2_classeur_share] POST ${insErr.message}`, context);
    return NextResponse.json({ error: 'Création du partage impossible' }, { status: 500 });
  }

  return NextResponse.json({ success: true, share: inserted });
}
