import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folders_list',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération liste dossiers v2', context);

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
  
  // Récupérer les paramètres de filtrage
  const { searchParams } = new URL(request.url);
  const classeurId = searchParams.get('classeur_id');
  const parentId = searchParams.get('parent_id');

  // Créer un client Supabase standard (l'authentification est déjà validée)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    let query = supabase
      .from('folders')
      .select('id, name, slug, parent_id, classeur_id, position, created_at, updated_at')
      .eq('user_id', userId);

    // Appliquer les filtres
    if (classeurId) {
      query = query.eq('classeur_id', classeurId);
    }
    if (parentId !== null) {
      if (parentId === 'null') {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
    }

    const { data: folders, error: fetchError } = await query
      .order('position', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      logApi.info(`❌ Erreur récupération dossiers: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${folders?.length || 0} dossiers récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folders: folders || []
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
    operation: 'v2_folders_create',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début création dossier v2', context);

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
    const { name, classeur_id, parent_id, position } = body;

    // Validation des champs requis
    if (!name || !classeur_id) {
      logApi.info('❌ Nom et classeur requis', context);
      return NextResponse.json(
        { error: 'Le nom et le classeur sont requis' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Générer un slug à partir du nom
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Préparer les données du dossier
    const folderData = {
      name,
      slug,
      classeur_id,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Ajouter les champs optionnels s'ils sont fournis
    if (parent_id !== undefined) folderData.parent_id = parent_id;
    if (position !== undefined) folderData.position = position;

    // Insérer le dossier dans la base de données
    const { data: newFolder, error: insertError } = await supabase
      .from('folders')
      .insert(folderData)
      .select()
      .single();

    if (insertError) {
      logApi.info(`❌ Erreur création dossier: ${insertError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la création du dossier' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier créé avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      folder: newFolder
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