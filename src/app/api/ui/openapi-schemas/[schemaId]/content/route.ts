import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/ui/openapi-schemas/[schemaId]/content
 * Récupère le contenu (JSON) d'un schéma OpenAPI par ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    const { schemaId } = await params;

    if (!schemaId) {
      return NextResponse.json(
        { success: false, error: 'Schema ID manquant' },
        { status: 400 }
      );
    }

    logger.dev(`[OpenAPI Schema Content] 📋 Récupération du schéma ${schemaId}`);

    const { data: schema, error } = await supabase
      .from('openapi_schemas')
      .select('id, name, content, status, api_key, header')
      .eq('id', schemaId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      logger.error('[OpenAPI Schema Content] ❌ Erreur Supabase:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Erreur lors de la récupération du schéma' },
        { status: 500 }
      );
    }

    if (!schema) {
      logger.dev(`[OpenAPI Schema Content] ⚠️ Schéma ${schemaId} non trouvé ou inactif`);
      return NextResponse.json(
        { success: false, error: 'Schéma non trouvé ou inactif' },
        { status: 404 }
      );
    }

    logger.dev(`[OpenAPI Schema Content] ✅ Schéma ${schema.name} récupéré`);

    return NextResponse.json({
      success: true,
      schema: {
        id: schema.id,
        name: schema.name,
        content: schema.content,
        api_key: schema.api_key || undefined,
        header: schema.header || undefined
      }
    });

  } catch (error) {
    logger.error('[OpenAPI Schema Content] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur interne du serveur' 
      },
      { status: 500 }
    );
  }
}

