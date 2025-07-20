import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/v1/notebook/create
 * Crée un nouveau classeur avec génération automatique de slug
 * Réponse : { notebook: { id, slug, name, ... } }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(1, 'name requis'),
      emoji: z.string().optional(),
      color: z.string().optional(),
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { name, emoji, color } = parseResult.data;
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    // Générer le slug
    const slug = await SlugGenerator.generateSlug(name, 'classeur', USER_ID);
    
    // Créer le classeur
    const { data: notebook, error } = await supabase
      .from('classeurs')
      .insert({
        name,
        emoji: emoji || null,
        color: color || null,
        user_id: USER_ID,
        slug,
        position: 0
      })
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ notebook }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 