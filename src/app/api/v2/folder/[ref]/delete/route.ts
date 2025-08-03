import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_delete', `🚀 Début suppression dossier v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_folder_delete', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'folder', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const folderId = resolveResult.id;

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(folderId, 'folder', 'owner', userId, context);
  if (!permissionResult.success) {
    logApi('v2_folder_delete', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_folder_delete', `❌ Permissions insuffisantes pour dossier ${folderId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour supprimer ce dossier' },
      { status: 403 }
    );
  }

  try {
    // Vérifier que le dossier existe
    const { data: existingFolder, error: fetchError } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .eq('id', folderId)
      .single();

    if (fetchError || !existingFolder) {
      logApi('v2_folder_delete', `❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier s'il y a des sous-dossiers
    const { data: subfolders, error: subfoldersError } = await supabase
      .from('folders')
      .select('id')
      .eq('parent_id', folderId);

    if (subfoldersError) {
      logApi('v2_folder_delete', `❌ Erreur vérification sous-dossiers: ${subfoldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    if (subfolders && subfolders.length > 0) {
      logApi('v2_folder_delete', `❌ Dossier contient des sous-dossiers: ${subfolders.length}`, context);
      return NextResponse.json(
        { error: 'Impossible de supprimer un dossier contenant des sous-dossiers' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a des notes dans le dossier
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id')
      .eq('folder_id', folderId);

    if (notesError) {
      logApi('v2_folder_delete', `❌ Erreur vérification notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    if (notes && notes.length > 0) {
      logApi('v2_folder_delete', `❌ Dossier contient des notes: ${notes.length}`, context);
      return NextResponse.json(
        { error: 'Impossible de supprimer un dossier contenant des notes' },
        { status: 400 }
      );
    }

    // Supprimer le dossier
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);

    if (deleteError) {
      logApi('v2_folder_delete', `❌ Erreur suppression: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    clientPollingTrigger.triggerFoldersPolling('DELETE');

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_delete', `✅ Dossier supprimé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier supprimé avec succès',
      folderId
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_folder_delete', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 