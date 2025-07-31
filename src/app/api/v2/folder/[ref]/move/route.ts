import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { moveFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_move',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_folder_move', `🚀 Début déplacement dossier v2 ${ref}`, context);

  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi(context.operation, `❌ Authentification échouée: ${authResult.error}`, context);
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

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(moveFolderV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_folder_move', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const { parent_id } = validationResult.data;

    // Vérifier que le dossier existe
    const { data: existingFolder, error: fetchError } = await supabase
      .from('folders')
      .select('id, name, user_id, parent_id')
      .eq('id', folderId)
      .single();

    if (fetchError || !existingFolder) {
      logApi('v2_folder_move', `❌ Dossier non trouvé: ${folderId}`, context);
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le dossier parent existe (si spécifié)
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from('folders')
        .select('id, user_id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentFolder) {
        logApi('v2_folder_move', `❌ Dossier parent non trouvé: ${parent_id}`, context);
        return NextResponse.json(
          { error: 'Dossier parent non trouvé' },
          { status: 404 }
        );
      }

      // Vérifier que le dossier parent appartient au même utilisateur
      if (parentFolder.user_id !== existingFolder.user_id) {
        logApi('v2_folder_move', '❌ Dossier parent appartient à un utilisateur différent', context);
        return NextResponse.json(
          { error: 'Impossible de déplacer vers un dossier d\'un autre utilisateur' },
          { status: 403 }
        );
      }
    }

    // Déplacer le dossier
    const { error: moveError } = await supabase
      .from('folders')
      .update({ parent_id: parent_id })
      .eq('id', folderId);

    if (moveError) {
      logApi('v2_folder_move', `❌ Erreur déplacement: ${moveError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors du déplacement' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerFoldersPolling('UPDATE');

    const apiTime = Date.now() - startTime;
    logApi('v2_folder_move', `✅ Dossier déplacé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier déplacé avec succès',
      folderId
    });

  } catch (error) {
    logApi('v2_folder_move', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 