import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Article } from '@/types/supabase';
import { resolveNoteRef, resolveClasseurRef, resolveFolderRef } from '@/middleware/resourceResolver';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type MoveNotePayload = {
  target_classeur_id?: string;
  target_folder_id?: string | null;
  position?: number;
};
export type MoveNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  const { ref } = await params;
  try {
    // Vérifier l'authentification AVANT de traiter la requête
    const authHeader = req.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
      
      // Créer un client Supabase avec le token d'authentification
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        }
      });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        logger.dev("[Move Note API] ❌ Token invalide ou expiré");
        return new Response(
          JSON.stringify({ error: 'Token invalide ou expiré' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
      logger.dev("[Move Note API] ✅ Utilisateur authentifié:", userId);
    } else {
      logger.dev("[Move Note API] ❌ Token d'authentification manquant");
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: MoveNotePayload = await req.json();
    // --- LLM/legacy mapping ---
    if ('target_notebook_id' in body && !('target_classeur_id' in body)) {
      body.target_classeur_id = String(body.target_notebook_id);
    }
    const bodySchema = z.object({
      target_classeur_id: z.string().optional(),
      target_folder_id: z.string().nullable().optional(),
      position: z.number().int().nonnegative().optional(),
    });
    const paramSchema = z.object({ ref: z.string().min(1, 'note_ref requis') });
    const paramResult = paramSchema.safeParse({ ref });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Créer un client Supabase avec le token d'authentification pour les opérations DB
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Résoudre la référence de la note avec gestion d'erreur améliorée
    let noteId: string;
    try {
      noteId = await resolveNoteRef(ref, userId);
    } catch (error) {
      logger.error(`[Move Note API] ❌ Note non trouvée: ${ref}`, { 
        noteRef: ref, 
        userId, 
        error: error.message 
      });
      
      // Retourner une erreur 404 avec plus de détails
      return new Response(
        JSON.stringify({ 
          error: 'Note non trouvée', 
          details: [
            `La note avec la référence '${ref}' n'existe pas ou n'appartient pas à l'utilisateur`,
            'Cette erreur peut survenir si la note a été supprimée ou déplacée',
            'Veuillez rafraîchir l\'interface et réessayer'
          ]
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Résoudre les références de destination
    let targetClasseurId: string | undefined;
    let targetFolderId: string | null | undefined;
    if (body.target_classeur_id) {
      try {
        targetClasseurId = await resolveClasseurRef(body.target_classeur_id, userId);
      } catch {
        return new Response(JSON.stringify({ error: `Notebook cible '${body.target_classeur_id}' introuvable ou non accessible.` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    }
    if (body.target_folder_id !== undefined) {
      if (body.target_folder_id === null || body.target_folder_id === '' || body.target_folder_id === 'null') {
        targetFolderId = null;
      } else {
        try {
          targetFolderId = await resolveFolderRef(body.target_folder_id, userId);
        } catch {
          return new Response(JSON.stringify({ error: `Dossier cible '${body.target_folder_id}' introuvable ou non accessible.` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }
    // Construction de l'objet d'update
    const updates: Record<string, unknown> = {};
    if (targetClasseurId !== undefined) updates.classeur_id = targetClasseurId;
    if (targetFolderId !== undefined) updates.folder_id = targetFolderId;
    if ('position' in body) updates.position = body.position;
    updates.updated_at = new Date().toISOString();
    logger.dev('[moveNote] DEBUG', {
      ref,
      noteId,
      targetClasseurId,
      targetFolderId,
      updates,
      body
    });
    logger.dev('[moveNote] Payload:', body);
    logger.dev('[moveNote] Updates:', updates);
    const { data: updated, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();
    if (error) {
      logger.error('[moveNote] Update error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Aucune note mise à jour (slug/id incorrect ?)' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ note: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('[moveNote] PATCH error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? error.message : 'Erreur inconnue' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Endpoint: PATCH /api/v1/note/[ref]/move
 * Payload attendu : { target_classeur_id?: string, target_folder_id?: string | null, position?: number }
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Déplace la note dans le classeur/dossier/position cible
 * - Si target_folder_id est null ou non fourni, place à la racine du classeur
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_ref invalide' | 'Payload invalide', details }
 *   - 500 : { error: string }
 */ 