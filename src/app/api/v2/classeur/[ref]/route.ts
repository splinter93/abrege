import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_get',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début récupération classeur v2', context);

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
  const classeurRef = params.ref;

  try {
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Construire la requête - le ref peut être un ID UUID ou un slug
    let query = supabase
      .from('classeurs')
      .select('id, name, description, slug, created_at, updated_at')
      .eq('user_id', userId);

    // Essayer d'abord comme UUID, puis comme slug
    const { data: classeur, error: fetchError } = await query
      .or(`id.eq.${classeurRef},slug.eq.${classeurRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération classeur: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur récupéré avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeur
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




