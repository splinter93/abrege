import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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
  const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);
    
    const results: unknown[] = [];
    let totalCount = 0;

    // Recherche dans les notes
    if (type === 'notes' || type === 'all') {
      let notesQuery = supabase
        .from('articles')
        .select('id, source_title, slug, classeur_id, created_at, updated_at')
        .eq('user_id', userId)
        .is('trashed_at', null); // ✅ Exclure notes supprimées

      // ✅ OPTIMISATION : Ne chercher que si query fournie
      if (searchQuery) {
        notesQuery = notesQuery.or(`source_title.ilike.%${searchQuery}%,markdown_content.ilike.%${searchQuery}%`);
      } else {
        // Si pas de query, trier par date de mise à jour
        notesQuery = notesQuery.order('updated_at', { ascending: false });
      }

      if (classeurId) {
        notesQuery = notesQuery.eq('classeur_id', classeurId);
      }

      const { data: notes, error: notesError } = await notesQuery.limit(limit);

      if (!notesError && notes) {
        notes.forEach(note => {
          results.push({
            type: 'note',
            id: note.id,
            title: note.source_title || 'Sans titre',
            slug: note.slug,
            classeur_id: note.classeur_id,
            // ✅ Score basé sur titre uniquement (pas de fetch markdown_content)
            score: searchQuery ? calculateScoreFromTitle(searchQuery, note.source_title || '') : 1.0,
            excerpt: '', // Pas d'excerpt pour économiser de la bande passante
            updated_at: note.updated_at
          });
        });
        totalCount += notes.length;
      }
    }

    // Recherche dans les dossiers
    if (type === 'folders' || type === 'all') {
      let foldersQuery = supabase
        .from('folders')
        .select('id, name, slug, classeur_id, created_at, updated_at')
        .eq('user_id', userId)
        .is('trashed_at', null); // ✅ Exclure dossiers supprimés

      // ✅ OPTIMISATION : Ne chercher que si query fournie
      if (searchQuery) {
        foldersQuery = foldersQuery.ilike('name', `%${searchQuery}%`);
      } else {
        // Si pas de query, trier par date de mise à jour
        foldersQuery = foldersQuery.order('updated_at', { ascending: false });
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
            title: folder.name || 'Sans nom',
            slug: folder.slug,
            classeur_id: folder.classeur_id,
            score: searchQuery ? calculateScoreFromTitle(searchQuery, folder.name || '') : 1.0,
            excerpt: '', // Pas d'excerpt pour dossiers
            updated_at: folder.updated_at
          });
        });
        totalCount += folders.length;
      }
    }

    // ✅ OPTIMISATION : Trier seulement si recherche active
    if (searchQuery) {
      results.sort((a: any, b: any) => b.score - a.score);
    }

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

/**
 * Calcul optimisé du score de pertinence (titre uniquement)
 * Évite le fetch du markdown_content pour la performance
 */
function calculateScoreFromTitle(query: string, title: string): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  
  let score = 0;
  
  // Match exact (insensible à la casse)
  if (titleLower === queryLower) {
    return 200;
  }
  
  // Match au début du titre (très pertinent)
  if (titleLower.startsWith(queryLower)) {
    score += 150;
  } else if (titleLower.includes(queryLower)) {
    // Match quelque part dans le titre
    score += 100;
  }
  
  // Bonus pour titre court (plus précis)
  score += Math.max(0, 50 - title.length);
  
  // Pénalité si beaucoup de mots (titre trop long = moins pertinent)
  const wordCount = title.split(/\s+/).length;
  score -= Math.min(wordCount * 2, 30);
  
  return Math.max(score, 1);
}
