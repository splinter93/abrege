import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Schéma de validation pour la mise à jour des paramètres de partage
const shareSettingsUpdateSchema = z.object({
  visibility: z.enum(['private', 'link-private', 'link-public', 'limited', 'scrivia']).optional(),
  invited_users: z.array(z.string()).optional(),
  allow_edit: z.boolean().optional(),
  link_expires: z.string().optional(),
  allow_comments: z.boolean().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_share_get',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début récupération paramètres partage note v2 ${ref}`, context);

  // 🔐 Authentification simplifiée
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Résoudre la référence de la note
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status || 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;

    // Récupérer les paramètres de partage actuels
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('id, share_settings, public_url')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !note) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Paramètres partage récupérés en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      share_settings: note.share_settings || {
        visibility: 'private',
        invited_users: [],
        allow_edit: false,
        allow_comments: false
      },
      public_url: note.public_url
    }, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_share_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début mise à jour paramètres partage note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod
    const validationResult = shareSettingsUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      logApi.error('❌ Validation échouée', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: validationResult.error.errors.map(e => e.message) 
        },
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const validatedData = validationResult.data;

    // 🔧 CORRECTION: Créer le client Supabase pour cette fonction
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Résoudre la référence de la note
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context, undefined);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status || 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;

    // Récupérer la note actuelle pour les paramètres existants
    const { data: currentNote, error: fetchError } = await supabase
      .from('articles')
      .select('id, share_settings, slug, public_url')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentNote) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Préparer les données de mise à jour
    const currentShareSettings = currentNote.share_settings || {
      visibility: 'private',
      invited_users: [],
      allow_edit: false,
      allow_comments: false
    };

    const updatedShareSettings = {
      ...currentShareSettings,
      ...validatedData
    };

    // Préparer les données de mise à jour
    const updateData: any = {
      share_settings: updatedShareSettings,
      updated_at: new Date().toISOString()
    };

    // Mettre à jour l'URL publique si la visibilité change
    if (validatedData.visibility && validatedData.visibility !== currentShareSettings.visibility) {
      if (validatedData.visibility === 'private') {
        updateData.public_url = null;
      } else if (validatedData.visibility === 'link-private' || validatedData.visibility === 'link-public') {
        // Générer une URL publique basée sur le slug
        updateData.public_url = `${process.env.NEXT_PUBLIC_APP_URL}/public/note/${userId}/${currentNote.slug}`;
      }
    }

    // Mettre à jour la note
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('id, share_settings, public_url, updated_at')
      .single();

    if (updateError) {
      logApi.error(`❌ Erreur mise à jour: ${updateError.message}`, context);
      return NextResponse.json(
        { error: `Erreur mise à jour: ${updateError.message}` },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Paramètres partage mis à jour en ${apiTime}ms`, context);

    // 🚀 DÉCLENCHER LE POLLING AUTOMATIQUEMENT
    try {
      const { triggerUnifiedRealtimePolling } = await import('@/services/unifiedRealtimeService');
      await triggerUnifiedRealtimePolling('notes', 'UPDATE');
      logApi.info('✅ Polling déclenché pour notes', context);
    } catch (pollingError) {
      logApi.warn('⚠️ Erreur lors du déclenchement du polling', pollingError);
    }

    return NextResponse.json({
      success: true,
      message: 'Paramètres de partage mis à jour avec succès',
      share_settings: updatedNote.share_settings,
      public_url: updatedNote.public_url
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error.message}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}