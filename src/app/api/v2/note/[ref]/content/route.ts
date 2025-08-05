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
    operation: 'v2_note_content',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_content', `🚀 Début récupération contenu note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_content', `❌ Authentification échouée: ${authResult.error}`, context);
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
    logApi('v2_content', '❌ Token manquant', context);
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
      logApi('v2_note_content', `❌ Accès refusé pour note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }
  }

  try {
    // Récupérer le contenu de la note
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content, html_content, header_image, created_at, updated_at')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      logApi('v2_note_content', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_note_content', `✅ Contenu récupéré en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Contenu récupéré avec succès',
      content: {
        id: note.id,
        title: note.source_title,
        markdown: note.markdown_content,
        html: note.html_content,
        headerImage: note.header_image,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_content', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 