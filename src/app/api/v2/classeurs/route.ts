import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeurs_list',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération liste classeurs v2', context);

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
  const userToken = extractTokenFromRequest(request);
  
  try {
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // Récupérer tous les classeurs de l'utilisateur (exclure ceux en corbeille)
    const { data: classeurs, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_in_trash', false) // 🔧 CORRECTION: Exclure les classeurs en corbeille
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (fetchError) {
      logApi.info(`❌ Erreur récupération classeurs: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des classeurs' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${classeurs?.length || 0} classeurs récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeurs: classeurs || []
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeurs_create',
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

  try {
    // Récupérer le corps de la requête
    const body = await request.json();
    const { name, description, emoji, color } = body;

    // Validation des champs requis
    if (!name) {
      logApi.info('❌ Nom du classeur requis', context);
      return NextResponse.json(
        { error: 'Le nom du classeur est requis' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // Générer un slug à partir du nom
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Préparer les données du classeur
    const classeurData: any = {
      name,
      slug,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Ajouter les champs optionnels s'ils sont fournis
    if (description) classeurData.description = description;
    if (emoji) classeurData.emoji = emoji;
    if (color) classeurData.color = color;

    // Insérer le classeur dans la base de données
    const { data: newClasseur, error: insertError } = await supabase
      .from('classeurs')
      .insert(classeurData)
      .select()
      .single();

    if (insertError) {
      logApi.info(`❌ Erreur création classeur: ${insertError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la création du classeur' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur créé avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeur: newClasseur
    }, { status: 201 });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 