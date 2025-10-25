import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { openApiSchemaService } from '@/services/llm/openApiSchemaService';

// Force Node.js runtime
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * DELETE /api/ui/agents/[agentId]/openapi-schemas/[schemaId]
 * Délie un schéma OpenAPI d'un agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string; schemaId: string } }
) {
  try {
    const { agentId, schemaId } = params;

    if (!agentId || !schemaId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID et Schema ID requis' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Supprimer la liaison
    const { error } = await supabase
      .from('agent_openapi_schemas')
      .delete()
      .eq('agent_id', agentId)
      .eq('openapi_schema_id', schemaId);

    if (error) {
      logger.error('[AgentOpenApiSchemas] ❌ Erreur suppression lien:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.info(`[AgentOpenApiSchemas] ✅ Schéma ${schemaId} délié de l'agent ${agentId}`);

    // ✅ CRITICAL FIX : Invalider le cache pour que le chat voit immédiatement le changement
    openApiSchemaService.invalidateCache();
    logger.dev(`[AgentOpenApiSchemas] 🔄 Cache invalidé après suppression du schéma`);

    return NextResponse.json({
      success: true,
      message: 'Schéma délié avec succès'
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

