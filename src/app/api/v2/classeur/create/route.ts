import { NextRequest, NextResponse } from 'next/server';

import { logApi } from '@/utils/logger';
import { createClasseurV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { SlugGenerator } from '@/utils/slugGenerator';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_create',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début création classeur v2', context);

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
  
  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const userToken = extractTokenFromRequest(request);
  const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);
  
  // ✅ CORRECTION : Pour l'impersonation d'agent, créer l'utilisateur s'il n'existe pas
  if (authResult.authType === 'api_key') {
    // Utiliser le client Supabase avec service role pour contourner les restrictions RLS
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Remplacer le client par celui avec service role
    Object.assign(supabase, supabaseAdmin);
    
    // ✅ CORRECTION : Pour l'impersonation d'agent, utiliser un utilisateur système existant
    // ou créer directement dans la table sans contrainte de clé étrangère
    logApi.info(`[Classeur Create] 🤖 Impersonation d'agent - utilisation service role pour contourner RLS`);
    
    // Vérifier si l'utilisateur existe dans la table profiles
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (profileError && profileError.code === 'PGRST116') {
      // Créer le profil directement
      logApi.info(`[Classeur Create] 👤 Création profil pour agent: ${userId}`);
      
      const { error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: `agent-${userId}@scrivia.app`,
          full_name: 'Agent Harvey',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (createProfileError) {
        logApi.error(`[Classeur Create] ❌ Erreur création profil: ${createProfileError.message}`, context);
        // Continuer quand même, l'utilisateur pourrait exister dans auth.users
      } else {
        logApi.info(`[Classeur Create] ✅ Profil créé: ${userId}`);
      }
    }
    
    logApi.info(`[Classeur Create] 🔑 Utilisation client Supabase avec service role pour agent: ${userId}`);
  }

  try {
    const body = await request.json();
    
    // Validation du payload
    const validationResult = validatePayload(createClasseurV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult);
    }

    const { name, emoji, description } = validationResult.data;

    // ✅ FIX SLUG : Utiliser SlugGenerator pour garantir l'unicité du slug
    const slug = await SlugGenerator.generateSlug(name, 'classeur', userId, undefined, supabase);

    // Créer le classeur
    const { data: classeur, error: createError } = await supabase
      .from('classeurs')
      .insert({
        name,
        description,
        emoji: emoji || '📚',
        slug,
        user_id: userId,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      logApi.error(`❌ Erreur création classeur:`, {
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint,
        context
      });
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création du classeur',
          details: createError.message,
          code: createError.code
        },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur créé en ${apiTime}ms`, context);

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    return NextResponse.json({
      success: true,
      classeur
    }, { status: 201, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 