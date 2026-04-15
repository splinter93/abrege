import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { logApi } from '@/utils/logger';
import {
  getAuthenticatedUser,
  createAuthenticatedSupabaseClient,
  extractTokenFromRequest,
} from '@/utils/authUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYNESIA_KEY = 'synesia_api_key';

/** Client service role : lecture/écriture `users` filtrée par userId (JWT déjà validé). */
function createMeServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeSettingsForResponse(settings: unknown): {
  settings: Record<string, unknown> | null;
  synesia_api_key_configured: boolean;
} {
  if (!isRecord(settings)) {
    return { settings: null, synesia_api_key_configured: false };
  }
  const raw = settings[SYNESIA_KEY];
  const synesia_api_key_configured =
    typeof raw === 'string' && raw.trim().length > 0;
  const copy = { ...settings };
  delete copy[SYNESIA_KEY];
  return { settings: copy, synesia_api_key_configured };
}

const meUpdateSchema = z.object({
  name: z.string().max(200).nullable().optional(),
  surname: z.string().max(200).nullable().optional(),
  display_name: z.string().max(200).nullable().optional(),
  profile_picture: z
    .union([
      z.string().url().max(2048),
      z.literal(''),
      z.null(),
    ])
    .optional(),
  /** Absent = ne pas modifier. Chaîne non vide = enregistrer. "" ou null = supprimer. */
  synesia_api_key: z.union([z.string().max(2048), z.literal(''), z.null()]).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_me_profile',
    component: 'API_V2',
    clientType,
  };

  logApi.info('🚀 Début récupération profil utilisateur v2', context);

  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userId = authResult.userId!;
  const userToken = extractTokenFromRequest(request);
  if (!userToken && (authResult.authType === 'jwt' || authResult.authType === 'oauth')) {
    return NextResponse.json(
      { error: 'Token manquant' },
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const service = createMeServiceClient();
    const supabase =
      service ??
      createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    if (!service) {
      logApi.info(
        '[v2_me] GET: SUPABASE_SERVICE_ROLE_KEY absente — fallback client JWT (RLS peut bloquer)',
        context,
      );
    }

    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('id, email, username, name, surname, display_name, profile_picture, bio, timezone, language, settings, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération profil: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du profil utilisateur', detail: fetchError.message },
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!userProfile) {
      const admin = createMeServiceClient();
      if (admin) {
        const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
        if (!authErr && authData.user) {
          const u = authData.user;
          const meta = (u.user_metadata || {}) as Record<string, unknown>;
          const apiTime = Date.now() - startTime;
          logApi.info(
            `[v2_me] Profil public.users absent — fallback auth.admin (${apiTime}ms)`,
            context,
          );
          return NextResponse.json({
            success: true,
            data: {
              id: u.id,
              email: u.email ?? '',
              username: typeof meta.username === 'string' ? meta.username : null,
              name: typeof meta.name === 'string' ? meta.name : null,
              surname: typeof meta.surname === 'string' ? meta.surname : null,
              display_name: typeof meta.full_name === 'string' ? meta.full_name : null,
              profile_picture:
                typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
              bio: null,
              timezone: 'UTC',
              language: 'fr',
              settings: null,
              synesia_api_key_configured: false,
              created_at: u.created_at,
            },
          });
        }
      }
      logApi.info('❌ Profil utilisateur non trouvé (users + auth)', context);
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { settings, synesia_api_key_configured } = sanitizeSettingsForResponse(
      userProfile.settings,
    );

    let resolvedProfilePicture =
      typeof userProfile.profile_picture === 'string'
        ? userProfile.profile_picture.trim()
        : '';
    if (!resolvedProfilePicture && service) {
      const { data: authRow, error: authMetaErr } = await service.auth.admin.getUserById(userId);
      if (!authMetaErr && authRow?.user) {
        const meta = (authRow.user.user_metadata || {}) as Record<string, unknown>;
        const fromMeta =
          typeof meta.avatar_url === 'string' ? meta.avatar_url.trim() : '';
        if (fromMeta) resolvedProfilePicture = fromMeta;
      }
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Profil utilisateur récupéré en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      data: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username,
        name: userProfile.name,
        surname: userProfile.surname,
        display_name: userProfile.display_name,
        profile_picture: resolvedProfilePicture || null,
        bio: userProfile.bio,
        timezone: userProfile.timezone,
        language: userProfile.language,
        settings,
        synesia_api_key_configured,
        created_at: userProfile.created_at,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error.message}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/** Aligne user_metadata (avatar, nom affiché) avec la ligne `public.users` après mise à jour profil. */
async function syncAuthUserMetadataFromDb(userId: string): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return;

  const admin = createClient(url, serviceKey);
  const { data: row, error: rowErr } = await admin
    .from('users')
    .select('name, surname, display_name, profile_picture')
    .eq('id', userId)
    .maybeSingle();

  if (rowErr || !row) {
    logApi.info(`[v2_me] syncAuth: skip lecture users ${rowErr?.message}`);
    return;
  }

  const { data: existing, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !existing.user) {
    logApi.info(`[v2_me] syncAuth: skip getUser ${getErr?.message}`);
    return;
  }

  const meta = { ...(existing.user.user_metadata || {}) } as Record<string, unknown>;
  if (row.profile_picture) {
    meta.avatar_url = row.profile_picture;
  } else {
    delete meta.avatar_url;
  }
  const full =
    (row.display_name && String(row.display_name).trim()) ||
    [row.name, row.surname].filter(Boolean).join(' ').trim();
  if (full) {
    meta.full_name = full;
  }

  const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: meta,
  });
  if (upErr) {
    logApi.info(`[v2_me] syncAuth update: ${upErr.message}`);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return handleMeUpdate(request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return handleMeUpdate(request);
}

async function handleMeUpdate(request: NextRequest): Promise<NextResponse> {
  const context = { operation: 'v2_me_update', component: 'API_V2' };

  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success || !authResult.userId) {
    return NextResponse.json(
      { error: authResult.error || 'Non autorisé' },
      { status: authResult.status || 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userId = authResult.userId;
  const userToken = extractTokenFromRequest(request);
  if (!userToken && (authResult.authType === 'jwt' || authResult.authType === 'oauth')) {
    return NextResponse.json(
      { error: 'Token manquant' },
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Corps JSON invalide' },
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const parsed = meUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation échouée', details: parsed.error.flatten() },
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const payload = parsed.data;

  const hasField =
    payload.name !== undefined ||
    payload.surname !== undefined ||
    payload.display_name !== undefined ||
    payload.profile_picture !== undefined ||
    payload.synesia_api_key !== undefined;
  if (!hasField) {
    return NextResponse.json(
      { error: 'Aucun champ à mettre à jour' },
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const service = createMeServiceClient();
    const supabase =
      service ??
      createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    if (!service) {
      logApi.info(
        '[v2_me] PATCH: SUPABASE_SERVICE_ROLE_KEY absente — fallback client JWT (RLS peut bloquer)',
        context,
      );
    }

    const { data: current, error: curErr } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();

    if (curErr) {
      logApi.error('[v2_me] PATCH lecture settings', curErr);
      return NextResponse.json(
        { error: 'Impossible de lire le profil', detail: curErr.message },
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const baseSettings = isRecord(current?.settings) ? { ...current.settings } : {};

    if (payload.synesia_api_key !== undefined) {
      if (payload.synesia_api_key === null || payload.synesia_api_key === '') {
        delete baseSettings[SYNESIA_KEY];
      } else {
        baseSettings[SYNESIA_KEY] = payload.synesia_api_key.trim();
      }
    }

    const row: Record<string, unknown> = {};

    if (payload.name !== undefined) row.name = payload.name;
    if (payload.surname !== undefined) row.surname = payload.surname;
    if (payload.display_name !== undefined) row.display_name = payload.display_name;
    if (payload.profile_picture !== undefined) {
      row.profile_picture =
        payload.profile_picture === '' ? null : payload.profile_picture;
    }
    if (payload.synesia_api_key !== undefined) {
      row.settings = baseSettings;
    }

    const { error: upErr } = await supabase.from('users').update(row).eq('id', userId);

    if (upErr) {
      logApi.error('[v2_me] PATCH update users', upErr);
      return NextResponse.json(
        { error: upErr.message || 'Mise à jour impossible' },
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (payload.name !== undefined ||
        payload.surname !== undefined ||
        payload.display_name !== undefined ||
        payload.profile_picture !== undefined)
    ) {
      await syncAuthUserMetadataFromDb(userId);
    }

    logApi.info('✅ Profil mis à jour v2', context);

    const getResponse = await GET(request);
    return getResponse;
  } catch (err: unknown) {
    const e = err as Error;
    logApi.error('[v2_me] PATCH exception', e);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
