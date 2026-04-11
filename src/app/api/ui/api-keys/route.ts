import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiKeyService } from '@/services/apiKeyService';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

const patchApiKeySchema = z
  .object({
    id: z.string().min(1),
    api_key_name: z.string().min(1).max(200).optional(),
    scopes: z.array(z.string()).min(1).optional(),
  })
  .refine((d) => d.api_key_name !== undefined || d.scopes !== undefined, {
    message: 'Fournir api_key_name et/ou scopes',
  });

/**
 * GET /api/ui/api-keys
 * Liste toutes les API Keys de l'utilisateur authentifié
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'ui_list_api_keys',
    component: 'API_UI'
  };

  logApi.info(`🚀 Début récupération API Keys UI`, context);

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
 * POST /api/ui/api-keys
 * Crée une nouvelle API Key pour l'utilisateur authentifié
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'ui_create_api_key',
    component: 'API_UI'
  };

  logApi.info(`🚀 Début création API Key UI`, context);

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

/**
 * PATCH /api/ui/api-keys
 * Met à jour le nom et/ou les scopes d'une clé existante.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'ui_patch_api_key',
    component: 'API_UI',
  };

  logApi.info(`🚀 Début mise à jour API Key UI`, context);

  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const body = await request.json();
    const parsed = patchApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().formErrors.join(' ') || 'Payload invalide' },
        { status: 400 }
      );
    }

    const { id, api_key_name, scopes } = parsed.data;
    await ApiKeyService.updateUserApiKey(userId, id, { api_key_name, scopes });

    logApi.info(`✅ API Key mise à jour: ${id}`, context);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logApi.error(`❌ Erreur mise à jour API Key: ${msg}`, context);
    return NextResponse.json(
      { error: msg.includes('API Key') ? msg : 'Erreur lors de la mise à jour de l\'API Key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ui/api-keys?id=<uuid>
 * Supprime une clé appartenant à l'utilisateur authentifié.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'ui_delete_api_key',
    component: 'API_UI',
  };

  logApi.info(`🚀 Début suppression API Key UI`, context);

  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !id.trim()) {
      return NextResponse.json({ error: 'Paramètre id requis' }, { status: 400 });
    }

    await ApiKeyService.deleteUserApiKeyById(userId, id.trim());

    logApi.info(`✅ API Key supprimée: ${id}`, context);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logApi.error(`❌ Erreur suppression API Key: ${msg}`, context);
    return NextResponse.json(
      { error: msg.includes('API Key') ? msg : 'Erreur lors de la suppression de l\'API Key' },
      { status: 500 }
    );
  }
}
