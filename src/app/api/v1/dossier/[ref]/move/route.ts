import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveFolderRef, resolveClasseurRef } from '@/middleware/resourceResolver';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type MoveDossierPayload = {
  target_classeur_id?: string;
  target_parent_id?: string | null;
  position?: number;
};

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
        logger.dev("[Dossier Move API] ❌ Token invalide ou expiré");
        return new Response(
          JSON.stringify({ error: 'Token invalide ou expiré' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
      logger.dev("[Dossier Move API] ✅ Utilisateur authentifié:", userId);
    } else {
      logger.dev("[Dossier Move API] ❌ Token d'authentification manquant");
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: MoveDossierPayload = await req.json();
    const bodySchema = z.object({
      target_classeur_id: z.string().optional(),
      target_parent_id: z.string().nullable().optional(),
      position: z.number().int().nonnegative().optional(),
    });
    const paramSchema = z.object({ ref: z.string().min(1, 'dossier_ref requis') });
    const paramResult = paramSchema.safeParse({ ref });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre dossier_ref invalide', details: paramResult.error.errors.map(e => e.message) }),
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

    const folderId = await resolveFolderRef(ref, userId);
    
    // Résolution des références (slug ou id) pour classeur et parent
    let resolvedClasseurId: string | undefined = undefined;
    let resolvedParentId: string | null | undefined = undefined;
    if ('target_classeur_id' in body && body.target_classeur_id) {
      try {
        resolvedClasseurId = await resolveClasseurRef(body.target_classeur_id, userId);
      } catch {
        return new Response(
          JSON.stringify({ error: `Classeur cible '${body.target_classeur_id}' introuvable ou non accessible.` }),
          { status: 404 }
        );
      }
    }
    if ('target_parent_id' in body) {
      if (body.target_parent_id === null) {
        resolvedParentId = null;
      } else if (body.target_parent_id) {
        try {
          resolvedParentId = await resolveFolderRef(body.target_parent_id, userId);
        } catch {
          return new Response(
            JSON.stringify({ error: `Dossier parent cible '${body.target_parent_id}' introuvable ou non accessible.` }),
            { status: 404 }
          );
        }
      }
    }
    // Construction de l'objet d'update
    const updates: Record<string, unknown> = {};
    if (resolvedClasseurId !== undefined) updates.classeur_id = resolvedClasseurId;
    if (resolvedParentId !== undefined) updates.parent_id = resolvedParentId;
    if ('position' in body) updates.position = body.position;
    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun champ à mettre à jour.' }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    // --- Déplacement du dossier parent ---
    const { data: updated, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Aucun dossier mis à jour (slug/id incorrect ?)' }), { status: 404 });
    }
    // --- Déplacement récursif du contenu (sous-dossiers + notes) ---
    if (resolvedClasseurId !== undefined) {
      // 1. Récupérer tous les sous-dossiers descendants (récursif)
      const { data: allFolders, error: fetchFoldersError } = await supabase
        .from('folders')
        .select('id, parent_id')
        .eq('user_id', userId);
      if (fetchFoldersError) {
        return new Response(JSON.stringify({ error: 'Erreur lors de la récupération des sous-dossiers.' }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      // Fonction récursive pour trouver tous les descendants
      function getDescendantFolderIds(parentId: string, folders: { id: string; parent_id: string | null }[]): string[] {
        const direct = folders.filter(f => f.parent_id === parentId).map(f => f.id);
        return direct.concat(direct.flatMap(id => getDescendantFolderIds(id, folders)));
      }
      const descendantIds = getDescendantFolderIds(folderId, allFolders || []);
      const allToUpdate = [folderId, ...descendantIds];
      // 2. Update classeur_id sur tous les sous-dossiers
      if (descendantIds.length > 0) {
        const { error: updateSubfoldersError } = await supabase
          .from('folders')
          .update({ classeur_id: resolvedClasseurId })
          .in('id', descendantIds);
        if (updateSubfoldersError) {
          return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour des sous-dossiers.' }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      }
      // 3. Update classeur_id sur toutes les notes de ces dossiers
      const { error: updateNotesError } = await supabase
        .from('articles')
        .update({ classeur_id: resolvedClasseurId })
        .in('folder_id', allToUpdate);
      if (updateNotesError) {
        return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour des notes du dossier.' }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ folder: updated }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('[moveDossier] PATCH error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? error.message : 'Erreur inconnue' }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
} 