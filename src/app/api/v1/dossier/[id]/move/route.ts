import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Folder } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MoveDossierPayload = {
  target_classeur_id?: string;
  target_parent_id?: string | null;
  position?: number;
};

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  try {
    const paramSchema = z.object({ id: z.string().min(1, 'dossier_id requis') });
    const body: MoveDossierPayload = await req.json();
    const bodySchema = z.object({
      target_classeur_id: z.string().optional(),
      target_parent_id: z.string().nullable().optional(),
      position: z.number().int().nonnegative().optional(),
    });
    const paramResult = paramSchema.safeParse({ id });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre dossier_id invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    // Mettre à jour le dossier
    const updates: any = {};
    if ('target_classeur_id' in body) updates.classeur_id = body.target_classeur_id;
    if ('target_parent_id' in body) updates.parent_id = body.target_parent_id || null;
    if ('position' in body) updates.position = body.position;
    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ dossier: updated }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 