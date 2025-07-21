import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { markdownContentSchema } from '@/utils/markdownValidation';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/v1/note/overwrite
 * Met à jour complètement une note (remplace tout le contenu)
 * Supporte les IDs et les slugs
 * Réponse : { note: { id, source_title, markdown_content, ... } }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      note_id: z.string().min(1, 'note_id requis'),
      source_title: z.string().min(1, 'source_title requis'),
      markdown_content: z.string().min(1, 'markdown_content requis'),
      header_image: z.string().optional(),
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { note_id, source_title, markdown_content, header_image } = parseResult.data;
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    // Valider le markdown
    const validationResult = markdownContentSchema.safeParse(markdown_content);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Contenu markdown invalide', details: validationResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // Résoudre la référence (ID ou slug) vers l'ID réel
    const resolvedNoteId = await resolveNoteRef(note_id, USER_ID);
    
    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id')
      .eq('id', resolvedNoteId)
      .eq('user_id', USER_ID)
      .single();
    
    if (fetchError || !existingNote) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }
    
    // Générer un nouveau slug basé sur le nouveau titre
    const newSlug = await SlugGenerator.generateSlug(source_title, 'note', USER_ID, resolvedNoteId);
    
    // Mettre à jour la note
    const { data: note, error } = await supabase
      .from('articles')
      .update({
        source_title,
        markdown_content,
        header_image: header_image || null,
        slug: newSlug,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedNoteId)
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