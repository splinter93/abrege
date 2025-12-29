import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

// Force Node.js runtime
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * DELETE /api/ui/agents/[agentId]/callables/[callableId]
 * Délie un callable d'un agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; callableId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId, callableId } = await params;

    if (!agentId || !callableId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID et Callable ID requis' },
        { status: 400 }
      );
    }

    logger.dev(`[AgentCallables] 🗑️ Suppression liaison: agent ${agentId} <-> callable ${callableId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier que l'agent existe
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer la liaison
    const { error: deleteError } = await supabase
      .from('agent_callables')
      .delete()
      .eq('agent_id', agentId)
      .eq('callable_id', callableId);

    if (deleteError) {
      logger.error('[AgentCallables] ❌ Erreur suppression liaison:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    logger.info(`[AgentCallables] ✅ Callable ${callableId} délié de l'agent ${agent.name} (${agentId})`);

    return NextResponse.json({
      success: true,
      message: 'Callable délié avec succès',
    });

  } catch (error) {
    logger.error('[AgentCallables] ❌ Erreur:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}




