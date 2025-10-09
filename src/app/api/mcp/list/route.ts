/**
 * API Route : Liste des serveurs MCP Factoria disponibles
 * GET /api/mcp/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les serveurs MCP Factoria déployés
    const { data: servers, error } = await supabase
      .from('mcp_servers')
      .select('id, name, description, deployment_url, status, tools_count')
      .eq('status', 'deployed')
      .order('name');

    if (error) {
      logger.error('[API MCP List] Erreur récupération serveurs:', error);
      return NextResponse.json(
        { error: 'Erreur récupération serveurs MCP' },
        { status: 500 }
      );
    }

    logger.dev('[API MCP List] Serveurs récupérés:', servers?.length || 0);

    return NextResponse.json({
      success: true,
      servers: servers || [],
      count: servers?.length || 0
    });
  } catch (error) {
    logger.error('[API MCP List] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

