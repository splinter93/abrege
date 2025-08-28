import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/middleware/auth';
import { createSupabaseClient } from '@/utils/supabaseClient';

/**
 * Endpoint sécurisé pour récupérer les classeurs de l'utilisateur
 * Requiert une authentification OAuth valide
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [CLASSEURS] Début de la requête GET /api/v1/classeurs');
    
    // ✅ AUTHENTIFICATION OBLIGATOIRE
    const user = await getCurrentUser(request);
    console.log('🔍 [CLASSEURS] Utilisateur authentifié:', { id: user.id, email: user.email });
    
    // Créer un client Supabase avec le contexte utilisateur
    const supabase = createSupabaseClient();
    
    // Récupérer les classeurs de l'utilisateur authentifié
    const { data: classeurs, error } = await supabase
      .from('classeurs')
      .select('id, name, emoji, color, position, created_at, updated_at, slug')
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    
    if (error) {
      console.error('❌ [CLASSEURS] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des classeurs' },
        { status: 500 }
      );
    }
    
    console.log('✅ [CLASSEURS] Classeurs récupérés avec succès:', classeurs?.length || 0);
    
    return NextResponse.json(classeurs);
    
  } catch (error) {
    console.error('❌ [CLASSEURS] Erreur générale:', error);
    
    if (error instanceof Error && error.message.includes('Authentification requise')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint OPTIONS pour le CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
