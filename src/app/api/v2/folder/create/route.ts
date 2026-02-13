import { NextRequest, NextResponse } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';
import { createFolderV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, extractTokenFromRequest } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { folderCreateRateLimiter } from '@/services/rateLimiter';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_create',
    component: 'API_V2',
    clientType
  };

  logger.info(LogCategory.API, '🚀 Début création dossier v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logger.error(LogCategory.API, `❌ Authentification échouée: ${authResult.error}`, authResult);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  // ✅ Rate limiting par utilisateur
  const rateLimit = await folderCreateRateLimiter.check(userId);
  if (!rateLimit.allowed) {
    logger.warn(LogCategory.API, '[Folder Create] ⛔ Rate limit dépassé', {
      userId: userId.substring(0, 8) + '...',
      limit: rateLimit.limit,
      resetTime: rateLimit.resetTime
    });

    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Vous avez atteint la limite de ${rateLimit.limit} créations de dossiers par minute. Veuillez réessayer dans ${retryAfter} secondes.`,
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          'Retry-After': retryAfter.toString()
        }
      }
    );
  }
  
  // 🔧 CORRECTION: Créer le client Supabase authentifié
  const userToken = extractTokenFromRequest(request);
  const supabase = createAuthenticatedSupabaseClient(authResult, userToken || undefined);

  try {
    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(createFolderV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.createFolder(validatedData, userId, context, supabase);

    const apiTime = Date.now() - startTime;
    logger.info(LogCategory.API, `✅ Dossier créé en ${apiTime}ms`, context);

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    return NextResponse.json({
      success: true,
      message: 'Dossier créé avec succès',
      folder: result.data
    });

  } catch (err: unknown) {
    const error = err as Error;
    logger.error(LogCategory.API, `❌ Erreur serveur: ${error}`, error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 