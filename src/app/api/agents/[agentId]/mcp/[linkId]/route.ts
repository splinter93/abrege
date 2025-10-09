/**
 * API Route : Suppression d'une liaison MCP
 * DELETE /api/agents/:agentId/mcp/:linkId
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE : Supprime une liaison agent <-> MCP
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string; linkId: string } }
): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { agentId, linkId } = params;

    // Supprimer la liaison
    const { error } = await supabase
      .from('agent_mcp_servers')
      .delete()
      .eq('id', linkId)
      .eq('agent_id', agentId); // Sécurité : vérifier que le lien appartient bien à cet agent

    if (error) {
      logger.error('[API Agent MCP DELETE] Erreur suppression:', error);
      return NextResponse.json(
        { error: 'Erreur suppression liaison' },
        { status: 500 }
      );
    }

    logger.dev('[API Agent MCP DELETE] Liaison supprimée:', linkId);

    return NextResponse.json({
      success: true,
      message: 'Liaison MCP supprimée'
    });
  } catch (error) {
    logger.error('[API Agent MCP DELETE] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

