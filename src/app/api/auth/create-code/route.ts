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
    console.log('🔍 [Create-Code] ===== DÉBUT REQUÊTE POST =====');
    
    // ✅ LOGS COMPLETS : Capturer tous les headers et détails de la requête
    console.log('🔍 [Create-Code] URL complète:', request.url);
    console.log('🔍 [Create-Code] Méthode:', request.method);
    console.log('🔍 [Create-Code] Headers reçus:');
    
    // Lister tous les headers
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('🔍 [Create-Code] Headers complets:', JSON.stringify(allHeaders, null, 2));
    
    // Vérifier spécifiquement l'Authorization
    const authHeader = request.headers.get('authorization');
    console.log('🔍 [Create-Code] Header Authorization:', authHeader ? `"${authHeader}"` : 'ABSENT');
    
    if (authHeader) {
      console.log('🔍 [Create-Code] Type Authorization:', authHeader.startsWith('Bearer ') ? 'Bearer Token' : 'Autre format');
      console.log('🔍 [Create-Code] Longueur token:', authHeader.replace('Bearer ', '').length);
    }
    
    // Capturer le body complet
    const body = await request.json();
    console.log('🔍 [Create-Code] Body complet reçu:', JSON.stringify(body, null, 2));
    
    const createCodeRequest = createCodeRequestSchema.parse(body);
    console.log('🔍 [Create-Code] Validation Zod réussie');
    
    // ✅ TOUJOURS exiger l'authentification, même pour ChatGPT
    console.log('🔍 [Create-Code] Tentative d\'authentification...');
    const user = await getCurrentUser(request);
    console.log('🔍 [Create-Code] Utilisateur authentifié:', { id: user.id, email: user.email });
    
    // Vérifier que l'utilisateur correspond à celui demandé
    if (user.id !== createCodeRequest.userId) {
      console.error('❌ [Create-Code] ID utilisateur ne correspond pas:', { 
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
    console.log('🔍 [Create-Code] Client OAuth récupéré:', { 
      exists: !!client, 
      isActive: client?.is_active,
      name: client?.name 
    });
    
    if (!client || !client.is_active) {
      console.error('❌ [Create-Code] Client OAuth invalide ou inactif:', createCodeRequest.clientId);
      return NextResponse.json(
        { error: 'unauthorized_client', error_description: 'Invalid or inactive client ID' },
        { status: 400 }
      );
    }

    // Valider le redirect_uri
    const isValidRedirect = await oauthService.validateRedirectUri(createCodeRequest.clientId, createCodeRequest.redirectUri);
    console.log('🔍 [Create-Code] Validation redirect_uri:', { 
      redirectUri: createCodeRequest.redirectUri, 
      isValid: isValidRedirect 
    });
    
    if (!isValidRedirect) {
      console.error('❌ [Create-Code] Redirect URI invalide:', createCodeRequest.redirectUri);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Valider les scopes
    const isValidScopes = await oauthService.validateScopes(createCodeRequest.clientId, createCodeRequest.scopes);
    console.log('🔍 [Create-Code] Validation scopes:', { 
      requestedScopes: createCodeRequest.scopes, 
      isValid: isValidScopes 
    });
    
    if (!isValidScopes) {
      console.error('❌ [Create-Code] Scopes invalides:', createCodeRequest.scopes);
      return NextResponse.json(
        { error: 'invalid_scope', error_description: 'Invalid scopes requested' },
        { status: 400 }
      );
    }

    // Créer le code d'autorisation
    console.log('🔍 [Create-Code] Création du code d\'autorisation...');
    const code = await oauthService.createAuthorizationCode(
      createCodeRequest.clientId,
      createCodeRequest.userId,
      createCodeRequest.redirectUri,
      createCodeRequest.scopes,
      createCodeRequest.state
    );
    
    console.log('✅ [Create-Code] Code OAuth créé avec succès:', { codeLength: code.length });
    console.log('🔍 [Create-Code] ===== FIN REQUÊTE POST =====');

    return NextResponse.json({ code });

  } catch (error) {
    console.error('❌ [Create-Code] ===== ERREUR REQUÊTE POST =====');
    console.error('❌ [Create-Code] Erreur création code OAuth:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ [Create-Code] Erreur de validation Zod:', error.errors);
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Access denied') {
      console.error('❌ [Create-Code] Accès refusé');
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
