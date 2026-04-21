import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SearchResult {
  type: 'note' | 'folder' | 'classeur';
  id: string;
  title: string;
  slug?: string;
  classeur_id?: string;
  score: number;
  excerpt?: string;
  updated_at: string;
}

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
    
    const results: SearchResult[] = [];
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

      const { data: notes, error: notesError } = await notesQuery.limit(limit * 2); // Récupérer plus pour filtrer

      if (!notesError && notes) {
        notes.forEach(note => {
          const title = note.source_title || 'Sans titre';
          const titleLower = title.toLowerCase();
          const queryLower = searchQuery?.toLowerCase() || '';
          
          // ✅ FIX: Vérifier si le match est dans le titre (priorité absolue)
          const matchInTitle = queryLower && titleLower.includes(queryLower);
          
          // ✅ FIX: Si le match n'est PAS dans le titre, score très bas (sera filtré)
          // On garde quand même ces résultats mais avec un score très faible
          const score = searchQuery 
            ? calculateScoreFromTitle(searchQuery, title)
            : 1.0;
          
          // ✅ FIX: Si match seulement dans contenu (pas dans titre), diviser le score par 10
          const finalScore = matchInTitle ? score : score / 10;
          
          results.push({
            type: 'note',
            id: note.id,
            title: title,
            slug: note.slug,
            classeur_id: note.classeur_id,
            score: finalScore,
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

      const { data: folders, error: foldersError } = await foldersQuery.limit(limit * 2); // Récupérer plus pour filtrer

      if (!foldersError && folders) {
        folders.forEach(folder => {
          const name = folder.name || 'Sans nom';
          const nameLower = name.toLowerCase();
          const queryLower = searchQuery?.toLowerCase() || '';
          
          // ✅ FIX: Vérifier si le match est dans le nom (priorité absolue)
          const matchInName = queryLower && nameLower.includes(queryLower);
          
          const score = searchQuery 
            ? calculateScoreFromTitle(searchQuery, name)
            : 1.0;
          
          // ✅ FIX: Si match seulement ailleurs, diviser le score par 10
          const finalScore = matchInName ? score : score / 10;
          
          results.push({
            type: 'folder',
            id: folder.id,
            title: name,
            slug: folder.slug,
            classeur_id: folder.classeur_id,
            score: finalScore,
            excerpt: '', // Pas d'excerpt pour dossiers
            updated_at: folder.updated_at
          });
        });
        totalCount += folders.length;
      }
    }

    // ✅ OPTIMISATION : Trier seulement si recherche active
    if (searchQuery) {
      results.sort((a: SearchResult, b: SearchResult) => b.score - a.score);
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
 * ✅ AMÉLIORATION: Priorise fortement les matches dans le titre
 * Évite le fetch du markdown_content pour la performance
 */
function calculateScoreFromTitle(query: string, title: string): number {
  const queryLower = query.toLowerCase().trim();
  const titleLower = title.toLowerCase();
  
  // Si pas de query, score neutre
  if (!queryLower) {
    return 1.0;
  }
  
  let score = 0;
  
  // ✅ PRIORITÉ 1: Match exact du titre (insensible à la casse)
  if (titleLower === queryLower) {
    return 1000; // Score maximum pour match exact
  }
  
  // ✅ PRIORITÉ 2: Match au début du titre (très pertinent)
  if (titleLower.startsWith(queryLower)) {
    score += 500; // Score très élevé pour début de titre
  } 
  // ✅ PRIORITÉ 3: Match au début d'un mot dans le titre
  else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(titleLower)) {
    score += 400; // Score élevé pour début de mot
  }
  // ✅ PRIORITÉ 4: Match quelque part dans le titre
  else if (titleLower.includes(queryLower)) {
    score += 300; // Score bon pour présence dans titre
  }
  // Si pas de match dans le titre, score très bas (sera filtré si match dans contenu)
  else {
    return 1; // Score minimal si pas dans le titre
  }
  
  // ✅ BONUS: Match de mots complets (plus pertinent que partie de mot)
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const titleWords = titleLower.split(/\s+/);
  let completeWordMatches = 0;
  
  for (const queryWord of queryWords) {
    if (titleWords.some(titleWord => titleWord === queryWord || titleWord.startsWith(queryWord))) {
      completeWordMatches++;
    }
  }
  
  // Bonus pour match de mots complets
  if (completeWordMatches > 0) {
    score += completeWordMatches * 50;
  }
  
  // ✅ BONUS: Titre court (plus précis) - mais moins important que le match
  const titleLength = title.length;
  if (titleLength < 20) {
    score += 20;
  } else if (titleLength < 40) {
    score += 10;
  }
  
  // ✅ LÉGÈRE pénalité pour titre très long (mais pas trop pour ne pas pénaliser les bons matches)
  if (titleLength > 60) {
    score -= 10;
  }
  
  // ✅ BONUS: Si le query est un mot complet qui matche un mot complet du titre
  if (queryWords.length === 1 && titleWords.includes(queryWords[0])) {
    score += 100; // Bonus supplémentaire pour match de mot complet
  }
  
  return Math.max(score, 1);
}
