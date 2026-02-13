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

    // ✅ NOUVEAU: Supporter notebook_id = null pour notes orphelines (Canva)
    let classeurId: string | null = validatedData.notebook_id ?? null;
    
    // Si notebook_id est fourni, le résoudre (UUID ou slug)
    if (classeurId !== null) {
      // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
      if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        logger.info(LogCategory.API, `🔍 Résolution du slug`, { ...context, slug: classeurId });
        logger.info(LogCategory.API, `🔍 User ID`, { ...context, userId });
        
        logger.info(LogCategory.API, `🔍 Recherche classeur avec slug`, { ...context, slug: classeurId, userId });
        
        const { data: classeur, error: resolveError } = await supabase
          .from('classeurs')
          .select('id, name, slug, user_id')
          .eq('slug', classeurId)
          .eq('user_id', userId)
          .single();
        
        logger.info(LogCategory.API, `🔍 Résultat recherche`, { ...context, classeur, error: resolveError });
        
        if (resolveError || !classeur) {
          logger.error(LogCategory.API, `❌ Classeur non trouvé pour le slug`, {
            ...context,
            slug: classeurId,
            error: resolveError?.message
          });
          logger.error(LogCategory.API, `❌ Erreur détaillée`, {
            ...context,
            error: resolveError?.message
          });
          
          // 🔧 ANTI-BUG: Essayer de lister tous les classeurs pour debug
          const { data: allClasseurs, error: listError } = await supabase
            .from('classeurs')
            .select('id, name, slug, user_id')
            .eq('user_id', userId);
          
          logger.info(LogCategory.API, `🔍 Tous les classeurs de l'utilisateur`, {
            ...context,
            count: allClasseurs?.length || 0
          });
          
          return NextResponse.json(
            { error: `Classeur non trouvé: ${classeurId}` },
            { status: 404 }
          );
        }
        
        classeurId = classeur.id;
        logger.info(LogCategory.API, `✅ Slug résolu`, {
          ...context,
          original: validatedData.notebook_id,
          resolved: classeurId
        });
      }
    } else {
      logger.info(LogCategory.API, `🎨 Création note orpheline (Canva)`, context);
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
        folder_id: validatedData.folder_id,
        classeur_id: classeurId, // 🔧 CORRECTION TEMPORAIRE: Utiliser uniquement classeur_id
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