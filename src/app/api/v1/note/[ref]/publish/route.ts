import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import type { ApiContext, NotePublishData } from '@/types/api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let userId: string;
  let userToken: string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userToken = authHeader.substring(7);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Token invalide ou expiré');
    }
    
    userId = user.id;
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}

/**
 * POST /api/v1/note/[ref]/publish
 * Publie ou dépublie une note
 * Body: { ispublished: boolean }
 * Réponse: { success: true, url?: string } ou { error: string }
 */
export async function POST(req: NextRequest, { params }: ApiContext): Promise<Response> {
  try {
    const { ref } = await params;
    const { supabase, userId } = await getAuthenticatedClient(req);
    
    const body = await req.json() as NotePublishData;
    const schema = z.object({
      ispublished: z.boolean(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { ispublished } = parseResult.data;

    const noteId = await resolveNoteRef(ref, userId);
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }

    // Mettre à jour ispublished et public_url
    let url = null;
    if (ispublished) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();
      if (userError || !user?.username) {
        return new Response(JSON.stringify({ error: 'Utilisateur ou username introuvable.' }), { status: 500 });
      }
      url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/@${user.username}/id/${noteId}`;
    }
    
    const { data: updated, error } = await supabase
      .from('articles')
      .update({
        ispublished: ispublished,
        public_url: ispublished ? url : null
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('slug, public_url')
      .single();
      
    if (error || !updated) {
      return new Response(JSON.stringify({ error: error?.message || 'Erreur lors de la mise à jour.' }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ success: true, url: updated.public_url }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 