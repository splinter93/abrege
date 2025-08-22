import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_folder_delete',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début suppression dossier v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.deleteFolder(ref, userId, context);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Dossier supprimé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Dossier supprimé avec succès'
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 