
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/notes/recent
 * Récupère les notes récentes triées par updated_at
 * Paramètres optionnels : limit (défaut: 50)
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || undefined;
    
    const schema = z.object({
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50)
    });
    
    const parseResult = schema.safeParse({ limit });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { limit: limitNum } = parseResult.data;
    
    // 🔧 CORRECTION: Requête simplifiée comme pour les dossiers
    let query = supabase
      .from('articles')
      .select(`
        id,
        source_title,
        slug,
        header_image,
        created_at,
        updated_at,
        share_settings,
        user_id,
        classeur_id,
        folder_id,
        markdown_content,
        html_content
      `)
      .order('updated_at', { ascending: false })
      .limit(limitNum);
    
    const { data: notes, error } = await query;
    
    if (error) {
      console.error('[API V1 Notes Recent] Erreur Supabase:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des notes', details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // �� CORRECTION: Format compatible avec Zustand (source_title au lieu de title)
    const formattedNotes = notes?.map(note => ({
      id: note.id,
      source_title: note.source_title || 'Sans titre', // ← CORRECTION: source_title au lieu de title
      slug: note.slug,
      header_image: note.header_image, // ← CORRECTION: header_image au lieu de headerImage
      created_at: note.created_at, // ← CORRECTION: created_at au lieu de createdAt
      updated_at: note.updated_at, // ← CORRECTION: updated_at au lieu de updatedAt
      share_settings: note.share_settings || { visibility: 'private' },
      user_id: note.user_id,
      classeur_id: note.classeur_id,
      folder_id: note.folder_id,
      markdown_content: note.markdown_content,
      html_content: note.html_content
    })) || [];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API V1 Notes Recent] ✅ ${formattedNotes.length} notes récupérées (comme les dossiers)`);
    }
    
    // 🔧 CORRECTION: Retourner directement le tableau pour compatibilité avec Zustand
    return new Response(
      JSON.stringify(formattedNotes), // ← Retour direct du tableau, pas d'objet wrapper
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[API V1 Notes Recent] Erreur inattendue:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 