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
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  console.log('🚀 [Create-Code] Début création code OAuth:', {
    clientType,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer')
  });

  try {
    const body = await request.json();
    console.log('📋 [Create-Code] Body reçu:', body);
    
    const createCodeRequest = createCodeRequestSchema.parse(body);
    console.log('✅ [Create-Code] Validation Zod réussie:', createCodeRequest);
    
    // CAS SPÉCIAL CHATGPT : Pas d'authentification stricte
    const isChatGPT = createCodeRequest.clientId === 'scrivia-custom-gpt';
    console.log('🤖 [Create-Code] Type de client:', { isChatGPT, clientId: createCodeRequest.clientId });
    
    if (!isChatGPT) {
      // Vérifier l'authentification de l'utilisateur pour les autres clients
      const user = await getCurrentUser(request);
      console.log('👤 [Create-Code] Utilisateur authentifié:', { userId: user?.id, requestedUserId: createCodeRequest.userId });
      
      // Vérifier que l'utilisateur correspond à celui demandé
      if (user.id !== createCodeRequest.userId) {
        console.error('❌ [Create-Code] Accès refusé - userId mismatch:', { user: user?.id, requested: createCodeRequest.userId });
        return NextResponse.json(
          { error: 'forbidden', error_description: 'Access denied' },
          { status: 403 }
        );
      }
    } else {
      console.log('🤖 [Create-Code] Requête ChatGPT détectée, authentification contournée');
    }

    // Valider que le client OAuth existe et est actif
    console.log('🔍 [Create-Code] Validation du client OAuth:', createCodeRequest.clientId);
    const client = await oauthService.getClientById(createCodeRequest.clientId);
    console.log('🔍 [Create-Code] Client trouvé:', { client: client ? { id: client.id, is_active: client.is_active } : null });
    
    if (!client || !client.is_active) {
      console.error('❌ [Create-Code] Client invalide ou inactif:', { clientId: createCodeRequest.clientId, client });
      return NextResponse.json(
        { error: 'unauthorized_client', error_description: 'Invalid or inactive client ID' },
        { status: 400 }
      );
    }

    // Valider le redirect_uri
    console.log('🔍 [Create-Code] Validation redirect_uri:', createCodeRequest.redirectUri);
    const isValidRedirect = await oauthService.validateRedirectUri(createCodeRequest.clientId, createCodeRequest.redirectUri);
    console.log('🔍 [Create-Code] Redirect_uri valide:', isValidRedirect);
    
    if (!isValidRedirect) {
      console.error('❌ [Create-Code] Redirect_uri invalide:', createCodeRequest.redirectUri);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Valider les scopes
    console.log('🔍 [Create-Code] Validation des scopes:', createCodeRequest.scopes);
    const isValidScopes = await oauthService.validateScopes(createCodeRequest.clientId, createCodeRequest.scopes);
    console.log('🔍 [Create-Code] Scopes valides:', isValidScopes);
    
    if (!isValidScopes) {
      console.error('❌ [Create-Code] Scopes invalides:', createCodeRequest.scopes);
      return NextResponse.json(
        { error: 'invalid_scope', error_description: 'Invalid scopes requested' },
        { status: 400 }
      );
    }

    // Créer le code d'autorisation
    console.log('🚀 [Create-Code] Création du code d\'autorisation...');
    const code = await oauthService.createAuthorizationCode(
      createCodeRequest.clientId,
      createCodeRequest.userId,
      createCodeRequest.redirectUri,
      createCodeRequest.scopes,
      createCodeRequest.state
    );
    
    const apiTime = Date.now() - startTime;
    console.log('✅ [Create-Code] Code OAuth créé avec succès en', apiTime, 'ms:', { 
      code: code ? `${code.substring(0, 8)}...` : null,
      clientId: createCodeRequest.clientId,
      userId: createCodeRequest.userId
    });

    return NextResponse.json({ code });

  } catch (error) {
    const apiTime = Date.now() - startTime;
    console.error(`❌ [Create-Code] Erreur création code OAuth en ${apiTime}ms:`, error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ [Create-Code] Erreur de validation Zod:', error.errors);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Access denied') {
      console.error('❌ [Create-Code] Accès refusé:', error.message);
      return NextResponse.json(
        { error: 'forbidden', error_description: 'Access denied' },
        { status: 500 }
      );
    }

    console.error('❌ [Create-Code] Erreur serveur inattendue:', error);
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
