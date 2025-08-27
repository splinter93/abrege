import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { oauthService } from '@/services/oauthService';
import { getCurrentUser } from '@/middleware/auth';

// Schema de validation pour la création de code
const createCodeRequestSchema = z.object({
  clientId: z.string().min(1),
  userId: z.string().uuid(),
  redirectUri: z.string().url(),
  scopes: z.array(z.string()),
  state: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const createCodeRequest = createCodeRequestSchema.parse(body);
    
    // CAS SPÉCIAL CHATGPT : Pas d'authentification stricte
    const isChatGPT = createCodeRequest.clientId === 'scrivia-custom-gpt';
    
    if (!isChatGPT) {
      // Vérifier l'authentification de l'utilisateur pour les autres clients
      const user = await getCurrentUser(request);
      
      // Vérifier que l'utilisateur correspond à celui demandé
      if (user.id !== createCodeRequest.userId) {
        return NextResponse.json(
          { error: 'forbidden', error_description: 'Access denied' },
          { status: 403 }
        );
      }
    } else {
      console.log('🤖 Requête ChatGPT détectée, authentification contournée');
    }

    // Valider que le client OAuth existe et est actif
    const client = await oauthService.getClientById(createCodeRequest.clientId);
    if (!client || !client.is_active) {
      return NextResponse.json(
        { error: 'unauthorized_client', error_description: 'Invalid or inactive client ID' },
        { status: 400 }
      );
    }

    // Valider le redirect_uri
    const isValidRedirect = await oauthService.validateRedirectUri(createCodeRequest.clientId, createCodeRequest.redirectUri);
    if (!isValidRedirect) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Valider les scopes
    const isValidScopes = await oauthService.validateScopes(createCodeRequest.clientId, createCodeRequest.scopes);
    if (!isValidScopes) {
      return NextResponse.json(
        { error: 'invalid_scope', error_description: 'Invalid scopes requested' },
        { status: 400 }
      );
    }

    // Créer le code d'autorisation
    const code = await oauthService.createAuthorizationCode(
      createCodeRequest.clientId,
      createCodeRequest.userId,
      createCodeRequest.redirectUri,
      createCodeRequest.scopes,
      createCodeRequest.state
    );

    return NextResponse.json({ code });

  } catch (error) {
    console.error('Erreur création code OAuth:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'forbidden', error_description: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
