import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/notes/recent
 * Récupère les notes récentes triées par updated_at
 * Paramètres optionnels : limit (défaut: 10), username (pour filtrer par utilisateur)
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || undefined;
    const username = searchParams.get('username') || undefined;
    
    const schema = z.object({
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
      username: z.string().optional()
    });
    
    const parseResult = schema.safeParse({ limit, username });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { limit: limitNum, username: usernameParam } = parseResult.data;
    
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
    
    const { data: notes, error } = await query;
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
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
    
    return new Response(
      JSON.stringify({ 
        success: true,
        notes: formattedNotes,
        total: formattedNotes.length
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
    
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 