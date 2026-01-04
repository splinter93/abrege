import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Route pour vérifier l'existence d'un message par operation_id
 * Utilisé pour déduplication (idempotence)
 */
export async function GET(request: NextRequest) {
  try {
    // Extraire le token d'authentification
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant ou invalide' },
        { status: 401 }
      );
    }
    
    const userToken = authHeader.replace('Bearer ', '');
    
    // Valider le JWT et extraire userId
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }
    
    // Récupérer operation_id depuis query params
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operation_id');
    
    if (!operationId) {
      return NextResponse.json(
        { error: 'operation_id requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si un message avec cet operation_id existe déjà
    const { data: existingMessage, error: queryError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('operation_id', operationId)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 = no rows found (acceptable)
      logger.error('[Check Operation] Erreur requête:', queryError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }
    
    if (existingMessage) {
      logger.info('[Check Operation] ♻️ Message existant trouvé', {
        operationId,
        messageId: existingMessage.id
      });
      
      return NextResponse.json({
        exists: true,
        message: existingMessage
      });
    }
    
    return NextResponse.json({
      exists: false
    });
    
  } catch (error) {
    logger.error('[Check Operation] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}























