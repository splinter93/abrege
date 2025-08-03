
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { s3Service } from '@/services/s3Service';

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


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }

    const body = await req.json();
    const bodySchema = z.object({
      fileKey: z.string().min(1, 'fileKey requis'),
    });
    
    const bodyParseResult = bodySchema.safeParse(body);
    if (!bodyParseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: bodyParseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }

    const { fileKey } = bodyParseResult.data;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Vérifier que le fichier existe avant de le supprimer
    const fileExists = await s3Service.fileExists(fileKey);
    if (!fileExists) {
      return new Response(JSON.stringify({ error: 'Fichier non trouvé.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Supprimer le fichier
    await s3Service.deleteFile(fileKey);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fichier supprimé avec succès'
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error('DELETE /api/v1/note/[ref]/content/delete error:', err);
    
    // Gestion d'erreurs spécifiques
    if (err instanceof Error && error.message.includes('Configuration S3 invalide')) {
      return new Response(JSON.stringify({ 
        error: 'Configuration serveur invalide',
        code: 'S3_CONFIG_ERROR'
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    if (err instanceof Error && error.message.includes('Access Denied')) {
      return new Response(JSON.stringify({ 
        error: 'Accès refusé au fichier',
        code: 'ACCESS_DENIED'
      }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    
    // Erreur générique
    return new Response(JSON.stringify({ 
      error: 'Erreur lors de la suppression du fichier',
      code: 'DELETE_ERROR'
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

/**
 * Endpoint: DELETE /api/v1/note/[ref]/content/delete
 * Body: { fileKey: string }
 * - Supprime un fichier S3
 * - Vérifie l'existence du fichier avant suppression
 * - Réponses :
 *   - 200 : { success: true, message: string }
 *   - 404 : { error: 'Fichier non trouvé.' }
 *   - 422 : { error: 'Paramètres invalides', details }
 *   - 500 : { error: string, code: string }
 */ 