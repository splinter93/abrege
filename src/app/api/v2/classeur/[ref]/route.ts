import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Construire la requête - le ref peut être un ID UUID ou un slug
    let query = supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_update',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début modification classeur v2', context);

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
    // Récupérer le corps de la requête
    const body = await request.json();
    const { name, description, emoji, color } = body;

    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Vérifier que le classeur existe et appartient à l'utilisateur
    let query = supabase
      .from('classeurs')
      .select('id')
      .eq('user_id', userId);

    const { data: existingClasseur, error: fetchError } = await query
      .or(`id.eq.${classeurRef},slug.eq.${classeurRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Classeur non trouvé: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updateData.name = name;
      // Générer un nouveau slug si le nom change
      updateData.slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
    if (description !== undefined) updateData.description = description;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (color !== undefined) updateData.color = color;

    // Mettre à jour le classeur
    const { data: updatedClasseur, error: updateError } = await supabase
      .from('classeurs')
      .update(updateData)
      .eq('id', existingClasseur.id)
      .select()
      .single();

    if (updateError) {
      logApi.info(`❌ Erreur mise à jour classeur: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du classeur' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur modifié avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeur: updatedClasseur
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ref: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_delete',
    component: 'API_V2',
    clientType,
    ref: params.ref
  };

  logApi.info('🚀 Début suppression classeur v2', context);

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
    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Vérifier que le classeur existe et appartient à l'utilisateur
    let query = supabase
      .from('classeurs')
      .select('id')
      .eq('user_id', userId);

    const { data: existingClasseur, error: fetchError } = await query
      .or(`id.eq.${classeurRef},slug.eq.${classeurRef}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Classeur non trouvé: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer le classeur
    const { error: deleteError } = await supabase
      .from('classeurs')
      .delete()
      .eq('id', existingClasseur.id);

    if (deleteError) {
      logApi.info(`❌ Erreur suppression classeur: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du classeur' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Classeur supprimé avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeur supprimé avec succès'
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
