import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v2/notes/recent
 * Récupère les notes récentes triées par updated_at
 * 
 * Paramètres optionnels : 
 * - limit (défaut: 10) 
 * - username (pour filtrer par utilisateur)
 * 
 * Cet endpoint est compatible LLM et peut être utilisé dans les tools OpenAPI
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    logger.info('[Notes Recent API v2] 📝 Récupération des notes récentes');
    
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || undefined;
    const username = searchParams.get('username') || undefined;
    
    logger.debug('[Notes Recent API v2] 📋 Paramètres reçus', { limit, username });
    
    const schema = z.object({
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
      username: z.string().optional()
    });
    
    const parseResult = schema.safeParse({ limit, username });
    if (!parseResult.success) {
      logger.error('[Notes Recent API v2] ❌ Paramètres invalides:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Paramètres invalides', 
          details: parseResult.error.errors.map(e => e.message),
          api_version: 'v2'
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { limit: limitNum, username: usernameParam } = parseResult.data;
    
    logger.debug('[Notes Recent API v2] 🔍 Construction de la requête', { limit: limitNum, username: usernameParam });
    
    let query = supabase
      .from('articles')
      .select(`
        id,
        source_title,
        slug,
        header_image,
        created_at,
        updated_at,
        visibility,
        user_id
      `)
      .order('updated_at', { ascending: false })
      .limit(limitNum);
    
    // Filtrer par username si spécifié
    // Note: Pour l'instant, on ne peut pas filtrer par username car la table users n'est pas accessible
    // TODO: Implémenter un système de résolution username -> user_id si nécessaire
    if (usernameParam) {
      logger.debug('[Notes Recent API v2] 🔍 Filtrage par username', { username: usernameParam });
      // TODO: Implémenter le filtrage par username
    }
    
    const { data: notes, error } = await query;
    
    if (error) {
      logger.error('[Notes Recent API v2] ❌ Erreur Supabase:', error);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          api_version: 'v2'
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    logger.debug('[Notes Recent API v2] 📊 Notes récupérées', { count: notes?.length || 0 });
    
    // Formater les données pour l'affichage
    const formattedNotes = notes?.map(note => ({
      id: note.id,
      title: note.source_title,
      slug: note.slug,
      headerImage: note.header_image,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      visibility: note.visibility || 'private',
      username: `user_${note.user_id?.slice(0, 8) || 'unknown'}`,
      url: note.visibility !== 'private' ? `/public/user_${note.user_id?.slice(8) || 'unknown'}/${note.slug}` : null
    })) || [];
    
    logger.info('[Notes Recent API v2] ✅ Notes récentes récupérées avec succès');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        notes: formattedNotes,
        total: formattedNotes.length,
        metadata: {
          api_version: 'v2',
          limit: limitNum,
          username_filter: usernameParam || null,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
    
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('[Notes Recent API v2] ❌ Erreur inattendue:', error);
    logger.error('[Notes Recent API v2] ❌ Stack trace:', { stack: error.stack });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        api_version: 'v2',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET - Informations sur l'endpoint
 */
export async function HEAD() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/v2/notes/recent',
      method: 'GET',
      description: 'Récupère les notes récentes triées par updated_at (API v2)',
      api_version: 'v2',
      parameters: {
        limit: 'Nombre maximum de notes à récupérer (défaut: 10)',
        username: 'Filtrer par nom d\'utilisateur (optionnel)'
      },
      response_format: {
        success: 'boolean',
        notes: 'array de notes récentes',
        total: 'nombre total de notes retournées',
        metadata: 'informations sur la requête'
      },
      llm_compatible: true, // Endpoint compatible LLM
      notes: 'Cet endpoint peut être utilisé dans les tools OpenAPI pour les LLM'
    }),
    { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    }
  );
} 