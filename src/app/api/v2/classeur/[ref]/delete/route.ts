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
    operation: 'v2_classeur_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_classeur_delete', `🚀 Début suppression classeur v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_classeur_delete', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const classeurId = resolveResult.id;

  // 🔐 Vérification des permissions
  const permissionResult = await checkUserPermission(classeurId, 'classeur', 'owner', userId, context);
  if (!permissionResult.success) {
    logApi('v2_classeur_delete', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_classeur_delete', `❌ Permissions insuffisantes pour classeur ${classeurId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour supprimer ce classeur' },
      { status: 403 }
    );
  }

  try {
    // Vérifier que le classeur existe
    const { data: existingClasseur, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, name, user_id')
      .eq('id', classeurId)
      .single();

    if (fetchError || !existingClasseur) {
      logApi('v2_classeur_delete', `❌ Classeur non trouvé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier s'il y a des dossiers dans le classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id')
      .eq('classeur_id', classeurId);

    if (foldersError) {
      logApi('v2_classeur_delete', `❌ Erreur vérification dossiers: ${foldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    if (folders && folders.length > 0) {
      logApi('v2_classeur_delete', `❌ Classeur contient des dossiers: ${folders.length}`, context);
      return NextResponse.json(
        { error: 'Impossible de supprimer un classeur contenant des dossiers' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a des notes dans le classeur
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id')
      .eq('classeur_id', classeurId);

    if (notesError) {
      logApi('v2_classeur_delete', `❌ Erreur vérification notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    if (notes && notes.length > 0) {
      logApi('v2_classeur_delete', `❌ Classeur contient des notes: ${notes.length}`, context);
      return NextResponse.json(
        { error: 'Impossible de supprimer un classeur contenant des notes' },
        { status: 400 }
      );
    }

    // Supprimer le classeur
    const { error: deleteError } = await supabase
      .from('classeurs')
      .delete()
      .eq('id', classeurId);

    if (deleteError) {
      logApi('v2_classeur_delete', `❌ Erreur suppression: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    clientPollingTrigger.triggerClasseursPolling('DELETE');

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_delete', `✅ Classeur supprimé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Classeur supprimé avec succès',
      classeurId
    });

  } catch (error) {
    logApi('v2_classeur_delete', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 