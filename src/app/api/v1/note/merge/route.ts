import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';

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
 * POST /api/v1/note/merge
 * Fusionne deux notes en une seule
 * Body: { sourceNoteId: string, targetNoteId: string }
 * Réponse: { success: true, mergedNote: { id, source_title, ... } }
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { supabase, userId } = await getAuthenticatedClient(req);
    
    const body = await req.json();
    const schema = z.object({
      sourceNoteId: z.string().min(1, 'sourceNoteId requis'),
      targetNoteId: z.string().min(1, 'targetNoteId requis')
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { sourceNoteId, targetNoteId } = parseResult.data;
    
    // Vérifier que les deux notes existent et appartiennent à l'utilisateur
    const { data: sourceNote, error: sourceError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .eq('id', sourceNoteId)
      .eq('user_id', userId)
      .single();
    
    if (sourceError || !sourceNote) {
      return new Response(JSON.stringify({ error: 'Note source non trouvée.' }), { status: 404 });
    }
    
    const { data: targetNote, error: targetError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .eq('id', targetNoteId)
      .eq('user_id', userId)
      .single();
    
    if (targetError || !targetNote) {
      return new Response(JSON.stringify({ error: 'Note cible non trouvée.' }), { status: 404 });
    }
    
    // Fusionner le contenu
    const sourceContent = sourceNote.markdown_content || '';
    const targetContent = targetNote.markdown_content || '';
    const mergedContent = `${targetContent}\n\n---\n\n${sourceContent}`;
    
    // Mettre à jour la note cible avec le contenu fusionné
    const { data: mergedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        markdown_content: mergedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetNoteId)
      .select()
      .single();
    
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }
    
    // Supprimer la note source
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', sourceNoteId);
    
    if (deleteError) {
      console.error('Erreur lors de la suppression de la note source:', deleteError);
      // Ne pas faire échouer la requête si la suppression échoue
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      mergedNote 
    }), { status: 200 });
  
  } catch (err: any) {
    if (err.message === 'Token invalide ou expiré' || err.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: err.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 