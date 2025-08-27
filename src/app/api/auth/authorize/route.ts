import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { oauthService } from '@/services/oauthService';

// Schema de validation pour les paramètres d'autorisation OAuth
const authorizeRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Valider les paramètres OAuth
    const authorizeRequest = authorizeRequestSchema.parse({
      response_type: searchParams.get('response_type'),
      client_id: searchParams.get('client_id'),
      redirect_uri: searchParams.get('redirect_uri'),
      scope: searchParams.get('scope'),
      state: searchParams.get('state'),
    });

    // Vérifier que le client_id est valide et actif (sans valider le secret)
    const client = await oauthService.getClientById(authorizeRequest.client_id);
    if (!client) {
      return NextResponse.json(
        { error: 'unauthorized_client', error_description: 'Invalid client ID' },
        { status: 400 }
      );
    }

    // Vérifier que le redirect_uri est autorisé pour ce client
    const isValidRedirect = await oauthService.validateRedirectUri(authorizeRequest.client_id, authorizeRequest.redirect_uri);
    if (!isValidRedirect) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Construire l'URL de redirection vers la page de connexion Scrivia
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('client_id', authorizeRequest.client_id);
    loginUrl.searchParams.set('redirect_uri', authorizeRequest.redirect_uri);
    loginUrl.searchParams.set('scope', authorizeRequest.scope || '');
    if (authorizeRequest.state) {
      loginUrl.searchParams.set('state', authorizeRequest.state);
    }
    loginUrl.searchParams.set('response_type', 'code');

    // Rediriger vers la page de connexion
    return NextResponse.redirect(loginUrl);

  } catch (error) {
    console.error('OAuth authorize endpoint error:', error);
    
    if (error instanceof z.ZodError) {
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

// Les fonctions de validation sont maintenant gérées par le service OAuth

/**
 * Endpoint OPTIONS pour le CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
