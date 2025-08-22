import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début suppression note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  
  // Récupérer le token d'authentification
  const authHeader = request.headers.get('Authorization');
  const userToken = authHeader?.substring(7);
  
  if (!userToken) {
    logApi.error('❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Créer un client Supabase authentifié
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    let noteId = ref;
    
    // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
    if (!noteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logApi.info(`🔍 Résolution slug: ${ref}`, context);
      
      const { data: note, error: resolveError } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', ref)
        .eq('user_id', userId)
        .single();

      if (resolveError || !note) {
        logApi.error(`❌ Note non trouvée par slug: ${ref}`, context);
        return NextResponse.json(
          { error: 'Note non trouvée' },
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      
      noteId = note.id;
      logApi.info(`✅ Slug résolu: ${ref} → ${noteId}`, context);
    }

    // Vérifier que la note existe et appartient à l'utilisateur
    const { data: existingNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingNote) {
      logApi.error(`❌ Note non trouvée ou accès refusé: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée ou accès refusé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`🔍 Suppression note: ${existingNote.source_title} (${noteId})`, context);

    // Supprimer la note
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (deleteError) {
      logApi.error(`❌ Erreur suppression: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: `Erreur lors de la suppression: ${deleteError.message}` },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note supprimée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note supprimée avec succès'
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error.message}`, context);
    return NextResponse.json(
      { error: `Erreur serveur: ${error.message}` },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 