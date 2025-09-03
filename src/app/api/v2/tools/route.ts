import { NextRequest, NextResponse } from 'next/server';
import { getOpenAPIV2Tools } from '@/services/openApiToolsGenerator';

/**
 * Endpoint pour exposer les tools OpenAPI V2 pour les LLMs
 * GET /api/v2/tools
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[OpenAPI Tools API] 🔧 Demande des tools OpenAPI V2');
    
    // Générer les tools depuis le schéma OpenAPI V2
    const tools = getOpenAPIV2Tools();
    
    console.log(`[OpenAPI Tools API] ✅ ${tools.length} tools générés`);
    
    // Retourner les tools avec les bons headers
    return NextResponse.json({
      success: true,
      tools,
      count: tools.length,
      generated_at: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800', // Cache 30 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('[OpenAPI Tools API] ❌ Erreur:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la génération des tools OpenAPI V2',
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
