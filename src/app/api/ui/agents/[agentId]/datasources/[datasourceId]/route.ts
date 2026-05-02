import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * DELETE /api/ui/agents/[agentId]/datasources/[datasourceId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; datasourceId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId, datasourceId } = await params;

    if (!agentId || !datasourceId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID et datasource ID requis' },
        { status: 400 }
      );
    }

    logger.dev(`[AgentDatasources] Suppression liaison: agent ${agentId} <-> datasource ${datasourceId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { error: deleteError } = await supabase
      .from('agent_datasources')
      .delete()
      .eq('agent_id', agentId)
      .eq('datasource_id', datasourceId);

    if (deleteError) {
      logger.error('[AgentDatasources] Erreur suppression liaison:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    logger.info(`[AgentDatasources] Datasource ${datasourceId} délié de l'agent ${agent.name}`);

    return NextResponse.json({
      success: true,
      message: 'Datasource délié avec succès',
    });
  } catch (error) {
    logger.error('[AgentDatasources] Erreur:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
