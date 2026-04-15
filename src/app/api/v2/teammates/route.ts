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

const inviteSchema = z.object({
  email: z.string().min(1).max(320),
});

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  profile_picture: string | null;
  created_at: string | null;
};

function displayName(u: Pick<UserRow, 'username' | 'email'>): string {
  if (u.username?.trim()) return u.username.trim();
  if (u.email?.trim()) return u.email.split('@')[0]!;
  return 'Utilisateur';
}

async function fetchUsersMap(
  service: ReturnType<typeof createServiceClient>,
  ids: string[],
): Promise<Map<string, UserRow>> {
  const map = new Map<string, UserRow>();
  if (!service || ids.length === 0) return map;
  const unique = [...new Set(ids)];
  const { data, error } = await service
    .from('users')
    .select('id, email, username, profile_picture, created_at')
    .in('id', unique);
  if (error) {
    logApi.info(`[v2_teammates] users select error: ${error.message}`);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id as string, row as UserRow);
  }
  return map;
}

async function findUserIdByEmail(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await service
    .from('users')
    .select('id')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();
  if (error) {
    logApi.info(`[v2_teammates] find by email: ${error.message}`);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

async function findUserIdByUsername(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  username: string,
): Promise<string | null> {
  const normalized = username.replace(/^@/, '').trim().toLowerCase();
  const { data, error } = await service
    .from('users')
    .select('id')
    .ilike('username', normalized)
    .limit(1)
    .maybeSingle();
  if (error) {
    logApi.info(`[v2_teammates] find by username: ${error.message}`);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = { operation: 'v2_teammates_get', component: 'API_V2' };
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
    .from('teammates')
    .select('id, user_id, teammate_id, status, requested_by, created_at')
    .or(`user_id.eq.${userId},teammate_id.eq.${userId}`);

  if (error) {
    logApi.info(`[v2_teammates] GET error: ${error.message}`, context);
    return NextResponse.json({ error: 'Erreur lecture teammates' }, { status: 500 });
  }

  const list = (rows ?? []) as Array<{
    id: string;
    user_id: string;
    teammate_id: string;
    status: string;
    requested_by: string;
    created_at: string;
  }>;

  const otherIds = list.map((r) => (r.user_id === userId ? r.teammate_id : r.user_id));
  const userMap = await fetchUsersMap(service, [...otherIds, userId]);

  const incoming: Array<{
    id: string;
    direction: 'incoming';
    name: string;
    email: string;
    avatar: string | null;
    sentAt: string;
  }> = [];
  const outgoing: Array<{
    id: string;
    direction: 'outgoing';
    name: string;
    email: string;
    avatar: string | null;
    sentAt: string;
  }> = [];
  const teammates: Array<{
    id: string;
    otherUserId: string;
    name: string;
    email: string;
    avatar: string | null;
    since: string;
  }> = [];

  for (const r of list) {
    const otherId = r.user_id === userId ? r.teammate_id : r.user_id;
    const u = userMap.get(otherId);
    const name = u ? displayName(u) : 'Utilisateur';
    const email = u?.email ?? '';
    const avatar = u?.profile_picture ?? null;

    if (r.status === 'pending') {
      if (r.teammate_id === userId && r.requested_by !== userId) {
        incoming.push({
          id: r.id,
          direction: 'incoming',
          name,
          email,
          avatar,
          sentAt: r.created_at,
        });
      } else if (r.user_id === userId && r.requested_by === userId) {
        outgoing.push({
          id: r.id,
          direction: 'outgoing',
          name,
          email,
          avatar,
          sentAt: r.created_at,
        });
      }
    } else if (r.status === 'accepted') {
      teammates.push({
        id: r.id,
        otherUserId: otherId,
        name,
        email,
        avatar,
        since: r.created_at,
      });
    }
  }

  return NextResponse.json({
    success: true,
    incoming,
    outgoing,
    teammates,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = { operation: 'v2_teammates_post', component: 'API_V2' };
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 },
    );
  }
  const inviterId = authResult.userId!;
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
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }
  const raw = parsed.data.email.trim();

  // Détecter si c'est un e-mail (contient @) ou un username
  const isEmail = raw.includes('@');
  let inviteeId: string | null;

  if (isEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return NextResponse.json({ error: 'Format d\'e-mail invalide' }, { status: 400 });
    }
    inviteeId = await findUserIdByEmail(service, raw);
  } else {
    inviteeId = await findUserIdByUsername(service, raw);
  }

  if (!inviteeId) {
    // Message générique : évite la confirmation d'existence d'un compte (user enumeration).
    return NextResponse.json(
      { error: 'Invitation impossible. Vérifiez l\'adresse e-mail ou le nom d\'utilisateur.' },
      { status: 404 },
    );
  }
  if (inviteeId === inviterId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous inviter vous-même' }, { status: 400 });
  }

  const { data: existing } = await service
    .from('teammates')
    .select('id, status')
    .or(
      `and(user_id.eq.${inviterId},teammate_id.eq.${inviteeId}),and(user_id.eq.${inviteeId},teammate_id.eq.${inviterId})`,
    );

  const blocked = (existing ?? []).some((x: { status: string }) => x.status === 'blocked');
  if (blocked) {
    return NextResponse.json({ error: 'Relation bloquée' }, { status: 403 });
  }

  const active = (existing ?? []).some((x: { status: string }) =>
    ['pending', 'accepted'].includes(x.status),
  );
  if (active) {
    return NextResponse.json({ error: 'Invitation ou relation déjà en cours' }, { status: 409 });
  }

  const { data: inserted, error: insErr } = await service
    .from('teammates')
    .insert({
      user_id: inviterId,
      teammate_id: inviteeId,
      status: 'pending',
      requested_by: inviterId,
    })
    .select('id, created_at')
    .single();

  if (insErr || !inserted) {
    logApi.info(`[v2_teammates] POST insert: ${insErr?.message}`, context);
    return NextResponse.json({ error: "Impossible d'envoyer l'invitation" }, { status: 500 });
  }

  const invitee = (await fetchUsersMap(service, [inviteeId])).get(inviteeId);

  return NextResponse.json({
    success: true,
    request: {
      id: inserted.id as string,
      direction: 'outgoing' as const,
      name: invitee ? displayName(invitee) : raw.split('@')[0] ?? raw,
      email: invitee?.email ?? (isEmail ? raw : ''),
      sentAt: inserted.created_at as string,
    },
  });
}
