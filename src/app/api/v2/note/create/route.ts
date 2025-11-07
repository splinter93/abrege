import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { createNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { canPerformAction } from '@/utils/scopeValidation';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';

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

  logApi.info('🚀 Début création note v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`, authResult);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  // 🔐 Vérification des permissions pour créer une note
  if (!canPerformAction(authResult, 'notes:create', context)) {
    logApi.warn(`❌ Permissions insuffisantes pour notes:create`, context);
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
      logApi.error('❌ Validation échouée', validationResult);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Résoudre le notebook_id (peut être un UUID ou un slug)
    let classeurId = validatedData.notebook_id;
    
    // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
    if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logApi.info(`🔍 Résolution du slug: ${classeurId}`, context);
      logApi.info(`🔍 User ID: ${userId}`, context);
      
      logApi.info(`🔍 Recherche classeur avec slug: ${classeurId} et user_id: ${userId}`, context);
      
      const { data: classeur, error: resolveError } = await supabase
        .from('classeurs')
        .select('id, name, slug, user_id')
        .eq('slug', classeurId)
        .eq('user_id', userId)
        .single();
      
      logApi.info(`🔍 Résultat recherche:`, { classeur, error: resolveError });
      
      if (resolveError || !classeur) {
        logApi.error(`❌ Classeur non trouvé pour le slug: ${classeurId}`, resolveError);
        logApi.error(`❌ Erreur détaillée:`, resolveError);
        
        // 🔧 ANTI-BUG: Essayer de lister tous les classeurs pour debug
        const { data: allClasseurs, error: listError } = await supabase
          .from('classeurs')
          .select('id, name, slug, user_id')
          .eq('user_id', userId);
        
        logApi.info(`🔍 Tous les classeurs de l'utilisateur:`, allClasseurs || []);
        
        return NextResponse.json(
          { error: `Classeur non trouvé: ${classeurId}` },
          { status: 404 }
        );
      }
      
      classeurId = classeur.id;
      logApi.info(`✅ Slug résolu: ${validatedData.notebook_id} -> ${classeurId}`, context);
    }

    // Générer le slug et l'URL publique
    let slug: string;
    let publicUrl: string | null = null;
    try {
      const result = await SlugAndUrlService.generateSlugAndUpdateUrl(
        validatedData.source_title,
        userId,
        undefined, // Pas de noteId pour la création
        supabase
      );
      slug = result.slug;
      publicUrl = result.publicUrl;
    } catch (e) {
      // Fallback minimal en cas d'échec
      slug = `${validatedData.source_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`.slice(0, 120);
      logApi.warn(`⚠️ Fallback slug utilisé: ${slug}`, e);
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
        public_url: publicUrl
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
      logApi.error(`❌ Erreur création note: ${createError.message}`, createError);
      return NextResponse.json(
        { error: `Erreur création note: ${createError.message}` },
        { status: 500 }
      );
    }

    // 🔧 Maintenant qu'on a l'ID, générer l'URL publique permanente (avec ID, robuste aux changements de titre)
    try {
      const finalPublicUrl = await SlugAndUrlService.buildPublicUrl(userId, note.id, supabase);
      
      // Mettre à jour la note avec l'URL publique
      const { error: updateUrlError } = await supabase
        .from('articles')
        .update({ public_url: finalPublicUrl })
        .eq('id', note.id)
        .eq('user_id', userId);

      if (updateUrlError) {
        logApi.warn(`⚠️ Erreur mise à jour URL publique: ${updateUrlError.message}`, updateUrlError);
      } else {
        note.public_url = finalPublicUrl; // Mettre à jour l'objet retourné
        logApi.info(`✅ URL publique générée: ${finalPublicUrl}`, context);
      }
    } catch (urlError) {
      logApi.warn(`⚠️ Erreur génération URL publique (non bloquant): ${urlError}`, urlError);
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note créée en ${apiTime}ms`, context);

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    return NextResponse.json({
      success: true,
      message: 'Note créée avec succès',
      note: note
    });

  } catch (err: unknown) {
    logApi.error(`❌ Erreur serveur: ${err}`, err);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 