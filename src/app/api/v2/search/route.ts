import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_search_content',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début recherche v2', context);

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
  
  // Récupérer les paramètres de recherche
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const classeurId = searchParams.get('classeur_id');
  const type = searchParams.get('type') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');

  // ✅ CORRECTION : Rendre le paramètre query facultatif
  // Si pas de query, on retourne tous les résultats (recherche globale)
  const searchQuery = query && query.trim().length > 0 ? query.trim() : null;
  
  if (searchQuery === null) {
    logApi.info('🔍 Recherche globale (sans terme spécifique)', context);
  }

  if (limit < 1 || limit > 100) {
    logApi.info('❌ Limite invalide', context);
    return NextResponse.json(
      { error: 'La limite doit être entre 1 et 100' },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);
    
    const results: any[] = [];
    let totalCount = 0;

    // Recherche dans les notes
    if (type === 'notes' || type === 'all') {
      let notesQuery = supabase
        .from('articles')
        .select('id, source_title, slug, classeur_id, markdown_content')
        .eq('user_id', userId);

      // ✅ CORRECTION : Appliquer le filtre de recherche seulement si searchQuery existe
      if (searchQuery) {
        notesQuery = notesQuery.or(`source_title.ilike.%${searchQuery}%,markdown_content.ilike.%${searchQuery}%`);
      }

      if (classeurId) {
        notesQuery = notesQuery.eq('classeur_id', classeurId);
      }

      const { data: notes, error: notesError } = await notesQuery.limit(limit);

      if (!notesError && notes) {
        notes.forEach(note => {
          // Créer un extrait du contenu
          const content = note.markdown_content || '';
          const excerpt = content.length > 200 
            ? content.substring(0, 200) + '...' 
            : content;

          results.push({
            type: 'note',
            id: note.id,
            title: note.source_title,
            slug: note.slug,
            classeur_id: note.classeur_id,
            score: searchQuery ? calculateScore(searchQuery, note.source_title, content) : 1.0,
            excerpt: excerpt.replace(/[#*`]/g, '') // Nettoyer le markdown
          });
        });
        totalCount += notes.length;
      }
    }

    // Recherche dans les dossiers
    if (type === 'folders' || type === 'all') {
      let foldersQuery = supabase
        .from('folders')
        .select('id, name, slug, classeur_id')
        .eq('user_id', userId);

      // ✅ CORRECTION : Appliquer le filtre de recherche seulement si searchQuery existe
      if (searchQuery) {
        foldersQuery = foldersQuery.ilike('name', `%${searchQuery}%`);
      }

      if (classeurId) {
        foldersQuery = foldersQuery.eq('classeur_id', classeurId);
      }

      const { data: folders, error: foldersError } = await foldersQuery.limit(limit);

      if (!foldersError && folders) {
        folders.forEach(folder => {
          results.push({
            type: 'folder',
            id: folder.id,
            title: folder.name,
            slug: folder.slug,
            classeur_id: folder.classeur_id,
            score: searchQuery ? calculateScore(searchQuery, folder.name, '') : 1.0,
            excerpt: `Dossier: ${folder.name}`
          });
        });
        totalCount += folders.length;
      }
    }

    // Trier par score de pertinence
    results.sort((a, b) => b.score - a.score);

    // Limiter le nombre de résultats
    const limitedResults = results.slice(0, limit);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Recherche terminée en ${apiTime}ms - ${limitedResults.length} résultats`, context);

    return NextResponse.json({
      success: true,
      query: searchQuery || '',
      results: limitedResults,
      total: totalCount
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

// Fonction de calcul du score de pertinence
function calculateScore(query: string, title: string, content: string): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  let score = 0;
  
  // Score pour le titre (plus important)
  if (titleLower.includes(queryLower)) {
    score += 100;
    // Bonus si c'est au début du titre
    if (titleLower.startsWith(queryLower)) {
      score += 50;
    }
  }
  
  // Score pour le contenu
  if (contentLower.includes(queryLower)) {
    score += 10;
    // Compter les occurrences
    const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += Math.min(occurrences * 5, 50);
  }
  
  // Bonus pour la longueur du titre (titre plus court = plus pertinent)
  score += Math.max(0, 50 - title.length);
  
  return score;
}
