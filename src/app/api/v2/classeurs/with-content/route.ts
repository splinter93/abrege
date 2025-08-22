import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { createSupabaseClient } from '@/utils/supabaseClient';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeurs_with_content',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début récupération classeurs avec contenu V2', context);

  // 🔐 Authentification V2
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  const supabase = createSupabaseClient();

  try {
    // 🚀 Étape 1: Récupérer tous les classeurs
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (classeursError) {
      logApi.error(`❌ Erreur récupération classeurs: ${classeursError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des classeurs' },
        { status: 500 }
      );
    }

    if (!classeurs || classeurs.length === 0) {
      const apiTime = Date.now() - startTime;
      logApi.info(`✅ Aucun classeur trouvé en ${apiTime}ms`, context);
      return NextResponse.json({
        success: true,
        classeurs: [],
        folders: [],
        notes: []
      });
    }

    // 🚀 Étape 2: Chargement parallèle de tout le contenu
    const contentPromises = classeurs.map(async (classeur) => {
      try {
        // Charger dossiers et notes en parallèle pour chaque classeur
        const [dossiersResult, notesResult] = await Promise.all([
          supabase
            .from('folders')
            .select('id, name, position, parent_id, created_at')
            .eq('classeur_id', classeur.id)
            .order('position', { ascending: true }),
          supabase
            .from('articles')
            .select('id, source_title, folder_id, created_at, updated_at, slug')
            .eq('classeur_id', classeur.id)
            .order('created_at', { ascending: false })
        ]);

        return {
          ...classeur,
          dossiers: dossiersResult.data || [],
          notes: notesResult.data || []
        };
      } catch (error) {
        logApi.warn(`⚠️ Erreur chargement classeur ${classeur.id}:`, error);
        return {
          ...classeur,
          dossiers: [],
          notes: []
        };
      }
    });

    const classeursWithContent = await Promise.all(contentPromises);

    // 🚀 Étape 3: Extraire tous les dossiers et notes
    const allFolders = classeursWithContent.flatMap(c => 
      c.dossiers.map(d => ({
        id: d.id,
        name: d.name,
        position: d.position,
        parent_id: d.parent_id,
        classeur_id: c.id,
        created_at: d.created_at
      }))
    );

    const allNotes = classeursWithContent.flatMap(c => 
      c.notes.map(n => ({
        id: n.id,
        source_title: n.source_title,
        folder_id: n.folder_id,
        classeur_id: c.id,
        created_at: n.created_at,
        updated_at: n.updated_at,
        slug: n.slug
      }))
    );

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${classeurs.length} classeurs, ${allFolders.length} dossiers, ${allNotes.length} notes récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeurs: classeursWithContent.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        emoji: c.emoji,
        position: c.position,
        slug: c.slug,
        created_at: c.created_at,
        updated_at: c.updated_at
      })),
      folders: allFolders,
      notes: allNotes
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 