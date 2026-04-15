import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { updateNoteV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { resolveNoteAccess } from '@/utils/database/shareAccessService';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début mise à jour note v2 ${ref}`);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.error(`❌ Authentification échouée: ${authResult.error}`);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // Résoudre et vérifier l'accès en écriture
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const access = await resolveNoteAccess(resolveResult.id, userId);
    if (!access) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (access.permissionLevel !== 'write') {
      return NextResponse.json(
        { error: 'Accès lecture seule' },
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = await request.json();

    // Validation Zod V2
    const validationResult = validatePayload(updateNoteV2Schema, body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const validatedData = validationResult.data;

    // Passer ownerId pour que la mutation filtre sur le bon user_id
    const result = await V2DatabaseUtils.updateNote(ref, validatedData, userId, context, access.ownerId);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Note mise à jour en ${apiTime}ms`);

    // 🎯 Le polling ciblé est maintenant géré côté client par V2UnifiedApi

    return NextResponse.json({
      success: true,
      message: 'Note mise à jour avec succès',
      note: result.data
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.error(`❌ Erreur serveur: ${error}`);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 