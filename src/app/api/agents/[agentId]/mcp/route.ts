/**
 * API Route : Gestion des serveurs MCP d'un agent
 * GET    /api/agents/:agentId/mcp - Liste les MCP liés
 * POST   /api/agents/:agentId/mcp - Lie un serveur MCP
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET : Liste les serveurs MCP liés à un agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { agentId } = params;

    // Récupérer les liaisons avec les serveurs MCP
    const { data: links, error } = await supabase
      .from('agent_mcp_servers')
      .select(`
        id,
        mcp_server_id,
        is_active,
        priority,
        mcp_servers (
          id,
          name,
          description,
          deployment_url,
          status,
          tools_count
        )
      `)
      .eq('agent_id', agentId)
      .order('priority');

    if (error) {
      logger.error('[API Agent MCP GET] Erreur récupération liaisons:', error);
      return NextResponse.json(
        { error: 'Erreur récupération liaisons MCP' },
        { status: 500 }
      );
    }

    logger.dev('[API Agent MCP GET] Liaisons récupérées:', links?.length || 0);

    return NextResponse.json({
      success: true,
      links: links || [],
      count: links?.length || 0
    });
  } catch (error) {
    logger.error('[API Agent MCP GET] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST : Lie un serveur MCP à un agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { agentId } = params;
    const body = await request.json();
    const { mcp_server_id } = body;

    if (!mcp_server_id) {
      return NextResponse.json(
        { error: 'mcp_server_id requis' },
        { status: 400 }
      );
    }

    // Vérifier que le serveur MCP existe
    const { data: mcpServer, error: mcpError } = await supabase
      .from('mcp_servers')
      .select('id, name')
      .eq('id', mcp_server_id)
      .single();

    if (mcpError || !mcpServer) {
      return NextResponse.json(
        { error: 'Serveur MCP introuvable' },
        { status: 404 }
      );
    }

    // Vérifier que l'agent existe
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, slug')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent introuvable' },
        { status: 404 }
      );
    }

    // Calculer la prochaine priority
    const { data: existingLinks } = await supabase
      .from('agent_mcp_servers')
      .select('priority')
      .eq('agent_id', agentId)
      .order('priority', { ascending: false })
      .limit(1);

    const nextPriority = existingLinks && existingLinks.length > 0
      ? existingLinks[0].priority + 1
      : 0;

    // Créer la liaison (ou réactiver si elle existe)
    const { data: link, error: linkError } = await supabase
      .from('agent_mcp_servers')
      .upsert({
        agent_id: agentId,
        mcp_server_id,
        is_active: true,
        priority: nextPriority
      }, {
        onConflict: 'agent_id,mcp_server_id'
      })
      .select()
      .single();

    if (linkError) {
      logger.error('[API Agent MCP POST] Erreur création liaison:', linkError);
      return NextResponse.json(
        { error: 'Erreur création liaison' },
        { status: 500 }
      );
    }

    logger.dev('[API Agent MCP POST] Liaison créée:', {
      agent: agent.slug,
      mcpServer: mcpServer.name,
      priority: nextPriority
    });

    return NextResponse.json({
      success: true,
      link,
      message: `Serveur MCP "${mcpServer.name}" lié à l'agent "${agent.slug}"`
    });
  } catch (error) {
    logger.error('[API Agent MCP POST] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

