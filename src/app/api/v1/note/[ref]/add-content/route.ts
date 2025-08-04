import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { simpleLogger as logger } from '@/utils/logger';

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
 * PATCH /api/v1/note/{ref}/add-content
 * Ajoute du contenu à la fin d'une note
 * Body: { text: string, position?: 'start' | 'end' }
 * Réponse : { note: { id, markdown_content, ... } }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    const schema = z.object({
      text: z.string().min(1, 'text requis'),
      position: z.enum(['start', 'end']).optional().default('end')
    });
    
    const parseResult = schema.safeParse({ ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { text, position } = parseResult.data;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    // Récupérer la note actuelle
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();
    
    if (fetchError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    
    // Ajouter le contenu
    const currentContent = note.markdown_content || '';
    const newContent = position === 'start' 
      ? `${text}\n\n${currentContent}`
      : `${currentContent}\n\n${text}`;
    
    // Mettre à jour la note
    const { data: updatedNote, error } = await supabase
      .from('articles')
      .update({
        markdown_content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    // Mettre à jour l'insight avec la nouvelle TOC
    try {
      await updateArticleInsight(noteId);
      logger.dev(`✅ Insight mis à jour pour la note ${noteId}`);
    } catch (insightError) {
      logger.error('⚠️ Erreur mise à jour insight:', insightError);
      // Ne pas faire échouer la requête si l'insight échoue
    }
    
    return new Response(JSON.stringify({ note: updatedNote }), { status: 200, headers: { "Content-Type": "application/json" } });
  
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
} 