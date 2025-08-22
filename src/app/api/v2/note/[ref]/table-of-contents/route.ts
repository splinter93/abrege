import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';

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
    operation: 'v2_note_table_of_contents',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début récupération table des matières note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
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
    logApi.info('❌ Token manquant', context);
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
      .select('share_settings')
      .eq('id', noteId)
      .single();
    
    if (!article || article.share_settings?.visibility === 'private') {
      logApi.info(`❌ Accès refusé pour note ${noteId}`, context);
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // Récupérer le contenu de la note
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      logApi.info(`❌ Note non trouvée: ${noteId}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extraire la table des matières
    const toc = extractTOCWithSlugs(note.markdown_content || '');

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Table des matières récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Table des matières récupérée avec succès',
      toc: toc.map(item => ({
        level: item.level,
        title: item.title,
        slug: item.slug,
        line: item.line,
        start: item.start
      }))
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 