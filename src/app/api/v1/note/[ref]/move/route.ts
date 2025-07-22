import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Article } from '@/types/supabase';
import { resolveNoteRef, resolveClasseurRef, resolveFolderRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MoveNotePayload = {
  target_classeur_id?: string;
  target_folder_id?: string | null;
  position?: number;
};
export type MoveNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { ref } = await params;
  try {
    const body: MoveNotePayload = await req.json();
    const bodySchema = z.object({
      target_classeur_id: z.string().optional(),
      target_folder_id: z.string().nullable().optional(),
      position: z.number().int().nonnegative().optional(),
    });
    const paramSchema = z.object({ ref: z.string().min(1, 'note_ref requis') });    const paramResult = paramSchema.safeParse({ ref });
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
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    // Résoudre les références de destination vers les vrais UUIDs
    let targetClasseurId: string | undefined;
    let targetFolderId: string | null | undefined;
    
    if (body.target_classeur_id) {
      targetClasseurId = await resolveClasseurRef(body.target_classeur_id, USER_ID);
      
      // Vérifier que le classeur existe
      const { data: classeur, error: classeurError } = await supabase
        .from('classeurs')
        .select('id')
        .eq('id', targetClasseurId)
        .eq('user_id', USER_ID)
        .single();
      
      if (classeurError || !classeur) {
        return new Response(JSON.stringify({ error: `Classeur de destination "${body.target_classeur_id}" non trouvé.` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // --- LOG DEBUG ---
    console.log('[moveNote] Payload reçu:', JSON.stringify(body));
    if (body.target_folder_id !== undefined) {
      // Si target_folder_id est null, chaîne vide ou 'null', on place la note à la racine
      if (body.target_folder_id === null || body.target_folder_id === '' || body.target_folder_id === 'null') {
        targetFolderId = null;
        console.log('[moveNote] Déplacement à la racine (folder_id = null)');
      } else {
        targetFolderId = await resolveFolderRef(body.target_folder_id, USER_ID);
        // Vérifier que le dossier existe
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id')
          .eq('id', targetFolderId)
          .eq('user_id', USER_ID)
          .single();
        if (folderError || !folder) {
          return new Response(JSON.stringify({ error: `Dossier de destination "${body.target_folder_id}" non trouvé.` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }
    
    // Mettre à jour la note avec les UUIDs résolus
    const updates: any = {};
    if (targetClasseurId !== undefined) updates.classeur_id = targetClasseurId;
    if (targetFolderId !== undefined) updates.folder_id = targetFolderId;
    if ('position' in body) updates.position = body.position;
    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ note: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[moveNote] PATCH error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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