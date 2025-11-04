import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { oauthService } from '@/services/oauthService';
import { getCurrentUser } from '@/middleware-utils/auth';
import { simpleLogger as logger } from '@/utils/logger';

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
    logger.dev('[Create-Code] Début requête POST');
    
    const body = await request.json();
    logger.dev('[Create-Code] Body reçu:', { 
      clientId: body.clientId, 
      userId: body.userId, 
      redirectUri: body.redirectUri,
      scopes: body.scopes 
    });
    
    const createCodeRequest = createCodeRequestSchema.parse(body);
    logger.dev('[Create-Code] Validation Zod réussie');
    
    // ✅ TOUJOURS exiger l'authentification, même pour ChatGPT
    const user = await getCurrentUser(request);
    logger.dev('[Create-Code] Utilisateur authentifié:', { id: user.id, email: user.email });
    
    // Vérifier que l'utilisateur correspond à celui demandé
    if (user.id !== createCodeRequest.userId) {
      logger.error('[Create-Code] ❌ ID utilisateur ne correspond pas:', { 
        requested: createCodeRequest.userId, 
        authenticated: user.id 
      });
      return NextResponse.json(
        { error: 'forbidden', error_description: 'Access denied' },
        { status: 403 }
      );
    }

    // Valider que le client OAuth existe et est actif
    const client = await oauthService.getClientById(createCodeRequest.clientId);
    logger.dev('[Create-Code] Client OAuth récupéré:', { 
      exists: !!client, 
      isActive: client?.is_active,
      name: client?.name 
    });
    
    if (!client || !client.is_active) {
      logger.error('[Create-Code] ❌ Client OAuth invalide ou inactif:', createCodeRequest.clientId);
      return NextResponse.json(
        { error: 'unauthorized_client', error_description: 'Invalid or inactive client ID' },
        { status: 400 }
      );
    }

    // Valider le redirect_uri
    const isValidRedirect = await oauthService.validateRedirectUri(createCodeRequest.clientId, createCodeRequest.redirectUri);
    logger.dev('[Create-Code] Validation redirect_uri:', { 
      redirectUri: createCodeRequest.redirectUri, 
      isValid: isValidRedirect 
    });
    
    if (!isValidRedirect) {
      logger.error('[Create-Code] ❌ Redirect URI invalide:', createCodeRequest.redirectUri);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Valider les scopes
    const isValidScopes = await oauthService.validateScopes(createCodeRequest.clientId, createCodeRequest.scopes);
    logger.dev('[Create-Code] Validation scopes:', { 
      requestedScopes: createCodeRequest.scopes, 
      isValid: isValidScopes 
    });
    
    if (!isValidScopes) {
      logger.error('[Create-Code] ❌ Scopes invalides:', createCodeRequest.scopes);
      return NextResponse.json(
        { error: 'invalid_scope', error_description: 'Invalid scopes requested' },
        { status: 400 }
      );
    }

    // Créer le code d'autorisation
    logger.dev('[Create-Code] Création du code d\'autorisation...');
    const code = await oauthService.createAuthorizationCode(
      createCodeRequest.clientId,
      createCodeRequest.userId,
      createCodeRequest.redirectUri,
      createCodeRequest.scopes,
      createCodeRequest.state
    );
    
    logger.dev('[Create-Code] ✅ Code OAuth créé:', { codeLength: code.length });

    return NextResponse.json({ code });

  } catch (error) {
    logger.error('[Create-Code] ❌ Erreur création code OAuth:', error);
    
    if (error instanceof z.ZodError) {
      logger.error('[Create-Code] ❌ Erreur validation Zod:', error.errors);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Access denied') {
      logger.error('[Create-Code] ❌ Accès refusé');
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
