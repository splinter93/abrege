import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = { operation: 'v2_classeur_shared_list', component: 'API_V2' };
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

  const { data: rows, error } = await service
    .from('classeur_shares')
    .select('id, permission_level, created_at, shared_by, classeur_id')
    .eq('shared_with', userId);

  if (error) {
    logApi.info(`[v2_classeur_shared] GET ${error.message}`, context);
    return NextResponse.json({ error: 'Erreur lecture partages' }, { status: 500 });
  }

  const classeurIds = [...new Set((rows ?? []).map((r: { classeur_id: string }) => r.classeur_id))];
  const classeurMap = new Map<
    string,
    { id: string; name: string; emoji: string | null; slug: string | null }
  >();
  if (classeurIds.length) {
    const { data: cls, error: clsErr } = await service
      .from('classeurs')
      .select('id, name, emoji, slug')
      .in('id', classeurIds)
      .eq('is_in_trash', false);
    if (clsErr) {
      logApi.info(`[v2_classeur_shared] classeurs fetch: ${clsErr.message}`, context);
      return NextResponse.json({ error: 'Erreur lecture classeurs' }, { status: 500 });
    }
    for (const c of cls ?? []) {
      classeurMap.set((c as { id: string }).id, c as { id: string; name: string; emoji: string | null; slug: string | null });
    }
  }

  const byIds = [...new Set((rows ?? []).map((r: { shared_by: string }) => r.shared_by))];
  const userMap = new Map<string, UserRow>();
  if (byIds.length) {
    const { data: users, error: usersErr } = await service
      .from('users')
      .select('id, email, username, name, surname, profile_picture')
      .in('id', byIds);
    if (usersErr) {
      logApi.info(`[v2_classeur_shared] users fetch: ${usersErr.message}`, context);
      return NextResponse.json({ error: 'Erreur lecture utilisateurs' }, { status: 500 });
    }
    for (const u of users ?? []) {
      userMap.set((u as UserRow).id, u as UserRow);
    }
  }

  const items = (rows ?? []).map(
    (r: {
      id: string;
      permission_level: string;
      created_at: string;
      shared_by: string;
      classeur_id: string;
    }) => {
      const c = classeurMap.get(r.classeur_id);
      const owner = userMap.get(r.shared_by);
      return {
        shareId: r.id,
        classeurId: r.classeur_id,
        ref: c?.id ?? r.classeur_id,
        name: c?.name ?? 'Classeur',
        emoji: c?.emoji ?? undefined,
        slug: c?.slug ?? undefined,
        permissionLevel: r.permission_level,
        sharedBy: owner ? displayName(owner) : 'Coéquipier',
        sharedByEmail: owner?.email ?? '',
        sharedAt: r.created_at,
      };
    },
  );

  return NextResponse.json({ success: true, items });
}
