import { getAuthenticatedUser } from '@/utils/authUtils';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_delete', `🚀 Début suppression note v2 ${ref}`, context);

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
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const noteId = resolveResult.id;

  try {
    // Vérifier que la note existe
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, user_id')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      logApi('v2_note_delete', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer la note
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      logApi('v2_note_delete', `❌ Erreur suppression: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    // Déclencher le polling côté client
    await clientPollingTrigger.triggerArticlesPolling('DELETE');

    const apiTime = Date.now() - startTime;
    logApi('v2_note_delete', `✅ Note supprimée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note supprimée avec succès',
      noteId
    });

  } catch (error) {
    logApi('v2_note_delete', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 