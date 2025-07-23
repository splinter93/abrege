import { z } from 'zod';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Validation des paramètres de pagination
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Extraire les paramètres de pagination depuis une requête
 */
export function extractPaginationParams(req: Request): PaginationParams {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    offset: (page - 1) * limit
  };
}

/**
 * Créer une réponse paginée
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1
    }
  };
}

/**
 * Helper pour les requêtes Supabase avec pagination
 */
export function addPaginationToQuery(query: any, params: PaginationParams) {
  return query
    .range(params.offset, params.offset + params.limit - 1)
    .order('created_at', { ascending: false });
}

/**
 * Compter le total d'éléments pour la pagination
 */
export async function countTotal(supabase: any, table: string, filters: any = {}) {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  // Appliquer les filtres
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  const { count, error } = await query;
  
  if (error) {
    throw new Error(`Erreur lors du comptage: ${error.message}`);
  }
  
  return count || 0;
} 