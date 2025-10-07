/**
 * 🔍 GET /api/v2/files/search
 * 
 * Recherche et liste les fichiers avec critères essentiels
 * 
 * - Sans filtres : Liste complète
 * - Avec filtres : Recherche ciblée par mot-clé, type, date, taille
 * 
 * Critères utiles : q (mot-clé), type (pdf/image/csv), created_at (range), size (min/max)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// 🔒 Schéma de validation des paramètres de requête
const searchFilesQuerySchema = z.object({
  // 📊 Pagination
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  
  // 🔍 Critères de recherche essentiels
  q: z.string().optional(), // Mot-clé (filename + description)
  type: z.string().optional(), // Type interne (pdf, image, csv) OU MIME type
  
  // 📅 Filtres temporels
  created_from: z.string().optional(), // Date de début (ISO string)
  created_to: z.string().optional(), // Date de fin (ISO string)
  
  // 📏 Filtres de taille (option avancée)
  min_size: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  max_size: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  
  // 🔄 Tri
  sort_by: z.enum(['filename', 'size', 'created_at']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc')
});

// 📋 Type de réponse
interface FileSearchResult {
  id: string; // UUID pour les opérations (delete, etc.)
  filename: string;
  type: string;
  size: number;
  url: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SearchFilesResponse {
  success: boolean;
  files: FileSearchResult[];
  total: number;
  metadata: {
    limit: number;
    offset: number;
    has_more: boolean;
    filters_applied: string[];
    search_query?: string;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const context = {
    operation: 'v2_files_search',
    component: 'API_V2',
    clientType: 'v2_unified_api'
  };

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success || !authResult.userId) {
      logApi.info('❌ Authentification échouée', context);
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId;
  const userToken = extractTokenFromRequest(request);
    const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

    // 🔍 Validation des paramètres de requête
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = searchFilesQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      logApi.info(`❌ Paramètres invalides: ${validationResult.error.message}`, context);
      return NextResponse.json(
        { error: 'Paramètres de requête invalides', details: validationResult.error.message },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      limit, offset, q, type, created_from, created_to,
      min_size, max_size, sort_by, sort_order
    } = validationResult.data;

    // 🚀 Construction de la requête Supabase
    let query = supabase
      .from('files')
      .select(`
        id,
        filename,
        mime_type,
        size,
        url,
        slug,
        description,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false); // Exclure les fichiers supprimés

    // 🔍 Critères de recherche essentiels
    if (q) {
      // Recherche textuelle dans filename ET description
      query = query.or(`filename.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // 🔍 Filtre par type (interne OU MIME)
    if (type) {
      // Supporte les types internes (pdf, image, csv) ET MIME types
      query = query.or(`mime_type.ilike.%${type}%,filename.ilike.%.${type}%`);
    }

    // 📅 Filtres temporels
    if (created_from) {
      query = query.gte('created_at', created_from);
    }

    if (created_to) {
      query = query.lte('created_at', created_to);
    }

    // 📏 Filtres de taille (option avancée)
    if (min_size !== undefined) {
      query = query.gte('size', min_size);
    }

    if (max_size !== undefined) {
      query = query.lte('size', max_size);
    }

    // 🔄 Tri
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // 📊 Pagination
    query = query.range(offset, offset + limit - 1);

    // 🔍 Exécution de la requête
    const { data: files, error, count } = await query;

    if (error) {
      logApi.info(`❌ Erreur Supabase: ${error.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche des fichiers', details: error.message },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔧 Formatage des données selon l'OpenAPI
    const formattedFiles: FileSearchResult[] = (files || []).map(file => ({
      id: file.id, // UUID nécessaire pour les opérations (delete, etc.)
      filename: file.filename,
      type: file.mime_type || 'unknown',
      size: file.size || 0,
      url: file.url,
      slug: file.slug || file.id, // Fallback sur l'ID si pas de slug
      description: file.description,
      created_at: file.created_at,
      updated_at: file.updated_at
    }));

    // 📊 Calcul des métadonnées
    const hasMore = (files?.length || 0) === limit;
    const total = count || formattedFiles.length;

    // 📋 Filtres appliqués pour le debug
    const filtersApplied = Object.entries(queryParams)
      .filter(([key, value]) => value && key !== 'limit' && key !== 'offset')
      .map(([key, value]) => `${key}=${value}`);

    const response: SearchFilesResponse = {
      success: true,
      files: formattedFiles,
      total,
      metadata: {
        limit,
        offset,
        has_more: hasMore,
        filters_applied: filtersApplied,
        search_query: q || undefined
      }
    };

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ ${formattedFiles.length} fichiers trouvés en ${apiTime}ms`, context);

    return NextResponse.json(response, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error.message}`, context);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error.message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * HEAD - Informations sur l'endpoint
 */
export async function HEAD() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/v2/files/search',
      method: 'GET',
      description: 'Recherche et liste les fichiers avec critères essentiels. Sans filtres = liste complète',
      api_version: 'v2',
      parameters: {
        // 📊 Pagination
        limit: 'Nombre maximum de fichiers (défaut: 50)',
        offset: 'Offset pour pagination (défaut: 0)',
        
        // 🔍 Critères essentiels
        q: 'Mot-clé (recherche dans filename + description)',
        type: 'Type interne (pdf, image, csv) OU MIME type (application/pdf)',
        
        // 📅 Dates
        created_from: 'Fichiers créés après (ISO date)',
        created_to: 'Fichiers créés avant (ISO date)',
        
        // 📏 Taille (option avancée)
        min_size: 'Taille minimum en bytes',
        max_size: 'Taille maximum en bytes',
        
        // 🔄 Tri
        sort_by: 'Trier par (filename, size, created_at)',
        sort_order: 'Ordre de tri (asc, desc)'
      },
      response_format: {
        success: 'boolean',
        files: 'array de fichiers avec métadonnées',
        total: 'nombre total de fichiers correspondants',
        metadata: 'informations de pagination et filtres appliqués'
      },
      llm_compatible: true,
      notes: 'Endpoint simplifié avec critères essentiels uniquement. Sans filtres = liste complète'
    }),
    { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    }
  );
}
