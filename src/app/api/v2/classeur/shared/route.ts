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

  type ShareRow = {
    id: string;
    permission_level: string;
    created_at: string;
    shared_by: string;
    shared_with: string;
    classeur_id: string;
  };

  // Partages reçus (shared_with = moi) ET envoyés (shared_by = moi) en parallèle.
  const [receivedRes, sentRes] = await Promise.all([
    service
      .from('classeur_shares')
      .select('id, permission_level, created_at, shared_by, shared_with, classeur_id')
      .eq('shared_with', userId),
    service
      .from('classeur_shares')
      .select('id, permission_level, created_at, shared_by, shared_with, classeur_id')
      .eq('shared_by', userId),
  ]);

  if (receivedRes.error) {
    logApi.info(`[v2_classeur_shared] GET received: ${receivedRes.error.message}`, context);
    return NextResponse.json({ error: 'Erreur lecture partages reçus' }, { status: 500 });
  }
  if (sentRes.error) {
    logApi.info(`[v2_classeur_shared] GET sent: ${sentRes.error.message}`, context);
    return NextResponse.json({ error: 'Erreur lecture partages envoyés' }, { status: 500 });
  }

  const rows = (receivedRes.data ?? []) as ShareRow[];
  const sentRows = (sentRes.data ?? []) as ShareRow[];

  // Classeurs concernés (reçus + envoyés)
  const allClasseurIds = [
    ...new Set([
      ...rows.map((r) => r.classeur_id),
      ...sentRows.map((r) => r.classeur_id),
    ]),
  ];
  const classeurMap = new Map<string, { id: string; name: string; emoji: string | null; slug: string | null }>();
  if (allClasseurIds.length) {
    const { data: cls, error: clsErr } = await service
      .from('classeurs')
      .select('id, name, emoji, slug')
      .in('id', allClasseurIds)
      .eq('is_in_trash', false);
    if (clsErr) {
      logApi.info(`[v2_classeur_shared] classeurs fetch: ${clsErr.message}`, context);
      return NextResponse.json({ error: 'Erreur lecture classeurs' }, { status: 500 });
    }
    for (const c of cls ?? []) {
      classeurMap.set((c as { id: string }).id, c as { id: string; name: string; emoji: string | null; slug: string | null });
    }
  }

  // Utilisateurs concernés (shared_by des reçus + shared_with des envoyés)
  const allUserIds = [
    ...new Set([
      ...rows.map((r) => r.shared_by),
      ...sentRows.map((r) => r.shared_with),
    ]),
  ];
  const userMap = new Map<string, UserRow>();
  if (allUserIds.length) {
    const { data: users, error: usersErr } = await service
      .from('users')
      .select('id, email, username, name, surname, profile_picture')
      .in('id', allUserIds);
    if (usersErr) {
      logApi.info(`[v2_classeur_shared] users fetch: ${usersErr.message}`, context);
      return NextResponse.json({ error: 'Erreur lecture utilisateurs' }, { status: 500 });
    }
    for (const u of users ?? []) {
      userMap.set((u as UserRow).id, u as UserRow);
    }
  }

  // Dédupliquer les reçus par classeur_id : permission la plus haute, puis la plus récente.
  const deduped = new Map<string, ShareRow>();
  for (const r of rows) {
    const existing = deduped.get(r.classeur_id);
    if (!existing) { deduped.set(r.classeur_id, r); continue; }
    const upgradesPermission = r.permission_level === 'write' && existing.permission_level !== 'write';
    const samePermissionButNewer = r.permission_level === existing.permission_level && r.created_at > existing.created_at;
    if (upgradesPermission || samePermissionButNewer) deduped.set(r.classeur_id, r);
  }

  const items = [...deduped.values()].map((r) => {
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
  });

  // Envoyés : regroupés par classeur_id, liste des destinataires par partage
  type SentGroup = {
    shareId: string;
    classeurId: string;
    name: string;
    emoji?: string;
    slug?: string;
    sharedAt: string;
    recipients: Array<{ userId: string; displayName: string; email: string; permissionLevel: string }>;
  };
  const sentByClasseur = new Map<string, SentGroup>();
  for (const r of sentRows) {
    const c = classeurMap.get(r.classeur_id);
    const recipient = userMap.get(r.shared_with);
    const existing = sentByClasseur.get(r.classeur_id);
    const recipientEntry = {
      userId: r.shared_with,
      displayName: recipient ? displayName(recipient) : 'Utilisateur',
      email: recipient?.email ?? '',
      permissionLevel: r.permission_level,
    };
    if (!existing) {
      sentByClasseur.set(r.classeur_id, {
        shareId: r.id,
        classeurId: r.classeur_id,
        name: c?.name ?? 'Classeur',
        emoji: c?.emoji ?? undefined,
        slug: c?.slug ?? undefined,
        sharedAt: r.created_at,
        recipients: [recipientEntry],
      });
    } else {
      existing.recipients.push(recipientEntry);
      if (r.created_at < existing.sharedAt) existing.sharedAt = r.created_at;
    }
  }

  const sentItems = [...sentByClasseur.values()];

  return NextResponse.json({ success: true, items, sentItems });
}
