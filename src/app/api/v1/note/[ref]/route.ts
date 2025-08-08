import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Article } from '@/types/supabase';
import type { NextRequest } from 'next/server';
import type { ApiContext } from '@/types/api';
// import.*resolveNoteRef.*from '@/middleware/resourceResolver';
// import.*SlugGenerator.*from '@/utils/slugGenerator';
// import.*logger.*from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Types explicites pour la réponse
export type GetNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let userId: string;
  let userToken: string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userToken = authHeader.substring(7);
    
    // // const supabase = [^;]+;]+;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Token invalide ou expiré');
    }
    
    userId = user.id;
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}

export async function GET(req: NextRequest, { params }: ApiContext): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', noteId)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ note: data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    // const error = [^;]+;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest, { params }: ApiContext): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    const schema = z.object({ 
      ref: z.string().min(1, 'note_ref requis'),
      header_image: z.string().url('header_image doit être une URL valide').optional().nullable(),
      header_image_offset: z.number().min(0).max(100).optional(), // Accepte les décimales
      header_image_blur: z.number().int().min(0).max(5).optional(),
      header_image_overlay: z.number().int().min(0).max(5).optional(),
      header_title_in_image: z.boolean().optional(),
      source_title: z.string().min(1, 'source_title requis').optional(),
      markdown_content: z.string().optional(),
      html_content: z.string().optional(),
      wide_mode: z.boolean().optional(),
      font_family: z.string().optional()
    });
    
    const parseResult = schema.safeParse({ ref, ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    // Préparer les données à mettre à jour
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (body.header_image !== undefined) {
      updateData.header_image = body.header_image;
    }
    if (body.header_image_offset !== undefined) {
      // Arrondir l'offset à 1 décimale pour éviter les valeurs trop précises
      const roundedOffset = Math.round(body.header_image_offset * 10) / 10;
      updateData.header_image_offset = roundedOffset;
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[API] Mise à jour header_image_offset:', roundedOffset);
      }
    }
    if (body.header_image_blur !== undefined) {
      updateData.header_image_blur = body.header_image_blur;
    }
    if (body.header_image_overlay !== undefined) {
      updateData.header_image_overlay = body.header_image_overlay;
    }
    if (body.header_title_in_image !== undefined) {
      updateData.header_title_in_image = body.header_title_in_image;
    }
    if (body.source_title !== undefined) {
      updateData.source_title = body.source_title;
    }
    if (body.markdown_content !== undefined) {
      updateData.markdown_content = body.markdown_content;
    }
    if (body.html_content !== undefined) {
      updateData.html_content = body.html_content;
    }
    if (body.wide_mode !== undefined) {
      updateData.wide_mode = body.wide_mode;
    }
    if (body.font_family !== undefined) {
      updateData.font_family = body.font_family;
    }
    
    const { data, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    return new Response(JSON.stringify({ note: data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    // const error = [^;]+;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req: NextRequest, { params }: ApiContext): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', noteId);
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    // const error = [^;]+;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

/**
 * Endpoint: GET /api/v1/note/[ref]
 * Paramètre attendu : { ref: string } (ID ou slug)
 * - Valide le paramètre ref avec Zod
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Retourne la note correspondante depuis Supabase
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_ref invalide', details }
 *   - 500 : { error: string }
 */ 