import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { z } from 'zod';

// Schéma de validation pour les paramètres d'apparence
const appearanceUpdateSchema = z.object({
  header_title_in_image: z.boolean().optional(),
  header_image: z.string().url('header_image doit être une URL valide').nullable().optional(),
  header_image_offset: z.number().min(0).max(100).optional(),
  header_image_blur: z.number().int().min(0).max(20).optional(),
  header_image_overlay: z.number().int().min(0).max(5).optional(),
  wide_mode: z.boolean().optional(),
  font_family: z.string().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_note_appearance_update',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_note_appearance_update', `🚀 Début mise à jour apparence note v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_note_appearance_update', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    const body = await request.json();

    // Validation Zod
    const validationResult = appearanceUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      logApi('v2_note_appearance_update', '❌ Validation échouée', context);
      return NextResponse.json(
        { error: 'Payload invalide', details: validationResult.error.errors.map(e => e.message) },
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const validatedData = validationResult.data;

    // Utiliser V2DatabaseUtils pour l'accès direct à la base de données
    const result = await V2DatabaseUtils.updateNote(ref, validatedData, userId, context);

    const apiTime = Date.now() - startTime;
    logApi('v2_note_appearance_update', `✅ Apparence note mise à jour en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Apparence de la note mise à jour avec succès',
      note: result.note
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_note_appearance_update', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 