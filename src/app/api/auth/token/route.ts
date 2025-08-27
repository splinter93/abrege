import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { oauthService } from '@/services/oauthService';

// Schema de validation pour la requête OAuth
const tokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  redirect_uri: z.string().url(),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

// Schema de validation pour la réponse OAuth
const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export async function POST(request: NextRequest) {
  console.log('🔍 [TOKEN] Début traitement requête token OAuth');
  
  try {
    // Vérifier que la requête est en JSON
    const contentType = request.headers.get('content-type');
    console.log('🔍 [TOKEN] Content-Type reçu:', contentType);
    
    if (!contentType || !contentType.includes('application/x-www-form-urlencoded')) {
      console.log('❌ [TOKEN] Content-Type invalide, attendu: application/x-www-form-urlencoded');
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Content-Type must be application/x-www-form-urlencoded' },
        { status: 400 }
      );
    }

    // Parser le body form-encoded
    const body = await request.text();
    console.log('🔍 [TOKEN] Body reçu:', body);
    
    const params = new URLSearchParams(body);
    console.log('🔍 [TOKEN] Paramètres parsés:', {
      grant_type: params.get('grant_type'),
      code: params.get('code') ? 'PRÉSENT' : 'MANQUANT',
      redirect_uri: params.get('redirect_uri'),
      client_id: params.get('client_id'),
      client_secret: params.get('client_secret') ? 'PRÉSENT' : 'MANQUANT'
    });
    
    // Valider les paramètres OAuth
    const tokenRequest = tokenRequestSchema.parse({
      grant_type: params.get('grant_type'),
      code: params.get('code'),
      redirect_uri: params.get('redirect_uri'),
      client_id: params.get('client_id'),
      client_secret: params.get('client_secret'),
    });
    
    console.log('✅ [TOKEN] Paramètres validés avec succès');

    // Vérifier les credentials client
    console.log('🔍 [TOKEN] Vérification des credentials client...');
    const client = await oauthService.validateClientCredentials(tokenRequest.client_id, tokenRequest.client_secret);
    if (!client) {
      console.log('❌ [TOKEN] Credentials client invalides');
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client credentials' },
        { status: 401 }
      );
    }
    console.log('✅ [TOKEN] Credentials client validés');

    try {
      // Échanger le code contre un token OAuth
      console.log('🔍 [TOKEN] Début échange code contre token...');
      const tokenResponse = await oauthService.exchangeCodeForToken(
        tokenRequest.code,
        tokenRequest.client_id,
        tokenRequest.client_secret,
        tokenRequest.redirect_uri
      );
      console.log('✅ [TOKEN] Échange réussi, validation de la réponse...');

      // Valider la réponse avec le schema
      const validatedResponse = tokenResponseSchema.parse(tokenResponse);
      console.log('✅ [TOKEN] Réponse validée, envoi du token...');

      // Retourner le token avec les headers appropriés
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
        },
      });

    } catch (exchangeError) {
      console.error('❌ [TOKEN] Erreur lors de l\'échange:', exchangeError);
      console.error('❌ [TOKEN] Stack trace:', exchangeError instanceof Error ? exchangeError.stack : 'Pas de stack trace');
      return NextResponse.json(
        { error: 'server_error', error_description: 'Internal server error during token exchange' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [TOKEN] Erreur générale:', error);
    console.error('❌ [TOKEN] Type d\'erreur:', error.constructor.name);
    console.error('❌ [TOKEN] Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    
    if (error instanceof z.ZodError) {
      console.log('❌ [TOKEN] Erreur de validation Zod:', error.errors);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

// La validation des credentials est maintenant gérée par le service OAuth

/**
 * Endpoint OPTIONS pour le CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
