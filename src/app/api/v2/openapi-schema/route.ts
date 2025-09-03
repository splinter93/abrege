import { NextRequest, NextResponse } from 'next/server';
import { getOpenAPISchemaService } from '@/services/openApiSchemaService';

/**
 * Endpoint pour exposer le schéma OpenAPI V2
 * GET /api/v2/openapi-schema
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[OpenAPI Schema API] 🔧 Demande du schéma OpenAPI V2');
    
    // Charger le schéma depuis le service
    const schemaService = getOpenAPISchemaService();
    const schema = schemaService.getSchema();
    
    console.log(`[OpenAPI Schema API] ✅ Schéma fourni: ${schema.info.title} v${schema.info.version}`);
    
    // Retourner le schéma avec les bons headers
    return NextResponse.json(schema, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache 1 heure
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('[OpenAPI Schema API] ❌ Erreur:', error);
    
    return NextResponse.json(
      {
        error: 'Erreur lors du chargement du schéma OpenAPI V2',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

/**
 * OPTIONS pour CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
