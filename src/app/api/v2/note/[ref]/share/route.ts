import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';
import type { ShareSettingsUpdate } from '@/types/sharing';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/v2/note/[ref]/share
 * Récupère les paramètres de partage d'une note
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_share_get',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_share_get', `🚀 Récupération paramètres de partage note ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_share_get', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // ✅ SIMPLIFICATION : Utiliser directement l'ID si c'est un UUID valide
    let noteId: string;
    
    // Vérifier si c'est un UUID valide
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
      noteId = ref;
    } else {
      // Sinon, essayer de résoudre par slug
      const userToken = request.headers.get('Authorization')?.substring(7);
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context, userToken);
      if (!resolveResult.success) {
        return NextResponse.json(
          { error: resolveResult.error },
          { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
        );
      }
      noteId = resolveResult.id;
    }

    // 🔐 Vérification des permissions
    const permissionResult = await checkUserPermission(noteId, 'article', 'viewer', userId, context);
    if (!permissionResult.success) {
      logApi('v2_note_share_get', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
      return NextResponse.json(
        { error: permissionResult.error },
        { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!permissionResult.hasPermission) {
      logApi('v2_note_share_get', `❌ Permissions insuffisantes pour note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Permissions insuffisantes pour voir cette note' },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les paramètres de partage
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${request.headers.get('Authorization')?.substring(7)}`
        }
      }
    });

    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, share_settings, public_url, user_id')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      logApi('v2_note_share_get', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_note_share_get', `✅ Paramètres de partage récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        title: note.source_title,
        share_settings: note.share_settings,
        public_url: note.public_url,
        user_id: note.user_id
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_share_get', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * PATCH /api/v2/note/[ref]/share
 * Met à jour les paramètres de partage d'une note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_share_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_share_update', `🚀 Mise à jour paramètres de partage note ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_share_update', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // ✅ SIMPLIFICATION : Utiliser directement l'ID si c'est un UUID valide
    let noteId: string;
    
    // Vérifier si c'est un UUID valide
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
      noteId = ref;
    } else {
      // Sinon, essayer de résoudre par slug
      const userToken = request.headers.get('Authorization')?.substring(7);
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context, userToken);
      if (!resolveResult.success) {
        return NextResponse.json(
          { error: resolveResult.error },
          { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
        );
      }
      noteId = resolveResult.id;
    }

    // 🔐 Vérification des permissions (seul le propriétaire peut modifier le partage)
    const permissionResult = await checkUserPermission(noteId, 'article', 'owner', userId, context);
    if (!permissionResult.success) {
      logApi('v2_note_share_update', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
      return NextResponse.json(
        { error: permissionResult.error },
        { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!permissionResult.hasPermission) {
      logApi('v2_note_share_update', `❌ Permissions insuffisantes pour modifier le partage de la note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Seul le propriétaire peut modifier les paramètres de partage' },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer et valider le body
    const body = await request.json() as ShareSettingsUpdate;
    
    // Validation basique - CORRIGÉE pour accepter les nouvelles options
    if (body.visibility && !['private', 'link', 'link-private', 'link-public', 'limited', 'scrivia'].includes(body.visibility)) {
      return NextResponse.json(
        { error: 'Niveau de visibilité invalide' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour les paramètres de partage
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${request.headers.get('Authorization')?.substring(7)}`
        }
      }
    });

    // Construire la mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Mettre à jour share_settings de manière incrémentale
    if (body.visibility || body.invited_users || body.allow_edit !== undefined || body.allow_comments !== undefined) {
      const { data: currentNote } = await supabase
        .from('articles')
        .select('share_settings')
        .eq('id', noteId)
        .single();

      const currentSettings = currentNote?.share_settings || {};
      updateData.share_settings = {
        ...currentSettings,
        ...body
      };
    }

    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', noteId)
      .select('id, source_title, share_settings, public_url')
      .single();

    if (updateError) {
      logApi('v2_note_share_update', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des paramètres de partage' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Déclencher le polling côté client
    clientPollingTrigger.triggerArticlesPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_share_update', `✅ Paramètres de partage mis à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Paramètres de partage mis à jour avec succès',
      note: updatedNote
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_share_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 