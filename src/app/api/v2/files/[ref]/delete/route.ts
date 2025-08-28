import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser } from '@/utils/authUtils';

// 🔧 CORRECTIONS APPLIQUÉES:
// - Authentification simplifiée via getAuthenticatedUser uniquement
// - Suppression de la double vérification d'authentification
// - Client Supabase standard sans token manuel
// - Plus de 401 causés par des conflits d'authentification

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_files_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début suppression fichier v2 ${ref}`, context);

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
  
  // 🔧 CORRECTION: Client Supabase standard, getAuthenticatedUser a déjà validé
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'file', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const fileId = resolveResult.id;

  try {
    // Vérifier que l'utilisateur est propriétaire du fichier
    const { data: file, error: checkError } = await supabase
      .from('files')
      .select('id, filename')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (checkError || !file) {
      logApi.info(`❌ Fichier non trouvé ou accès refusé: ${fileId}`, context);
      return NextResponse.json(
        { error: 'Fichier non trouvé ou accès refusé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer le fichier
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (deleteError) {
      logApi.error(`❌ Erreur suppression fichier: ${deleteError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du fichier' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Fichier supprimé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Fichier supprimé avec succès'
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