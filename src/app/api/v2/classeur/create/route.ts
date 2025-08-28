import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { createClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_create',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début création classeur v2', context);

  // 🔐 Authentification simplifiée
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createClasseurV2Schema, body);
    if (!validationResult.success) {
      logApi.info('❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Générer un slug unique si non fourni
    let slug = validatedData.slug;
    if (!slug) {
      slug = await SlugGenerator.generateUniqueSlug(validatedData.title, 'classeurs', userId);
    }

    // Créer le classeur
    const { data: classeur, error: createError } = await supabase
      .from('classeurs')
      .insert({
        title: validatedData.title,
        description: validatedData.description,
        slug: slug,
        user_id: userId,
        color: validatedData.color || '#3B82F6',
        icon: validatedData.icon || '📚',
        is_public: validatedData.is_public || false,
        sort_order: validatedData.sort_order || 0
      })
      .select()
      .single();

    if (createError || !classeur) {
      logApi.error(`❌ Erreur création classeur: ${createError?.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la création du classeur' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur créé en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('classeurs', 'CREATE');
      logApi.info('✅ Polling déclenché pour classeurs', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', pollingError);
    }

    return NextResponse.json({
      success: true,
      message: 'Classeur créé avec succès',
      classeur: classeur
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