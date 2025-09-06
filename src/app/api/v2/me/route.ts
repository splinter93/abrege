import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_me_profile',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération profil utilisateur v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  
  // Créer un client Supabase standard (l'authentification est déjà validée)
  const supabase = createAuthenticatedSupabaseClient(authResult);

  try {
    // Récupérer le profil utilisateur depuis auth.users avec les colonnes de profil
    const { data: userProfile, error: fetchError } = await supabase
      .from('auth.users')
      .select('id, email, name, surname, display_name, profile_picture, bio, timezone, language, settings, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération profil: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du profil utilisateur' },
        { status: 500 }
      );
    }

    if (!userProfile) {
      logApi.info('❌ Profil utilisateur non trouvé', context);
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Profil utilisateur récupéré en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      data: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        surname: userProfile.surname,
        display_name: userProfile.display_name,
        profile_picture: userProfile.profile_picture,
        bio: userProfile.bio,
        timezone: userProfile.timezone,
        language: userProfile.language,
        settings: userProfile.settings,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
