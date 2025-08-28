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
    operation: 'v2_notes_list',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération liste notes v2', context);

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
  
  // Récupérer tous les paramètres de filtrage et pagination
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('id');
  const classeurId = searchParams.get('classeur_id');
  const folderId = searchParams.get('folder_id');
  const isPublished = searchParams.get('is_published');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Validation des paramètres de pagination
  if (limit < 1 || limit > 100) {
    logApi.info('❌ Limite invalide', context);
    return NextResponse.json(
      { error: 'La limite doit être entre 1 et 100' },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (offset < 0) {
    logApi.info('❌ Offset invalide', context);
    return NextResponse.json(
      { error: 'L\'offset doit être positif ou nul' },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Créer un client Supabase standard (l'authentification est déjà validée)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Construire la requête de base
    let query = supabase
      .from('articles')
      .select('id, source_title, slug, folder_id, classeur_id, created_at, updated_at, markdown_content')
      .eq('user_id', userId);

    // Appliquer les filtres
    if (noteId) {
      query = query.eq('id', noteId);
    }
    if (classeurId) {
      query = query.eq('classeur_id', classeurId);
    }
    if (folderId) {
      query = query.eq('folder_id', folderId);
    }
    // Note: is_published n'existe pas dans la table articles

    // TEMPORAIRE: Récupérer les données sans comptage pour identifier le problème
    const { data: notes, error: fetchError } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      logApi.info(`❌ Erreur récupération notes: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${notes?.length || 0} notes récupérées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      notes: notes || [],
      total: notes?.length || 0, // TEMPORAIRE: utiliser la longueur au lieu du comptage
      limit,
      offset,
      has_more: false // TEMPORAIRE: désactiver la pagination
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
    operation: 'v2_notes_create',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début création note v2', context);

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
    const { source_title, markdown_content, folder_id, classeur_id, is_published = false } = body;

    // Validation des champs requis
    if (!source_title || !markdown_content) {
      logApi.info('❌ Champs requis manquants', context);
      return NextResponse.json(
        { error: 'Le titre et le contenu sont requis' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Créer un client Supabase avec service role pour contourner RLS
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      logApi.info('❌ SUPABASE_SERVICE_ROLE_KEY manquante', context);
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Préparer les données de la note
    const noteData: any = {
      source_title,
      markdown_content,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Ajouter les champs optionnels s'ils sont fournis
    if (folder_id) {
      noteData.folder_id = folder_id;
    }
    if (classeur_id) {
      noteData.classeur_id = classeur_id;
    }

    // Insérer la note dans la base de données
    console.log('🔍 Données à insérer:', JSON.stringify(noteData, null, 2));
    
    const { data: newNote, error: insertError } = await supabase
      .from('articles')
      .insert(noteData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Erreur Supabase détaillée:', insertError);
      logApi.info(`❌ Erreur création note: ${insertError.message}`, context);
      return NextResponse.json(
        { error: `Erreur lors de la création de la note: ${insertError.message}` },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note créée avec succès en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note: newNote
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