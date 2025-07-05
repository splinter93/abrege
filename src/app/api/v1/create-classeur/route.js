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
      name: z.string().min(1, 'name requis'),
      icon: z.string().optional(),
      color: z.string().optional(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { name, icon, color } = parseResult.data;
    const insertData = {
      name,
      icon: icon || 'Folder',
      color: color || '#e55a2c',
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 