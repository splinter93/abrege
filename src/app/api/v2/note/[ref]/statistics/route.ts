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
    operation: 'v2_note_statistics',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_statistics', `🚀 Début récupération statistiques note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_statistics', `❌ Authentification échouée: ${authResult.error}`, context);
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
    logApi('v2_statistics', '❌ Token manquant', context);
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
      logApi('v2_note_statistics', `❌ Accès refusé pour note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // Récupérer les données de la note
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content, view_count, created_at, updated_at')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      logApi('v2_note_statistics', `❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculer les statistiques
    const content = note.markdown_content || '';
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    const characters = content.length;
    const lines = content.split('\n').length;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    // Compter les titres (H1-H6)
    const headings = content.match(/^#{1,6}\s+/gm)?.length || 0;

    // Compter les liens
    const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g)?.length || 0;

    // Compter les images
    const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g)?.length || 0;

    // Compter les listes
    const lists = content.match(/^[\s]*[-*+]\s+/gm)?.length || 0;

    const apiTime = Date.now() - startTime;
    logApi('v2_note_statistics', `✅ Statistiques récupérées en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Statistiques récupérées avec succès',
      statistics: {
        id: note.id,
        title: note.source_title,
        viewCount: note.view_count || 0,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        content: {
          words,
          characters,
          lines,
          paragraphs,
          headings,
          links,
          images,
          lists
        }
      }
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_statistics', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 