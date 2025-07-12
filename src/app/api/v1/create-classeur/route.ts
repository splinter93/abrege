import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Classeur } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CreateClasseurPayload = {
  name: string;
  emoji?: string;
  color?: string;
  position: number;
};
export type CreateClasseurResponse =
  | { success: true; classeur: Classeur }
  | { error: string; details?: string[] };

export async function POST(req: Request): Promise<Response> {
  try {
    const body: CreateClasseurPayload = await req.json();
    // Validation stricte avec Zod
    const schema = z.object({
      name: z.string().min(1, 'name requis'),
      emoji: z.string().optional(),
      color: z.string().optional(),
      position: z.number().int().nonnegative(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { name, emoji, color, position } = parseResult.data;
    const insertData = {
      name,
      emoji: emoji || '📁',
      color: color || '#e55a2c',
      position,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('classeurs')
      .insert([insertData])
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, classeur: data }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const body = await req.json();
  const schema = z.object({ id: z.string().min(1, 'classeur_id requis') });
  const parseResult = schema.safeParse(body);
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre classeur_id invalide', details: parseResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  const { id } = parseResult.data;
  const { error } = await supabase
    .from('classeurs')
    .delete()
    .eq('id', id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * Endpoint: POST /api/v1/create-classeur
 * Payload attendu : { name: string, emoji?: string, color?: string, position: number }
 * - Valide le payload avec Zod (name et position obligatoires)
 * - Crée un classeur dans Supabase (table classeurs)
 * - Réponses :
 *   - 201 : { success: true, classeur }
 *   - 422 : { error: 'Payload invalide', details }
 *   - 500 : { error: string }
 */ 