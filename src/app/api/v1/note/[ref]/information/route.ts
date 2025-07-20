import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/note/{ref}/information
 * Récupère les informations de base d'une note
 * Réponse : { note: { id, source_title, header_image, created_at, updated_at, ... } }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const {} = params;
    const parseResult = schema.safeParse({});
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    const { data: note, error } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, updated_at, folder_id, classeur_id, slug')
      .eq('id', noteId)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ note }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * PATCH /api/v1/note/{ref}/information
 * Met à jour les informations de base d'une note
 * Réponse : { note: { id, source_title, header_image, ... } }
 */
export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const {} = params;
    const body = await req.json();
    
      ref: z.string().min(1, 'note_ref requis'),
      source_title: z.string().optional(),
      header_image: z.string().optional()
    });
    
    const parseResult = schema.safeParse({ ref, ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { source_title, header_image } = parseResult.data;
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', USER_ID)
      .single();
    
    if (fetchError || !existingNote) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }
    
    // Mettre à jour les informations
    const updateData: any = { updated_at: new Date().toISOString() };
    if (source_title !== undefined) updateData.source_title = source_title;
    if (header_image !== undefined) updateData.header_image = header_image;
    
    const { data: note, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ note }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 