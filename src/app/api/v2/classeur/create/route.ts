import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { createClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_create',
    component: 'API_V2',
    clientType
  };

  logApi('v2_classeur_create', '🚀 Début création classeur v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_classeur_create', `❌ Authentification échouée: ${authResult.error}`, context);
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
      logApi('v2_classeur_create', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Générer un slug unique
    const slug = await SlugGenerator.generateSlug(validatedData.name, 'classeur', userId);
    
    // Créer le classeur directement dans la base de données
    const { data: classeur, error: createError } = await supabase
      .from('classeurs')
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        emoji: validatedData.icon || '📁',
        position: 0,
        user_id: userId,
        slug
      })
      .select()
      .single();

    if (createError) {
      logApi('v2_classeur_create', `❌ Erreur création classeur: ${createError.message}`, context);
      return NextResponse.json(
        { error: `Erreur création classeur: ${createError.message}` },
        { status: 500 }
      );
    }

    const result = {
      success: true,
      classeur: classeur
    };

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_create', `✅ Classeur créé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeur créé avec succès',
      classeur: result.classeur
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_classeur_create', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 