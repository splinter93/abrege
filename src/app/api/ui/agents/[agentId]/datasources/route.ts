import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const linkDatasourceSchema = z.object({
  datasource_id: z.string().uuid('datasource_id doit être un UUID valide'),
});

/**
 * GET /api/ui/agents/[agentId]/datasources
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID manquant' },
        { status: 400 }
      );
    }

    logger.dev(`[AgentDatasources] Récupération datasources pour agent: ${agentId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: links, error } = await supabase
      .from('agent_datasources')
      .select(`
        id,
        agent_id,
        datasource_id,
        created_at,
        updated_at,
        synesia_datasources!datasource_id (
          id,
          project_id,
          type,
          name,
          description,
          customization,
          last_synced_at,
          created_at,
          updated_at
        )
      `)
      .eq('agent_id', agentId);

    if (error) {
      logger.error('[AgentDatasources] Erreur récupération:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const validLinks = (links || []).filter(
      (link: { synesia_datasources: unknown }) => link.synesia_datasources !== null
    );

    logger.dev(`[AgentDatasources] ${validLinks.length} datasources liés à l'agent ${agentId}`);

    return NextResponse.json({
      success: true,
      datasources: validLinks,
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

/**
 * POST /api/ui/agents/[agentId]/datasources
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corps JSON invalide ou vide' },
        { status: 400 }
      );
    }

    const validated = linkDatasourceSchema.parse(body);
    const { datasource_id } = validated;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID manquant' },
        { status: 400 }
      );
    }

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

    const { data: datasource, error: dsError } = await supabase
      .from('synesia_datasources')
      .select('id, name')
      .eq('id', datasource_id)
      .single();

    if (dsError || !datasource) {
      return NextResponse.json(
        { success: false, error: 'Datasource non trouvé. Synchronisez d\'abord les datasources Synesia.' },
        { status: 404 }
      );
    }

    const { data: link, error: linkError } = await supabase
      .from('agent_datasources')
      .insert({
        agent_id: agentId,
        datasource_id,
      })
      .select()
      .single();

    if (linkError) {
      if (linkError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Datasource déjà lié à cet agent',
        });
      }

      logger.error('[AgentDatasources] Erreur création lien:', linkError);
      return NextResponse.json(
        { success: false, error: linkError.message },
        { status: 500 }
      );
    }

    logger.info(`[AgentDatasources] Datasource ${datasource.name} (${datasource_id}) lié à l'agent ${agent.name}`);

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation échouée',
          details: error.issues,
        },
        { status: 400 }
      );
    }

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
