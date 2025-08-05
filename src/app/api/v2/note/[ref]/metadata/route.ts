import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_metadata',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_metadata', `🚀 Début récupération métadonnées note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_metadata', `❌ Authentification échouée: ${authResult.error}`, context);
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
    logApi('v2_metadata', '❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Créer un client Supabase authentifié
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const noteId = resolveResult.id;

  // 🔐 Vérification des permissions ou visibilité publique
  const isPublic = await checkUserPermission(noteId, 'article', 'viewer', userId, context);
  if (!isPublic.success || !isPublic.hasPermission) {
    // Vérifier si l'article est public
    const { data: article } = await supabase
      .from('articles')
      .select('visibility')
      .eq('id', noteId)
      .single();
    
    if (!article || article.visibility !== 'public') {
      logApi('v2_note_metadata', `❌ Accès refusé pour note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // Récupérer les métadonnées de la note
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select(`
        id, 
        source_title, 
        description, 
        header_image, 
        visibility,
        view_count,
        created_at, 
        updated_at,
        folder_id,
        classeur_id,
        user_id
      `)
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      logApi('v2_note_metadata', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les informations du dossier si présent
    let folderInfo = null;
    if (note.folder_id) {
      const { data: folder } = await supabase
        .from('folders')
        .select('id, name')
        .eq('id', note.folder_id)
        .single();
      folderInfo = folder;
    }

    // Récupérer les informations du classeur
    let classeurInfo = null;
    if (note.classeur_id) {
      const { data: classeur } = await supabase
        .from('classeurs')
        .select('id, name')
        .eq('id', note.classeur_id)
        .single();
      classeurInfo = classeur;
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_note_metadata', `✅ Métadonnées récupérées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Métadonnées récupérées avec succès',
      metadata: {
        id: note.id,
        title: note.source_title,
        description: note.description,
        headerImage: note.header_image,
        visibility: note.visibility,
        viewCount: note.view_count,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        folder: folderInfo,
        classeur: classeurInfo,
        userId: note.user_id
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_metadata', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 