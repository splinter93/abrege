import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { openApiSchemaService } from '@/services/llm/openApiSchemaService';

// Force Node.js runtime
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/ui/agents/[agentId]/openapi-schemas
 * Récupère tous les schémas OpenAPI liés à un agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID manquant' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les liens avec les informations des schémas
    const { data: links, error } = await supabase
      .from('agent_openapi_schemas')
      .select(`
        id,
        agent_id,
        openapi_schema_id,
        created_at,
        updated_at,
        openapi_schema:openapi_schemas (
          id,
          name,
          description,
          version,
          status,
          api_key,
          header
        )
      `)
      .eq('agent_id', agentId);

    if (error) {
      logger.error('[AgentOpenApiSchemas] ❌ Erreur lecture schémas:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Filtrer les schémas actifs
    const activeLinks = (links || []).filter(link => 
      link.openapi_schema && (link.openapi_schema as any).status === 'active'
    );

    logger.dev(`[AgentOpenApiSchemas] ✅ ${activeLinks.length} schémas actifs pour agent ${agentId}`);

    return NextResponse.json({
      success: true,
      schemas: activeLinks
    });

  } catch (error) {
    logger.error('[AgentOpenApiSchemas] ❌ Erreur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ui/agents/[agentId]/openapi-schemas
 * Lie un schéma OpenAPI à un agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { schema_id } = body;

    if (!agentId || !schema_id) {
      return NextResponse.json(
        { success: false, error: 'Agent ID et Schema ID requis' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier que l'agent existe
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le schéma existe et est actif
    const { data: schema, error: schemaError } = await supabase
      .from('openapi_schemas')
      .select('id, name')
      .eq('id', schema_id)
      .eq('status', 'active')
      .single();

    if (schemaError || !schema) {
      return NextResponse.json(
        { success: false, error: 'Schéma non trouvé ou inactif' },
        { status: 404 }
      );
    }

    // Créer la liaison (la contrainte UNIQUE empêchera les doublons)
    const { data: link, error: linkError } = await supabase
      .from('agent_openapi_schemas')
      .insert({
        agent_id: agentId,
        openapi_schema_id: schema_id
      })
      .select()
      .single();

    if (linkError) {
      // Si c'est une erreur de contrainte unique, c'est OK
      if (linkError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Schéma déjà lié à cet agent'
        });
      }

      logger.error('[AgentOpenApiSchemas] ❌ Erreur création lien:', linkError);
      return NextResponse.json(
        { success: false, error: linkError.message },
        { status: 500 }
      );
    }

    logger.info(`[AgentOpenApiSchemas] ✅ Schéma ${schema.name} lié à l'agent ${agentId}`);

    // ✅ CRITICAL FIX : Invalider le cache pour que le chat voit immédiatement les nouveaux tools
    openApiSchemaService.invalidateCache();
    logger.dev(`[AgentOpenApiSchemas] 🔄 Cache invalidé après liaison du schéma`);

    return NextResponse.json({
      success: true,
      link
    });

  } catch (error) {
    logger.error('[AgentOpenApiSchemas] ❌ Erreur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    );
  }
}

