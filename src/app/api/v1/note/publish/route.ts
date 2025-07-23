import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PATCH /api/v1/note/publish
 * Body: { ref: string, isPublished: boolean }
 * Réponse: { success: true, url?: string } ou { error: string }
 */
export async function PATCH(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      ref: z.string().min(1, 'ref requis'),
      isPublished: z.boolean(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { ref, isPublished } = parseResult.data;

    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }

    // Mettre à jour ispublished
    const { data: updated, error } = await supabase
      .from('articles')
      .update({ ispublished: isPublished })
      .eq('id', noteId)
      .eq('user_id', USER_ID)
      .select('slug')
      .single();
    if (error || !updated) {
      return new Response(JSON.stringify({ error: error?.message || 'Erreur lors de la mise à jour.' }), { status: 500 });
    }

    // Si publié, récupérer le username
    let url;
    if (isPublished) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', USER_ID)
        .single();
      if (userError || !user?.username) {
        return new Response(JSON.stringify({ error: 'Utilisateur ou username introuvable.' }), { status: 500 });
      }
      // Retourner l'URL avec l'ID (stable) au lieu du slug
      url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/@${user.username}/shared/id/${noteId}`;
    }

    return new Response(JSON.stringify({ success: true, ...(url ? { url } : {}) }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 