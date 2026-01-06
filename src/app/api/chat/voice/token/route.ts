/**
 * POST /api/chat/voice/token
 * 
 * Génère un token éphémère pour l'API XAI Voice
 * Le token éphémère permet une authentification sécurisée côté client
 */

import { NextRequest, NextResponse } from 'next/server';
import { SERVER_ENV } from '@/config/env.server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Réponse de l'API XAI pour le token éphémère
 * L'API peut retourner différents formats selon la version
 */
interface XAITokenResponse {
  client_secret?: string;
  expires_in?: number;
  value?: string; // Format alternatif pour le token
  token?: string; // Format alternatif pour le token
  expires_at?: number; // Timestamp Unix pour l'expiration
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'xai_voice_token',
    component: 'XAI_VOICE_API'
  };

  logApi.info('🚀 Génération token éphémère XAI Voice', context);

  try {
    // 🔐 Authentification utilisateur
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { error: authResult.error || 'Authentification requise' },
        { status: authResult.status || 401 }
      );
    }

    // ✅ Vérifier que XAI_API_KEY est configurée
    const xaiApiKey = SERVER_ENV.llm.xaiApiKey;
    if (!xaiApiKey) {
      logApi.error('❌ XAI_API_KEY non configurée', context);
      return NextResponse.json(
        { error: 'XAI_API_KEY non configurée côté serveur' },
        { status: 500 }
      );
    }

    // 📡 Appeler l'API XAI pour générer le token éphémère
    try {
      const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expires_after: {
            seconds: 300 // Token valide 5 minutes
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logApi.error('❌ Erreur API XAI', {
          ...context,
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return NextResponse.json(
          { error: `Erreur API XAI: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const tokenData = await response.json();
      
      // Debug: logger la réponse brute pour diagnostiquer
      logApi.info('🔍 Réponse brute XAI API', {
        ...context,
        responseKeys: Object.keys(tokenData),
        hasClientSecret: 'client_secret' in tokenData,
        responseSample: JSON.stringify(tokenData).substring(0, 200)
      });

      // XAI retourne "value" pour le token et "expires_at" (timestamp) pour l'expiration
      // Utiliser une assertion de type pour accéder aux propriétés optionnelles
      const tokenResponse = tokenData as XAITokenResponse;
      const clientSecret = tokenResponse.value || tokenResponse.client_secret || tokenResponse.token;
      const expiresAt = tokenResponse.expires_at;
      
      // Calculer expires_in en secondes à partir de expires_at (timestamp Unix)
      let expiresIn: number | undefined;
      if (expiresAt && typeof expiresAt === 'number') {
        expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      } else {
        expiresIn = (tokenData as XAITokenResponse).expires_in;
      }

      if (!clientSecret) {
        logApi.error('❌ Token non trouvé dans la réponse XAI', {
          ...context,
          responseData: tokenData
        });
        return NextResponse.json(
          { error: 'Format de réponse XAI inattendu', details: 'Token non trouvé' },
          { status: 500 }
        );
      }

      logApi.info('✅ Token éphémère généré avec succès', {
        ...context,
        expires_in: expiresIn,
        expires_at: expiresAt,
        executionTime: Date.now() - startTime
      });

      // Retourner la réponse dans le format attendu par le client
      // Le client attend client_secret, mais on retourne aussi les autres champs pour compatibilité
      return NextResponse.json({
        success: true,
        client_secret: clientSecret,
        value: clientSecret, // Format XAI original
        expires_in: expiresIn,
        expires_at: expiresAt
      });

    } catch (fetchError) {
      logApi.error('❌ Erreur lors de l\'appel API XAI', {
        ...context,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      });
      return NextResponse.json(
        { error: 'Erreur lors de la génération du token' },
        { status: 500 }
      );
    }

  } catch (error) {
    logApi.error('❌ Erreur inattendue', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

