import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/services/oauthService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    
    console.log('🧪 [Test OAuth] Test direct de l\'endpoint:', { clientId, redirectUri });
    
    if (!clientId || !redirectUri) {
      return NextResponse.json({
        error: 'Paramètres manquants',
        required: ['client_id', 'redirect_uri']
      }, { status: 400 });
    }

    // 1. Tester la récupération du client
    console.log('🧪 [Test OAuth] Test récupération client...');
    const client = await oauthService.getClientById(clientId);
    
    if (!client) {
      return NextResponse.json({
        error: 'Client OAuth non trouvé',
        clientId,
        availableClients: ['scrivia-custom-gpt']
      }, { status: 404 });
    }

    // 2. Tester la validation du redirect_uri
    console.log('🧪 [Test OAuth] Test validation redirect_uri...');
    const isValidRedirect = await oauthService.validateRedirectUri(clientId, redirectUri);
    
    if (!isValidRedirect) {
      return NextResponse.json({
        error: 'Redirect URI non autorisé',
        clientId,
        redirectUri,
        allowedRedirects: client.redirect_uris
      }, { status: 400 });
    }

    // 3. Tester la validation des scopes
    console.log('🧪 [Test OAuth] Test validation scopes...');
    const testScopes = ['notes:read', 'dossiers:read'];
    const isValidScopes = await oauthService.validateScopes(clientId, testScopes);
    
    if (!isValidScopes) {
      return NextResponse.json({
        error: 'Scopes non autorisés',
        clientId,
        requestedScopes: testScopes,
        allowedScopes: client.scopes
      }, { status: 400 });
    }

    // 4. Tester la création d'un code (sans authentification pour le test)
    console.log('🧪 [Test OAuth] Test création code...');
    try {
      const code = await oauthService.createAuthorizationCode(
        clientId,
        'test-user-id',
        redirectUri,
        testScopes,
        'test-state'
      );
      
      return NextResponse.json({
        success: true,
        message: 'Tous les tests OAuth sont passés avec succès',
        client: {
          id: client.id,
          name: client.name,
          is_active: client.is_active,
          scopes_count: client.scopes?.length || 0,
          redirect_uris_count: client.redirect_uris?.length || 0
        },
        validation: {
          client: '✅',
          redirect_uri: '✅',
          scopes: '✅',
          code_creation: '✅'
        },
        test_code: code ? 'Généré avec succès' : 'Échec de génération'
      });
      
    } catch (codeError) {
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la création du code',
        details: codeError instanceof Error ? codeError.message : 'Erreur inconnue',
        validation: {
          client: '✅',
          redirect_uri: '✅',
          scopes: '✅',
          code_creation: '❌'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🧪 [Test OAuth] Erreur générale:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
