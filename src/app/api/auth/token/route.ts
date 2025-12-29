import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { oauthService } from '@/services/oauthService';
import { logApi } from '@/utils/logger';

// Schema de validation pour l'échange initial code → token
const authorizationCodeSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  redirect_uri: z.string().url(),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

// Schema de validation pour le refresh token
const refreshTokenSchema = z.object({
  grant_type: z.literal('refresh_token'),
  refresh_token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

// Schema de validation unifié pour la requête OAuth (non utilisé actuellement)
// const tokenRequestSchema = z.union([authorizationCodeSchema, refreshTokenSchema]);

// Schema de validation pour la réponse OAuth
const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export async function POST(request: NextRequest) {
  logApi.info('🔍 [TOKEN] Début traitement requête token OAuth');
  
  try {
    // Vérifier que la requête est en form-encoded
    const contentType = request.headers.get('content-type');
    logApi.debug('🔍 [TOKEN] Content-Type reçu', { contentType });
    
    if (!contentType || !contentType.includes('application/x-www-form-urlencoded')) {
      logApi.warn('❌ [TOKEN] Content-Type invalide', { 
        received: contentType,
        expected: 'application/x-www-form-urlencoded'
      });
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Content-Type must be application/x-www-form-urlencoded' },
        { status: 400 }
      );
    }

    // Parser le body form-encoded
    const body = await request.text();
    // ⚠️ Ne pas logger le body complet (peut contenir des secrets)
    logApi.debug('🔍 [TOKEN] Body reçu', { bodyLength: body.length });
    
    const params = new URLSearchParams(body);
    const grantType = params.get('grant_type');
    
    logApi.debug('🔍 [TOKEN] Paramètres parsés', {
      grant_type: grantType,
      hasCode: !!params.get('code'),
      hasRefreshToken: !!params.get('refresh_token'),
      hasRedirectUri: !!params.get('redirect_uri'),
      hasClientId: !!params.get('client_id'),
      hasClientSecret: !!params.get('client_secret')
    });
    
    // Valider les paramètres OAuth selon le grant_type
    let tokenRequest;
    if (grantType === 'authorization_code') {
      tokenRequest = authorizationCodeSchema.parse({
        grant_type: params.get('grant_type'),
        code: params.get('code'),
        redirect_uri: params.get('redirect_uri'),
        client_id: params.get('client_id'),
        client_secret: params.get('client_secret'),
      });
    } else if (grantType === 'refresh_token') {
      tokenRequest = refreshTokenSchema.parse({
        grant_type: params.get('grant_type'),
        refresh_token: params.get('refresh_token'),
        client_id: params.get('client_id'),
        client_secret: params.get('client_secret'),
      });
    } else {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Unsupported grant type' },
        { status: 400 }
      );
    }
    
    logApi.debug('✅ [TOKEN] Paramètres validés avec succès');

    // Vérifier les credentials client
    logApi.debug('🔍 [TOKEN] Vérification des credentials client');
    const client = await oauthService.validateClientCredentials(tokenRequest.client_id, tokenRequest.client_secret);
    if (!client) {
      logApi.warn('❌ [TOKEN] Credentials client invalides', {
        clientId: tokenRequest.client_id
      });
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client credentials' },
        { status: 401 }
      );
    }
    logApi.debug('✅ [TOKEN] Credentials client validés');

    try {
      let tokenResponse;

      if (grantType === 'authorization_code') {
        // Échanger le code contre un token OAuth
        logApi.debug('🔍 [TOKEN] Début échange code contre token');
        // Type guard : on sait que tokenRequest est de type authorizationCodeSchema
        const authRequest = authorizationCodeSchema.parse(tokenRequest);
        tokenResponse = await oauthService.exchangeCodeForToken(
          authRequest.code,
          authRequest.client_id,
          authRequest.client_secret,
          authRequest.redirect_uri
        );
        logApi.info('✅ [TOKEN] Échange code→token réussi');
      } else if (grantType === 'refresh_token') {
        // Rafraîchir le token avec le refresh token
        logApi.debug('🔍 [TOKEN] Début refresh token');
        // Type guard : on sait que tokenRequest est de type refreshTokenSchema
        const refreshRequest = refreshTokenSchema.parse(tokenRequest);
        tokenResponse = await oauthService.refreshAccessToken(
          refreshRequest.refresh_token,
          refreshRequest.client_id,
          refreshRequest.client_secret
        );
        logApi.info('✅ [TOKEN] Refresh token réussi');
      }

      // Valider la réponse avec le schema
      const validatedResponse = tokenResponseSchema.parse(tokenResponse);
      logApi.debug('✅ [TOKEN] Réponse validée, envoi du token');

      // Retourner le token avec les headers appropriés
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
        },
      });

    } catch (exchangeError) {
      logApi.error('❌ [TOKEN] Erreur lors de l\'échange/refresh', exchangeError);
      
      // Gérer les erreurs spécifiques OAuth
      if (exchangeError instanceof Error) {
        if (exchangeError.message === 'invalid_grant') {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Invalid or expired authorization code/refresh token' },
            { status: 400 }
          );
        }
        if (exchangeError.message === 'invalid_client') {
          return NextResponse.json(
            { error: 'invalid_client', error_description: 'Invalid client credentials' },
            { status: 401 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'server_error', error_description: 'Internal server error during token exchange/refresh' },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    logApi.error('❌ [TOKEN] Erreur générale', error);
    
    if (error instanceof z.ZodError) {
      logApi.warn('❌ [TOKEN] Erreur de validation Zod', {
        errors: error.errors.map(e => ({ path: e.path, message: e.message }))
      });
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
