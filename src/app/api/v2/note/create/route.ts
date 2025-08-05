import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { createNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { optimizedApi } from '@/services/optimizedApi';
import { getAuthenticatedUser } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_create',
    component: 'API_V2',
    clientType
  };

  logApi('v2_note_create', '🚀 Début création note v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_create', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createNoteV2Schema, body);
    if (!validationResult.success) {
      logApi('v2_note_create', '❌ Validation échouée', context);
      return createValidationErrorResponse(validationResult);
    }

    const validatedData = validationResult.data;

    // Résoudre le notebook_id (peut être un UUID ou un slug)
    let classeurId = validatedData.notebook_id;
    
    // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
    if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logApi('v2_note_create', `🔍 Résolution du slug: ${classeurId}`, context);
      logApi('v2_note_create', `🔍 User ID: ${userId}`, context);
      
      logApi('v2_note_create', `🔍 Recherche classeur avec slug: ${classeurId} et user_id: ${userId}`, context);
      
      const { data: classeur, error: resolveError } = await supabase
        .from('classeurs')
        .select('id, name, slug, user_id')
        .eq('slug', classeurId)
        .eq('user_id', userId)
        .single();
      
      logApi('v2_note_create', `🔍 Résultat recherche:`, { classeur, error: resolveError }, context);
      
      if (resolveError || !classeur) {
        logApi('v2_note_create', `❌ Classeur non trouvé pour le slug: ${classeurId}`, context);
        logApi('v2_note_create', `❌ Erreur détaillée:`, resolveError, context);
        
        // 🔧 ANTI-BUG: Essayer de lister tous les classeurs pour debug
        const { data: allClasseurs, error: listError } = await supabase
          .from('classeurs')
          .select('id, name, slug, user_id')
          .eq('user_id', userId);
        
        logApi('v2_note_create', `🔍 Tous les classeurs de l'utilisateur:`, allClasseurs || [], context);
        
        return NextResponse.json(
          { error: `Classeur non trouvé: ${classeurId}` },
          { status: 404 }
        );
      }
      
      classeurId = classeur.id;
      logApi('v2_note_create', `✅ Slug résolu: ${validatedData.notebook_id} -> ${classeurId}`, context);
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
        user_id: userId
      })
      .select()
      .single();

    if (createError) {
      logApi('v2_note_create', `❌ Erreur création note: ${createError.message}`, context);
      return NextResponse.json(
        { error: `Erreur création note: ${createError.message}` },
        { status: 500 }
      );
    }

    const result = {
      success: true,
      note: note
    };

    const apiTime = Date.now() - startTime;
    logApi('v2_note_create', `✅ Note créée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Note créée avec succès',
      note: result.note
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_create', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 