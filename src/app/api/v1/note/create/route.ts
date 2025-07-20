import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/v1/note/create
 * Crée une nouvelle note avec génération automatique de slug
 * Réponse : { note: { id, slug, source_title, markdown_content, ... } }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      source_title: z.string().min(1, 'source_title requis'),
      markdown_content: z.string().min(1, 'markdown_content requis'),
      header_image: z.string().optional(),
      folder_id: z.string().optional(),
      classeur_id: z.string().optional(),
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { source_title, markdown_content, header_image, folder_id, classeur_id } = parseResult.data;
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    // Générer le slug
    const slug = await SlugGenerator.generateSlug(source_title, 'note', USER_ID);
    
    // Créer la note
    const { data: note, error } = await supabase
      .from('articles')
      .insert({
        source_title,
        markdown_content,
        header_image: header_image || null,
        folder_id: folder_id || null,
        classeur_id: classeur_id || null,
        user_id: USER_ID,
        slug,
        position: 0
      })
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ note }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 