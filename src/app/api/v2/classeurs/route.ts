import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

// Fonction pour créer le client Supabase
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function GET(request: NextRequest) {
  try {
    logger.dev("[Classeurs API] 🚀 REQUÊTE REÇUE !");
    
    // Récupérer l'utilisateur authentifié
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.dev("[Classeurs API] ❌ Pas d'authentification");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseClient();
    
    // 🔧 ANTI-BUG: Utiliser directement le token JWT pour l'authentification
    // Le token contient l'user_id, pas besoin de vérifier avec auth.getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      logger.dev("[Classeurs API] ❌ Token invalide");
      return NextResponse.json(
        { error: 'Token d\'authentification invalide' },
        { status: 401 }
      );
    }

    logger.dev("[Classeurs API] ✅ User authentifié:", user.id);

    // Récupérer les classeurs de l'utilisateur (avec clé de service pour contourner RLS)
    const { data: classeurs, error: fetchError } = await supabase
      .from('classeurs')
      .select('id, name, slug, created_at, updated_at')
      .eq('user_id', user.id)
      .order('name');

    if (fetchError) {
      logger.dev("[Classeurs API] ❌ Erreur récupération classeurs:", fetchError.message);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des classeurs' },
        { status: 500 }
      );
    }

    logger.dev(`[Classeurs API] ✅ ${classeurs?.length || 0} classeur(s) trouvé(s)`);

    return NextResponse.json({
      success: true,
      data: classeurs || []
    });

  } catch (error) {
    logger.error("[Classeurs API] ❌ Erreur générale:", error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 