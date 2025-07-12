import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Folder } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CreateFolderPayload = {
  classeur_id: string;
  name: string;
  parent_id?: string | null;
};
export type CreateFolderResponse =
  | { success: true; folder: Folder }
  | { error: string; details?: string[] };

export async function POST(req: Request): Promise<Response> {
  try {
    const body: CreateFolderPayload = await req.json();
    // Validation stricte avec Zod
    const schema = z.object({
      classeur_id: z.string().min(1, 'classeur_id requis'),
      name: z.string().min(1, 'name requis'),
      parent_id: z.string().nullable().optional(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { classeur_id, name, parent_id } = parseResult.data;
    const insertData = {
      classeur_id,
      name,
      parent_id: parent_id || null,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('folders')
      .insert([insertData])
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, folder: data }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const body = await req.json();
  const schema = z.object({ id: z.string().min(1, 'folder_id requis') });
  const parseResult = schema.safeParse(body);
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: 'Paramètre folder_id invalide', details: parseResult.error.errors.map(e => e.message) }),
      { status: 422 }
    );
  }
  const { id } = parseResult.data;
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * Endpoint: POST /api/v1/create-folder
 * Payload attendu : { classeur_id: string, name: string, parent_id?: string | null }
 * - Valide le payload avec Zod (classeur_id et name obligatoires)
 * - Crée un dossier dans Supabase (table folders)
 * - Réponses :
 *   - 201 : { success: true, folder }
 *   - 422 : { error: 'Payload invalide', details }
 *   - 500 : { error: string }
 */ 