import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';
import { logApi } from '@/utils/logger';

/**
 * Endpoint de test pour diagnostiquer les problèmes de TOC
 * GET /api/v2/debug/toc-test?note_ref=ref_de_la_note
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'v2_debug_toc_test',
    component: 'API_V2_DEBUG'
  };

  logApi.info('🔍 Début test TOC', context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          status: authResult.status || 401
        },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    
    // Récupérer la référence de la note depuis les paramètres
    const { searchParams } = new URL(request.url);
    const noteRef = searchParams.get('note_ref');
    
    if (!noteRef) {
      return NextResponse.json({
        success: false,
        error: 'Paramètre note_ref requis',
        example: '/api/v2/debug/toc-test?note_ref=slug-ou-id-de-la-note'
      }, { status: 400 });
    }

    logApi.info(`🔍 Test TOC pour note: ${noteRef}`, context);

    try {
      // Créer le bon client Supabase selon le type d'authentification
      const supabase = createAuthenticatedSupabaseClient(authResult);
      
      // Récupérer la note
      let query = supabase
        .from('articles')
        .select('id, source_title, markdown_content, slug')
        .eq('user_id', userId);

      const { data: note, error: fetchError } = await query
        .or(`id.eq.${noteRef},slug.eq.${noteRef}`)
        .single();

      if (fetchError) {
        logApi.info(`❌ Erreur récupération note: ${fetchError.message}`, context);
        return NextResponse.json({
          success: false,
          operation: 'fetch_note',
          error: fetchError.message,
          code: fetchError.code,
          note_ref: noteRef,
          user_id: userId
        });
      }

      if (!note) {
        return NextResponse.json({
          success: false,
          operation: 'fetch_note',
          error: 'Note non trouvée',
          note_ref: noteRef,
          user_id: userId
        });
      }

      logApi.info(`✅ Note récupérée: ${note.source_title}`, context);

      // Vérifier le contenu markdown
      if (!note.markdown_content) {
        return NextResponse.json({
          success: true,
          operation: 'toc_extraction',
          note: {
            id: note.id,
            title: note.source_title,
            slug: note.slug,
            has_content: false,
            content_length: 0
          },
          toc: [],
          message: 'Note sans contenu markdown'
        });
      }

      // Extraire la TOC
      const toc = extractTOCWithSlugs(note.markdown_content);

      logApi.info(`✅ TOC extraite: ${toc.length} sections`, context);

      // Analyser le contenu markdown pour détecter les problèmes
      const markdownAnalysis = {
        total_lines: note.markdown_content.split('\n').length,
        heading_lines: note.markdown_content.split('\n').filter(line => line.match(/^#{1,6}\s+/)).length,
        content_length: note.markdown_content.length,
        has_headings: toc.length > 0,
        first_heading: toc[0] || null,
        last_heading: toc[toc.length - 1] || null
      };

      return NextResponse.json({
        success: true,
        operation: 'toc_extraction',
        note: {
          id: note.id,
          title: note.source_title,
          slug: note.slug,
          has_content: true,
          content_length: note.markdown_content.length
        },
        toc: {
          count: toc.length,
          items: toc,
          sample: toc.slice(0, 3) // Afficher les 3 premiers éléments
        },
        markdown_analysis: markdownAnalysis,
        message: `TOC extraite avec succès: ${toc.length} sections trouvées`
      });

    } catch (dbError) {
      logApi.info(`❌ Erreur base de données: ${dbError}`, context);
      return NextResponse.json({
        success: false,
        operation: 'database_operation',
        error: dbError instanceof Error ? dbError.message : String(dbError),
        note_ref: noteRef,
        user_id: userId
      }, { status: 500 });
    }

  } catch (error) {
    logApi.error(`❌ Erreur inattendue: ${error}`, context);
    return NextResponse.json({
      success: false,
      error: 'Erreur inattendue lors du test TOC',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST - Test avec données
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'v2_debug_toc_test_post',
    component: 'API_V2_DEBUG'
  };

  try {
    const body = await request.json();
    const { test_operation, note_ref, markdown_content } = body;

    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    switch (test_operation) {
      case 'test_toc_extraction':
        // Test d'extraction TOC sur du contenu fourni
        if (!markdown_content) {
          return NextResponse.json({
            success: false,
            error: 'markdown_content requis pour test_toc_extraction'
          }, { status: 400 });
        }

        const toc = extractTOCWithSlugs(markdown_content);
        
        return NextResponse.json({
          success: true,
          operation: 'test_toc_extraction',
          input_length: markdown_content.length,
          toc_count: toc.length,
          toc: toc,
          analysis: {
            total_lines: markdown_content.split('\n').length,
            heading_lines: markdown_content.split('\n').filter(line => line.match(/^#{1,6}\s+/)).length
          }
        });

      case 'test_note_toc':
        // Test TOC d'une note existante
        if (!note_ref) {
          return NextResponse.json({
            success: false,
            error: 'note_ref requis pour test_note_toc'
          }, { status: 400 });
        }

        // Rediriger vers le GET avec les paramètres
        const url = new URL(request.url);
        url.searchParams.set('note_ref', note_ref);
        return NextResponse.redirect(url);

      default:
        return NextResponse.json({
          success: false,
          error: 'Opération de test non reconnue',
          supported_operations: ['test_toc_extraction', 'test_note_toc']
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du test POST',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
