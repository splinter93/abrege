import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
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
    operation: 'v2_note_toc',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début récupération TOC note v2: ${ref}`, context);

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

  try {
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);

    // Construire la requête - le ref peut être un ID UUID ou un slug
    let query = supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .eq('user_id', userId);

    // Essayer d'abord comme UUID, puis comme slug
    const { data: note, error: fetchError } = await query
      .or(`id.eq.${ref},slug.eq.${ref}`)
      .single();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération note: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!note.markdown_content) {
      logApi.info(`⚠️ Note sans contenu markdown: ${ref}`, context);
      return NextResponse.json({
        success: true,
        toc: [],
        note: {
          id: note.id,
          title: note.source_title,
          has_content: false
        }
      });
    }

    // Extraire la table des matières
    const toc = extractTOCWithSlugs(note.markdown_content);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ TOC extrait avec succès en ${apiTime}ms - ${toc.length} sections`, context);

    return NextResponse.json({
      success: true,
      toc,
      note: {
        id: note.id,
        title: note.source_title,
        has_content: true,
        content_length: note.markdown_content.length
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}