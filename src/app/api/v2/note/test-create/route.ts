import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { createNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { SlugAndUrlService } from '@/services/slugAndUrlService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'v2_note_test_create',
    component: 'API_V2'
  };

  logApi.info('🧪 Test création note sans authentification', context);

  try {
    const body = await request.json();
    logApi.info('📝 Données reçues:', body);

    // Validation Zod V2
    const validationResult = validatePayload(createNoteV2Schema, body);
    if (!validationResult.success) {
      logApi.error('❌ Validation échouée', validationResult);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;
    logApi.info('✅ Validation réussie:', validatedData);

    // Simuler un userId pour le test
    const testUserId = '3223651c-5580-4471-affb-b3f4456bd729'; // Utilisateur de test
    const supabase = createSupabaseClient();

    // Résoudre le notebook_id (peut être un UUID ou un slug)
    let classeurId = validatedData.notebook_id;
    
    // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
    if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logApi.info(`🔍 Résolution du slug: ${classeurId}`);
      
      const { data: classeur, error: resolveError } = await supabase
        .from('classeurs')
        .select('id, name, slug, user_id')
        .eq('slug', classeurId)
        .eq('user_id', testUserId)
        .single();
      
      logApi.info(`🔍 Résultat recherche:`, { classeur, error: resolveError });
      
      if (resolveError || !classeur) {
        logApi.error(`❌ Classeur non trouvé pour le slug: ${classeurId}`, resolveError);
        
        // Lister tous les classeurs pour debug
        const { data: allClasseurs, error: listError } = await supabase
          .from('classeurs')
          .select('id, name, slug, user_id')
          .eq('user_id', testUserId);
        
        logApi.info(`🔍 Tous les classeurs de l'utilisateur:`, allClasseurs || []);
        
        return NextResponse.json(
          { error: `Classeur non trouvé: ${classeurId}`, debug: { allClasseurs, listError } },
          { status: 404 }
        );
      }
      
      classeurId = classeur.id;
      logApi.info(`✅ Slug résolu: ${validatedData.notebook_id} -> ${classeurId}`);
    }

    // Générer le slug et l'URL publique
    let slug: string;
    let publicUrl: string | null = null;
    try {
      const result = await SlugAndUrlService.generateSlugAndUpdateUrl(
        validatedData.source_title,
        testUserId,
        undefined, // Pas de noteId pour la création
        supabase
      );
      slug = result.slug;
      publicUrl = result.publicUrl;
      logApi.info(`✅ Slug généré: ${slug}`);
    } catch (e) {
      // Fallback minimal en cas d'échec
      slug = `${validatedData.source_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`.slice(0, 120);
      logApi.warn(`⚠️ Fallback slug utilisé: ${slug}`, e);
    }

    // Créer la note directement dans la base de données
    const { data: note, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: validatedData.source_title,
        markdown_content: validatedData.markdown_content || '',
        html_content: validatedData.markdown_content || '', // Pour l'instant, on met le même contenu
        header_image: validatedData.header_image,
        folder_id: validatedData.folder_id,
        classeur_id: classeurId,
        user_id: testUserId,
        slug,
        public_url: publicUrl
      })
      .select()
      .single();

    if (createError) {
      logApi.error(`❌ Erreur création note: ${createError.message}`, createError);
      return NextResponse.json(
        { error: `Erreur création note: ${createError.message}`, details: createError },
        { status: 500 }
      );
    }

    logApi.info('✅ Note créée avec succès:', note);

    return NextResponse.json({
      success: true,
      message: 'Note créée avec succès (test sans authentification)',
      note: note
    });

  } catch (err: unknown) {
    logApi.error(`❌ Erreur serveur: ${err}`, err);
    return NextResponse.json(
      { error: 'Erreur serveur', details: String(err) },
      { status: 500 }
    );
  }
} 