import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

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

  // 🚨 LOGS DÉTAILLÉS POUR DEBUG
  console.log('🚨 [DEBUG] ===== DÉBUT API V2 SHARE =====');
  console.log('🚨 [DEBUG] Ref reçue:', ref);
  console.log('🚨 [DEBUG] Headers reçus:', Object.fromEntries(request.headers.entries()));
  console.log('🚨 [DEBUG] URL complète:', request.url);

  logApi('v2_note_share_update', `🚀 Mise à jour paramètres de partage note ${ref}`, context);

  // 🔐 Authentification
  console.log('🚨 [DEBUG] Début authentification...');
  console.log('🚨 [DEBUG] Headers Authorization:', request.headers.get('Authorization'));
  console.log('🚨 [DEBUG] Token extrait:', request.headers.get('Authorization')?.substring(7)?.substring(0, 20) + '...');
  
  const authResult = await getAuthenticatedUser(request);
  console.log('🚨 [DEBUG] Résultat authentification:', authResult);
  console.log('🚨 [DEBUG] authResult.success:', authResult.success);
  console.log('🚨 [DEBUG] authResult.userId:', authResult.userId);
  console.log('🚨 [DEBUG] authResult.error:', authResult.error);
  
  if (!authResult.success) {
    console.log('🚨 [DEBUG] ❌ Authentification échouée:', authResult.error);
    logApi('v2_note_share_update', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  console.log('🚨 [DEBUG] ✅ Utilisateur authentifié:', userId);
  console.log('🚨 [DEBUG] Type de userId:', typeof userId);
  console.log('🚨 [DEBUG] Longueur userId:', userId.length);

  try {
    // ✅ SIMPLIFICATION : Utiliser directement l'ID si c'est un UUID valide
    let noteId: string;
    
    console.log('🚨 [DEBUG] Début résolution de la référence...');
    
    // Vérifier si c'est un UUID valide
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
      noteId = ref;
      console.log('🚨 [DEBUG] ✅ Ref est un UUID valide:', noteId);
    } else {
      console.log('🚨 [DEBUG] 🔍 Ref est un slug, résolution nécessaire...');
      // Sinon, essayer de résoudre par slug
      const userToken = request.headers.get('Authorization')?.substring(7);
      console.log('🚨 [DEBUG] Token extrait:', userToken ? 'PRÉSENT' : 'ABSENT');
      
      console.log('🚨 [DEBUG] Appel V2ResourceResolver.resolveRef...');
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context, userToken);
      console.log('🚨 [DEBUG] Résultat résolution:', resolveResult);
      
      if (!resolveResult.success) {
        console.log('🚨 [DEBUG] ❌ Résolution échouée:', resolveResult.error);
        return NextResponse.json(
          { error: resolveResult.error },
          { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
        );
      }
      noteId = resolveResult.id;
      console.log('🚨 [DEBUG] ✅ Résolution réussie, noteId:', noteId);
    }

    console.log('🚨 [DEBUG] NoteId final:', noteId);

    // Créer le client Supabase authentifié
    const userToken = request.headers.get('Authorization')?.substring(7);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // 🔐 Vérification des permissions (seul le propriétaire peut modifier le partage)
    console.log('🚨 [DEBUG] Début vérification des permissions...');
    console.log('🚨 [DEBUG] Appel checkUserPermission avec:', { noteId, resourceType: 'article', requiredRole: 'owner', userId });
    
    const permissionResult = await checkUserPermission(noteId, 'article', 'owner', userId, context, supabase);
    console.log('🚨 [DEBUG] Résultat checkUserPermission:', permissionResult);
    
    if (!permissionResult.success) {
      console.log('🚨 [DEBUG] ❌ Erreur vérification permissions:', permissionResult.error);
      logApi('v2_note_share_update', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
      return NextResponse.json(
        { error: permissionResult.error },
        { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!permissionResult.hasPermission) {
      console.log('🚨 [DEBUG] ❌ Permissions insuffisantes');
      logApi('v2_note_share_update', `❌ Permissions insuffisantes pour modifier le partage de la note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Seul le propriétaire peut modifier les paramètres de partage' },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log('🚨 [DEBUG] ✅ Permissions vérifiées avec succès');

    // Récupérer et valider le body
    console.log('🚨 [DEBUG] Début parsing du body...');
    const body = await request.json() as ShareSettingsUpdate;
    console.log('🚨 [DEBUG] Body reçu:', body);
    
    // Validation basique - CORRIGÉE pour accepter les nouvelles options
    if (body.visibility && !['private', 'link', 'link-private', 'link-public', 'limited', 'scrivia'].includes(body.visibility)) {
      console.log('🚨 [DEBUG] ❌ Visibilité invalide:', body.visibility);
      return NextResponse.json(
        { error: 'Niveau de visibilité invalide' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log('🚨 [DEBUG] ✅ Validation du body réussie');

    // Mettre à jour les paramètres de partage
    console.log('🚨 [DEBUG] Client Supabase déjà créé, utilisation...');

    // Construire la mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Mettre à jour share_settings de manière incrémentale
    if (body.visibility || body.invited_users || body.allow_edit !== undefined || body.allow_comments !== undefined) {
      console.log('🚨 [DEBUG] Récupération des paramètres actuels...');
      const { data: currentNote, error: currentError } = await supabase
        .from('articles')
        .select('share_settings')
        .eq('id', noteId)
        .single();
      
      console.log('🚨 [DEBUG] Résultat récupération paramètres actuels:', { currentNote, currentError });
      
      if (currentError) {
        console.log('🚨 [DEBUG] ❌ Erreur récupération paramètres actuels:', currentError);
        return NextResponse.json(
          { error: 'Erreur lors de la récupération des paramètres actuels' },
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const currentSettings = currentNote?.share_settings || {};
      updateData.share_settings = {
        ...currentSettings,
        ...body
      };
      
      console.log('🚨 [DEBUG] Nouveaux paramètres calculés:', updateData.share_settings);
    }

    console.log('🚨 [DEBUG] Données de mise à jour finales:', updateData);
    console.log('🚨 [DEBUG] Début mise à jour dans la base...');

    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', noteId)
      .select('id, source_title, share_settings, public_url')
      .single();

    console.log('🚨 [DEBUG] Résultat mise à jour:', { updatedNote, updateError });

    if (updateError) {
      console.log('🚨 [DEBUG] ❌ Erreur mise à jour:', updateError);
      logApi('v2_note_share_update', `❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des paramètres de partage' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log('🚨 [DEBUG] ✅ Mise à jour réussie');



    const apiTime = Date.now() - startTime;
    logApi('v2_note_share_update', `✅ Paramètres de partage mis à jour en ${apiTime}ms`, context);
    
    console.log('🚨 [DEBUG] ===== FIN API V2 SHARE SUCCÈS =====');

    return NextResponse.json({
      success: true,
      data: {
        note: updatedNote
      }
    }, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.log('🚨 [DEBUG] ❌ EXCEPTION GLOBALE:', error);
    console.log('🚨 [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    
    const apiTime = Date.now() - startTime;
    logApi('v2_note_share_update', `❌ Exception: ${error}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 