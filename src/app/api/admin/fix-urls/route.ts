/**
 * Route admin pour corriger les URLs publiques
 * Retire le /id/ du format ancien vers le nouveau format
 * 
 * GET /api/admin/fix-urls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = { operation: 'admin_fix_urls', component: 'API_ADMIN' };
  
  logApi.info('🔧 Début correction URLs publiques', context);

  // Auth
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const userId = authResult.userId!;

  try {
    const supabase = createSupabaseClient();
    
    // Récupérer toutes les notes de l'utilisateur
    const { data: notes, error: fetchError } = await supabase
      .from('articles')
      .select('id, public_url, user_id')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(`Erreur récupération notes: ${fetchError.message}`);
    }

    // Récupérer le username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    if (userError || !user?.username) {
      throw new Error('Username introuvable');
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    let correctedCount = 0;

    for (const note of notes) {
      if (!note.public_url) continue;

      // Format correct: @username/uuid (sans /id/)
      const correctUrl = `${apiBaseUrl}/@${user.username}/${note.id}`;

      // Si déjà correct, skip
      if (note.public_url === correctUrl) continue;

      // Vérifier si c'est l'ancien format avec /id/
      const hasOldFormat = note.public_url.includes('/id/');

      if (hasOldFormat) {
        logApi.debug(`🔧 Correction note ${note.id}: ${note.public_url} -> ${correctUrl}`, context);

        // Corriger
        const { error: updateError } = await supabase
          .from('articles')
          .update({ public_url: correctUrl })
          .eq('id', note.id)
          .eq('user_id', userId);

        if (!updateError) {
          correctedCount++;
        }
      }
    }

    logApi.info(`✅ ${correctedCount} URLs corrigées`, context);

    return NextResponse.json({
      success: true,
      message: `${correctedCount} URLs corrigées`,
      totalNotes: notes.length,
      correctedCount
    });

  } catch (error) {
    logApi.error('❌ Erreur correction URLs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

