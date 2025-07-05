import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
  try {
    const body = await req.json();
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 