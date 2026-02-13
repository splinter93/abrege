import { NextRequest, NextResponse } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';
import { createNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { canPerformAction } from '@/utils/scopeValidation';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { noteCreateRateLimiter } from '@/services/rateLimiter';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_create',
    component: 'API_V2',
    clientType
  };

  logger.info(LogCategory.API, '🚀 Début création note v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logger.error(LogCategory.API, `❌ Authentification échouée`, {
      error: authResult.error,
      status: authResult.status
    });
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  // ✅ Rate limiting par utilisateur
  const rateLimit = await noteCreateRateLimiter.check(userId);
  if (!rateLimit.allowed) {
    logger.warn(LogCategory.API, '[Note Create] ⛔ Rate limit dépassé', {
      userId: userId.substring(0, 8) + '...',
      limit: rateLimit.limit,
      resetTime: rateLimit.resetTime
    });

    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Vous avez atteint la limite de ${rateLimit.limit} créations de notes par minute. Veuillez réessayer dans ${retryAfter} secondes.`,
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          'Retry-After': retryAfter.toString()
        }
      }
    );
  }

  // 🔐 Vérification des permissions pour créer une note
  if (!canPerformAction(authResult, 'notes:create', context)) {
    logger.warn(LogCategory.API, `❌ Permissions insuffisantes pour notes:create`, {
      userId: userId.substring(0, 8) + '...',
      operation: context.operation
    });
    return NextResponse.json(
      { 
        error: `Permissions insuffisantes. Scope requis: notes:create`,
        required_scope: 'notes:create',
        available_scopes: authResult.scopes || []
      },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseClient();

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createNoteV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const validatedData = validationResult.data;

    // notebook_id optionnel : vide/null → Quicknotes par défaut, ou classeur déduit de folder_id si fourni
    const rawNotebookId = validatedData.notebook_id ?? null;
    const folderId = validatedData.folder_id ?? null;

    const hasNotebookId = rawNotebookId != null && String(rawNotebookId).trim() !== '';
    let classeurId: string | null = hasNotebookId ? (rawNotebookId as string) : null;

    if (classeurId !== null) {
      // Résoudre UUID ou slug → id classeur
      if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: classeur, error: resolveError } = await supabase
          .from('classeurs')
          .select('id, name, slug, user_id')
          .eq('slug', classeurId)
          .eq('user_id', userId)
          .single();

        if (resolveError || !classeur) {
          logger.error(LogCategory.API, `❌ Classeur non trouvé pour le slug`, {
            ...context,
            slug: classeurId,
            error: resolveError?.message
          });
          return NextResponse.json(
            { error: `Classeur non trouvé: ${classeurId}` },
            { status: 404 }
          );
        }
        classeurId = classeur.id;
      }
    } else {
      // notebook_id vide/null : Quicknotes par défaut, ou classeur du dossier si folder_id fourni
      if (folderId) {
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, classeur_id')
          .eq('id', folderId)
          .eq('user_id', userId)
          .single();
        if (folderError || !folder) {
          logger.error(LogCategory.API, `❌ Dossier non trouvé`, { ...context, folder_id: folderId });
          return NextResponse.json(
            { error: `Dossier non trouvé: ${folderId}` },
            { status: 404 }
          );
        }
        classeurId = folder.classeur_id as string;
        logger.info(LogCategory.API, `📁 Note dans le dossier fourni (classeur déduit)`, {
          ...context,
          folder_id: folderId,
          classeur_id: classeurId
        });
      } else {
        try {
          const { getOrCreateQuicknotesFoldersServer } = await import('@/utils/quicknotesUtils');
          const quicknotes = await getOrCreateQuicknotesFoldersServer(userId, supabase);
          classeurId = quicknotes.quicknotesClasseurId;
          logger.info(LogCategory.API, `📒 Note dans Quicknotes (classeur par défaut)`, { ...context, classeur_id: classeurId });
        } catch (e) {
          logger.error(LogCategory.API, `❌ Quicknotes non disponible`, {
            ...context,
            error: e instanceof Error ? e.message : String(e)
          });
          return NextResponse.json(
            { error: 'Classeur Quicknotes non trouvé. Créez un classeur nommé "Quicknotes" ou fournissez notebook_id.' },
            { status: 404 }
          );
        }
      }
    }

    // Générer le slug et l'URL publique
    let slug: string;
    let publicUrl: string | null = null;
    try {
      const result = await SlugAndUrlService.generateSlugAndUpdateUrl(
        validatedData.source_title,
        userId,
        undefined, // Pas de noteId pour la création
        supabase as unknown as ReturnType<typeof createClient>
      );
      slug = result.slug;
      publicUrl = result.publicUrl;
    } catch (e) {
      // Fallback minimal en cas d'échec
      slug = `${validatedData.source_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`.slice(0, 120);
      logger.warn(LogCategory.API, `⚠️ Fallback slug utilisé`, {
        ...context,
        slug,
        error: e instanceof Error ? e.message : String(e)
      });
    }

    // 🛡️ SÉCURITÉ : Sanitizer le markdown pour empêcher les injections HTML
    const safeMarkdown = sanitizeMarkdownContent(validatedData.markdown_content || '');

    // Créer la note directement dans la base de données
    const { data: note, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: validatedData.source_title,
        markdown_content: safeMarkdown,
        html_content: safeMarkdown, // Pour l'instant, on met le même contenu
        header_image: validatedData.header_image,
        folder_id: folderId,
        classeur_id: classeurId,
        font_family: 'Figtree',
        user_id: userId,
        slug,
        public_url: publicUrl,
        is_canva_draft: validatedData.is_canva_draft || false // ✅ NOUVEAU: Flag canva draft
      })
      .select(`
        id,
        source_title,
        slug,
        public_url,
        header_image,
        folder_id,
        classeur_id,
        user_id,
        created_at,
        updated_at,
        markdown_content,
        html_content
      `)
      .single();

    if (createError) {
      logger.error(LogCategory.API, `❌ Erreur création note`, {
        ...context,
        error: createError.message
      });
      return NextResponse.json(
        { error: `Erreur création note: ${createError.message}` },
        { status: 500 }
      );
    }

    // 🔧 Maintenant qu'on a l'ID, générer l'URL publique permanente (avec ID, robuste aux changements de titre)
    try {
      const finalPublicUrl = await SlugAndUrlService.buildPublicUrl(userId, note.id, supabase as unknown as ReturnType<typeof createClient>);
      
      // Mettre à jour la note avec l'URL publique
      const { error: updateUrlError } = await supabase
        .from('articles')
        .update({ public_url: finalPublicUrl })
        .eq('id', note.id)
        .eq('user_id', userId);

      if (updateUrlError) {
        logger.warn(LogCategory.API, `⚠️ Erreur mise à jour URL publique`, {
          ...context,
          error: updateUrlError.message
        });
      } else {
        note.public_url = finalPublicUrl; // Mettre à jour l'objet retourné
        logger.info(LogCategory.API, `✅ URL publique générée`, {
          ...context,
          url: finalPublicUrl
        });
      }
    } catch (urlError) {
      logger.warn(LogCategory.API, `⚠️ Erreur génération URL publique (non bloquant)`, {
        ...context,
        error: urlError instanceof Error ? urlError.message : String(urlError)
      });
    }

    const apiTime = Date.now() - startTime;
    logger.info(LogCategory.API, `✅ Note créée`, {
      ...context,
      duration: apiTime
    });

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    return NextResponse.json({
      success: true,
      message: 'Note créée avec succès',
      note: note
    });

  } catch (err: unknown) {
    logger.error(LogCategory.API, `❌ Erreur serveur`, {
      ...context,
      error: err instanceof Error ? err.message : String(err)
    });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 