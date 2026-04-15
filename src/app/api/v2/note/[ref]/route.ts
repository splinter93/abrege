import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger, LogCategory } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { resolveNoteAccess } from '@/utils/database/shareAccessService';
import { noteEmbedCacheService } from '@/services/cache/NoteEmbedCacheService';
import { metricsCollector } from '@/services/monitoring/MetricsCollector';
import { extractSectionBody, extractTOCWithSlugs } from '@/utils/markdownTOC';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  let success = false;
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_get',
    component: 'API_V2',
    clientType,
    ref
  };

  logger.info(LogCategory.API, '🚀 Début récupération note v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logger.info(LogCategory.API, `❌ Authentification échouée`, {
      ...context,
      error: authResult.error
    });
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  const noteRef = ref;

  // Récupérer le paramètre fields pour déterminer ce qui doit être retourné
  const { searchParams } = new URL(request.url);
  const fields = searchParams.get('fields') || 'all'; // all, content, metadata
  const sectionSlug = searchParams.get('section') || null; // slug ou titre de section

  // Si section demandée, on a besoin de markdown_content dans tous les cas
  const effectiveFields = sectionSlug ? 'content' : fields;

  try {
    // 🔧 CORRECTION: Utiliser V2ResourceResolver comme l'endpoint content
    const resolveResult = await V2ResourceResolver.resolveRef(noteRef, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;

    // Résoudre l'accès (propriétaire ou collaborateur via classeur partagé)
    const access = await resolveNoteAccess(noteId, userId);
    if (!access) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createServiceClient();

    // ✅ Cache Note Embed : Vérifier le cache si mode 'content' ou 'all'
    // Ne pas court-circuiter si une section précise est demandée
    if (!sectionSlug && (effectiveFields === 'content' || effectiveFields === 'all')) {
      const cachedEmbed = await noteEmbedCacheService.get(noteId);
      if (cachedEmbed) {
        // Vérifier que la note n'a pas été modifiée depuis le cache
        const { data: currentNote } = await supabase
          .from('articles')
          .select('updated_at, html_content')
          .eq('id', noteId)
          .single();
        
        if (currentNote && cachedEmbed.updatedAt === currentNote.updated_at) {
          logger.info(LogCategory.API, '[Note GET] ✅ Cache hit', {
            noteId: noteId.substring(0, 8) + '...',
            fields
          });
          
          return NextResponse.json({
            success: true,
            note: {
              id: cachedEmbed.noteId,
              title: cachedEmbed.title,
              html_content: cachedEmbed.htmlContent,
              markdown_content: cachedEmbed.markdownContent,
              updated_at: cachedEmbed.updatedAt
            },
            mode: fields,
            cached: true
          });
        }
      }
    }

    // Construire la requête selon le paramètre fields
    let selectFields: string;
    let responseNote: unknown;

    switch (effectiveFields) {
      case 'content':
        // Mode content : champs socle + contenu + rendu
        selectFields = 'id, source_title, slug, public_url, header_image, markdown_content, created_at, updated_at, source_type';
        break;
      
      case 'metadata':
        // Mode metadata : champs socle + organisation + permissions
        selectFields = 'id, source_title, slug, public_url, header_image, folder_id, classeur_id, created_at, updated_at, share_settings, source_type';
        break;
      
      case 'all':
      default:
        // Mode all : tout (champs socle inclus)
        selectFields = 'id, source_title, slug, public_url, header_image, folder_id, classeur_id, created_at, updated_at, share_settings, markdown_content, source_type';
        break;
    }

    // Récupérer la note avec les champs appropriés (ownerId = propriétaire réel)
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select(selectFields)
      .eq('id', noteId)
      .eq('user_id', access.ownerId)
      .is('trashed_at', null)
      .single();

    if (fetchError || !note) {
      logger.info(LogCategory.API, `❌ Erreur récupération note`, {
        ...context,
        error: fetchError?.message || 'Note non trouvée'
      });
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Formater la réponse selon le mode
    const noteData = note as unknown as Record<string, unknown>;
    
    // Champs socle toujours présents
    const baseFields = {
      id: noteData.id,
      title: noteData.source_title,
      slug: noteData.slug,
      public_url: noteData.public_url,
      header_image: noteData.header_image
    };
    
    switch (effectiveFields) {
      case 'content':
        responseNote = {
          ...baseFields,
          markdown_content: noteData.markdown_content,
          source_type: noteData.source_type || null,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at
        };
        break;
      
      case 'metadata':
        responseNote = {
          ...baseFields,
          folder_id: noteData.folder_id,
          classeur_id: noteData.classeur_id,
          source_type: noteData.source_type || null,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at,
          share_settings: noteData.share_settings
        };
        break;
      
      case 'all':
      default:
        responseNote = {
          ...baseFields,
          folder_id: noteData.folder_id,
          classeur_id: noteData.classeur_id,
          source_type: noteData.source_type || null,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at,
          share_settings: noteData.share_settings,
          markdown_content: noteData.markdown_content
        };
        break;
    }

    // ─── Mode section : extraction d'une section précise ───────────────────
    if (sectionSlug) {
      const markdown = noteData.markdown_content as string | null;

      if (!markdown) {
        return NextResponse.json(
          { error: 'La note ne contient pas de contenu markdown' },
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const section = extractSectionBody(markdown, sectionSlug);

      if (!section) {
        const available = extractTOCWithSlugs(markdown).map(t => ({
          title: t.title,
          slug: t.slug,
          level: t.level
        }));
        return NextResponse.json(
          {
            error: `Section "${sectionSlug}" introuvable`,
            available_sections: available
          },
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const apiTime = Date.now() - startTime;
      logger.info(LogCategory.API, `✅ Section extraite avec succès`, {
        ...context,
        duration: apiTime,
        sectionSlug,
        charCount: section.char_count
      });

      success = true;
      return NextResponse.json({
        success: true,
        note: {
          id: noteData.id,
          title: noteData.source_title,
          updated_at: noteData.updated_at
        },
        section
      });
    }

    // ✅ Cache Note Embed : Mettre en cache si mode 'content' ou 'all' avec html_content
    if ((effectiveFields === 'content' || effectiveFields === 'all') && noteData.html_content) {
      try {
        await noteEmbedCacheService.set(noteId, {
          noteId,
          htmlContent: noteData.html_content as string,
          markdownContent: noteData.markdown_content as string || '',
          title: noteData.source_title as string || '',
          updatedAt: noteData.updated_at as string || new Date().toISOString()
        });
      } catch (cacheError) {
        // Ne pas bloquer si le cache échoue
        logger.warn(LogCategory.API, '[Note GET] ⚠️ Erreur mise en cache', {
          noteId: noteId.substring(0, 8) + '...',
          error: cacheError instanceof Error ? cacheError.message : 'Unknown error'
        });
      }
    }

    const apiTime = Date.now() - startTime;
    logger.info(LogCategory.API, `✅ Note récupérée avec succès`, {
      ...context,
      duration: apiTime,
      fields
    });

    success = true;
    return NextResponse.json({
      success: true,
      note: responseNote,
      mode: effectiveFields
    });

  } catch (err: unknown) {
    const error = err as Error;
    const errorType = error instanceof Error && error.message.includes('not found')
      ? 'not_found_error'
      : error instanceof Error && error.message.includes('auth')
      ? 'auth_error'
      : 'server_error';
    
    metricsCollector.recordError('v2/note', errorType, error);
    
    logger.info(LogCategory.API, `❌ Erreur serveur`, {
      ...context,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    const latency = Date.now() - startTime;
    metricsCollector.recordLatency('v2/note', latency, success);
    metricsCollector.recordThroughput('v2/note');
  }
}




