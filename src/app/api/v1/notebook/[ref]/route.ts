import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveClasseurRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/v1/notebook/{ref}
 * Récupère un classeur par ID ou slug
 * Réponse : { notebook: { id, name, emoji, ... } }
 */
export async function GET(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'notebook_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre notebook_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const classeurId = await resolveClasseurRef(ref, USER_ID);
    
    const { data: notebook, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('id', classeurId)
      .single();
    if (error || !notebook) {
      return new Response(JSON.stringify({ error: error?.message || 'Classeur non trouvé.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ notebook }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * PUT /api/v1/notebook/{ref}
 * Met à jour un classeur par ID ou slug
 * Réponse : { notebook: { id, name, emoji, ... } }
 */
export async function PUT(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    const schema = z.object({
      ref: z.string().min(1, 'notebook_ref requis'),
      name: z.string().min(1, 'name requis'),
      emoji: z.string().optional()
    });
    
    const parseResult = schema.safeParse({ ref, ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { name, emoji } = parseResult.data;
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const classeurId = await resolveClasseurRef(ref, USER_ID);
    
    // Vérifier que le classeur existe
    const { data: existingNotebook, error: fetchError } = await supabase
      .from('classeurs')
      .select('id')
      .eq('id', classeurId)
      .eq('user_id', USER_ID)
      .single();
    
    if (fetchError || !existingNotebook) {
      return new Response(JSON.stringify({ error: 'Classeur non trouvé.' }), { status: 404 });
    }
    
    // Mettre à jour le classeur
    const { data: notebook, error } = await supabase
      .from('classeurs')
      .update({
        name,
        emoji: emoji || null,

        updated_at: new Date().toISOString()
      })
      .eq('id', classeurId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ notebook }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * DELETE /api/v1/notebook/{ref}
 * Supprime un classeur par ID ou slug
 * Réponse : { success: true }
 */
export async function DELETE(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = await params;
  const refSchema = z.string().min(1, 'notebook_ref requis');
  const refResult = refSchema.safeParse(ref);
  if (!refResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre notebook_ref invalide', details: refResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  
  // [TEMP] USER_ID HARDCODED FOR DEV/LLM
  const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
  const classeurId = await resolveClasseurRef(ref, USER_ID);
  
  // Vérifier que le classeur existe
  const { data: notebook, error: fetchError } = await supabase
    .from('classeurs')
    .select('id')
    .eq('id', classeurId)
    .single();
  if (fetchError || !notebook) {
    return new Response(JSON.stringify({ error: 'Classeur non trouvé.' }), { status: 404 });
  }
  // Supprimer le classeur
  const { error: deleteError } = await supabase
    .from('classeurs')
    .delete()
    .eq('id', classeurId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 