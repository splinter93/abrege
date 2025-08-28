import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/services/apiKeyService';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

/**
 * GET /api/v2/api-keys
 * Liste toutes les API Keys de l'utilisateur authentifié
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'v2_list_api_keys',
    component: 'API_V2'
  };

  logApi.info(`🚀 Début récupération API Keys v2`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    
    // 📋 Lister les API Keys de l'utilisateur
    const apiKeys = await ApiKeyService.listUserApiKeys(userId);
    
    logApi.info(`✅ API Keys récupérées: ${apiKeys.length}`, context);
    
    return NextResponse.json({
      success: true,
      api_keys: apiKeys
    });

  } catch (error) {
    logApi.error(`❌ Erreur récupération API Keys: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des API Keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/api-keys
 * Crée une nouvelle API Key pour l'utilisateur authentifié
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'v2_create_api_key',
    component: 'API_V2'
  };

  logApi.info(`🚀 Début création API Key v2`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    
    // 📝 Parser le body de la requête
    const body = await request.json();
    const { api_key_name, scopes, expires_at } = body;
    
    // ✅ Validation des paramètres
    if (!api_key_name || typeof api_key_name !== 'string') {
      return NextResponse.json(
        { error: 'Nom de l\'API Key requis' },
        { status: 400 }
      );
    }
    
    // 🔑 Créer la nouvelle API Key
    const result = await ApiKeyService.createApiKey({
      user_id: userId,
      api_key_name,
      scopes,
      expires_at
    });
    
    logApi.info(`✅ API Key créée: ${result.info.api_key_name}`, context);
    
    return NextResponse.json({
      success: true,
      api_key: result.apiKey, // ⚠️ Retourner la clé une seule fois !
      info: {
        api_key_name: result.info.api_key_name,
        scopes: result.info.scopes,
        expires_at: result.info.expires_at
      }
    });

  } catch (error) {
    logApi.error(`❌ Erreur création API Key: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'API Key' },
      { status: 500 }
    );
  }
}
