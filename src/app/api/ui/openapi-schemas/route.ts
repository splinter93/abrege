import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/ui/openapi-schemas
 * Liste tous les schémas OpenAPI disponibles
 */
export async function GET(request: NextRequest) {
  try {
    logger.dev('[OpenAPI Schemas API] 📋 Récupération des schémas disponibles');

    // Récupérer tous les schémas actifs
    const { data: schemas, error } = await supabase
      .from('openapi_schemas')
      .select('id, name, description, version, status, tags, created_at, updated_at')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      logger.error('[OpenAPI Schemas API] ❌ Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des schémas' },
        { status: 500 }
      );
    }

    logger.dev(`[OpenAPI Schemas API] ✅ ${schemas?.length || 0} schémas trouvés`);

    return NextResponse.json({
      success: true,
      schemas: schemas || []
    });

  } catch (error) {
    logger.error('[OpenAPI Schemas API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ui/openapi-schemas
 * Créer ou mettre à jour un schéma OpenAPI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, version, content, tags } = body;

    logger.dev('[OpenAPI Schemas API] 📝 Création/mise à jour de schéma:', { name, version });

    // Validation
    if (!name || !content) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['name', 'content'] },
        { status: 400 }
      );
    }

    // Vérifier si le schéma existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('openapi_schemas')
      .select('id, name, version')
      .eq('name', name)
      .maybeSingle();

    if (checkError) {
      logger.error('[OpenAPI Schemas API] ❌ Erreur vérification:', checkError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    if (existing) {
      // Mettre à jour
      logger.dev(`[OpenAPI Schemas API] 🔄 Mise à jour du schéma existant: ${existing.id}`);

      const { data: updated, error: updateError } = await supabase
        .from('openapi_schemas')
        .update({
          description,
          version: version || existing.version,
          content,
          tags: tags || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error('[OpenAPI Schemas API] ❌ Erreur mise à jour:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour' },
          { status: 500 }
        );
      }

      logger.dev('[OpenAPI Schemas API] ✅ Schéma mis à jour');

      return NextResponse.json({
        success: true,
        schema: updated,
        action: 'updated'
      });

    } else {
      // Créer
      logger.dev('[OpenAPI Schemas API] ➕ Création d\'un nouveau schéma');

      const { data: created, error: createError } = await supabase
        .from('openapi_schemas')
        .insert({
          name,
          description: description || '',
          version: version || '1.0.0',
          content,
          status: 'active',
          tags: tags || []
        })
        .select()
        .single();

      if (createError) {
        logger.error('[OpenAPI Schemas API] ❌ Erreur création:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création' },
          { status: 500 }
        );
      }

      logger.dev('[OpenAPI Schemas API] ✅ Schéma créé:', created.id);

      return NextResponse.json({
        success: true,
        schema: created,
        action: 'created'
      }, { status: 201 });
    }

  } catch (error) {
    logger.error('[OpenAPI Schemas API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ui/openapi-schemas/:id
 * Supprimer un schéma OpenAPI
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const schemaId = url.searchParams.get('id');

    if (!schemaId) {
      return NextResponse.json(
        { error: 'ID du schéma manquant' },
        { status: 400 }
      );
    }

    logger.dev('[OpenAPI Schemas API] 🗑️ Suppression du schéma:', schemaId);

    // Vérifier qu'aucun agent n'utilise ce schéma
    const { data: agentsUsing, error: checkError } = await supabase
      .from('agents')
      .select('id, display_name')
      .eq('openapi_schema_id', schemaId);

    if (checkError) {
      logger.error('[OpenAPI Schemas API] ❌ Erreur vérification agents:', checkError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    if (agentsUsing && agentsUsing.length > 0) {
      logger.warn('[OpenAPI Schemas API] ⚠️ Schéma utilisé par des agents:', agentsUsing);
      return NextResponse.json(
        { 
          error: 'Ce schéma est utilisé par des agents',
          agents: agentsUsing
        },
        { status: 409 }
      );
    }

    // Archiver au lieu de supprimer (soft delete)
    const { error: deleteError } = await supabase
      .from('openapi_schemas')
      .update({ status: 'archived' })
      .eq('id', schemaId);

    if (deleteError) {
      logger.error('[OpenAPI Schemas API] ❌ Erreur suppression:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    logger.dev('[OpenAPI Schemas API] ✅ Schéma archivé');

    return NextResponse.json({
      success: true,
      message: 'Schéma archivé avec succès'
    });

  } catch (error) {
    logger.error('[OpenAPI Schemas API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

