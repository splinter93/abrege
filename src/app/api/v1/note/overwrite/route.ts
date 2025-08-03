import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { markdownContentSchema } from '@/utils/markdownValidation';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { SlugGenerator } from '@/utils/slugGenerator';

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
 * POST /api/v1/note/overwrite
 * Met à jour complètement une note (remplace tout le contenu)
 * Supporte les IDs et les slugs
 * Réponse : { note: { id, source_title, markdown_content, ... } }
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      note_id: z.string().min(1, 'note_id requis'),
      source_title: z.string().min(1, 'source_title requis'),
      markdown_content: z.string().min(1, 'markdown_content requis'),
      header_image: z.string().optional(),
      header_image_offset: z.number().min(0).max(100).optional(), // Accepte les décimales
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { note_id, source_title, markdown_content, header_image, header_image_offset } = parseResult.data;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    const { supabase, userId } = await getAuthenticatedClient(req);
    
    // Valider le markdown
    const validationResult = markdownContentSchema.safeParse(markdown_content);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Contenu markdown invalide', details: validationResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // Résoudre la référence (ID ou slug) vers l'ID réel
    const resolvedNoteId = await resolveNoteRef(note_id, userId);
    
    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id')
      .eq('id', resolvedNoteId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingNote) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }
    
    // Générer un nouveau slug basé sur le nouveau titre
    const newSlug = await SlugGenerator.generateSlug(source_title, 'note', userId, resolvedNoteId);
    
    // Mettre à jour la note
    const { data: note, error } = await supabase
      .from('articles')
      .update({
        source_title,
        markdown_content,
        header_image: header_image || null,
        header_image_offset: header_image_offset || 50,
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
  
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  }