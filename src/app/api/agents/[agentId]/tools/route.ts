import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/agents/[agentId]/tools
 * Récupère les schémas OpenAPI et serveurs MCP liés à un agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
): Promise<NextResponse> {
  try {
    const { agentId } = params;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID requis' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les schémas OpenAPI liés à l'agent
    const { data: openApiLinks, error: openApiError } = await supabase
      .from('agent_openapi_schemas')
      .select(`
        openapi_schema_id,
        openapi_schemas!inner(id, name, version, description)
      `)
      .eq('agent_id', agentId);

    if (openApiError) {
      console.error('Erreur récupération schémas OpenAPI:', openApiError);
    }

    // Récupérer les serveurs MCP liés à l'agent
    const { data: mcpLinks, error: mcpError } = await supabase
      .from('agent_mcp_servers')
      .select(`
        mcp_server_id,
        mcp_servers!inner(id, name, description)
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (mcpError) {
      console.error('Erreur récupération serveurs MCP:', mcpError);
    }

    // Extraire les noms des schémas et serveurs
    const openapi_schemas = (openApiLinks || []).map(link => ({
      id: (link.openapi_schemas as unknown as { id: string; name: string; version?: string; description?: string }).id,
      name: (link.openapi_schemas as unknown as { id: string; name: string; version?: string; description?: string }).name,
      version: (link.openapi_schemas as unknown as { id: string; name: string; version?: string; description?: string }).version,
      description: (link.openapi_schemas as unknown as { id: string; name: string; version?: string; description?: string }).description
    }));

    const mcp_servers = (mcpLinks || []).map(link => ({
      id: (link.mcp_servers as unknown as { id: string; name: string; description?: string }).id,
      name: (link.mcp_servers as unknown as { id: string; name: string; description?: string }).name,
      description: (link.mcp_servers as unknown as { id: string; name: string; description?: string }).description
    }));

    return NextResponse.json({
      openapi_schemas,
      mcp_servers,
      total: openapi_schemas.length + mcp_servers.length
    });

  } catch (error) {
    console.error('Erreur récupération tools agent:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

