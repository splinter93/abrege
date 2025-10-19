/**
 * API Routes pour la gestion d'un prompt spécifique
 * @module api/editor-prompts/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import { isValidIcon } from '@/utils/iconMapper';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Schéma de validation pour la mise à jour d'un prompt
 */
const updatePromptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt_template: z.string().min(1).optional(),
  icon: z.string().refine((icon) => isValidIcon(icon), {
    message: 'Icône invalide'
  }).optional(),
  agent_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  // Nouveaux champs pour insertion flexible et structured outputs
  insertion_mode: z.enum(['replace', 'append', 'prepend']).optional(),
  use_structured_output: z.boolean().optional(),
  output_schema: z.any().nullable().optional() // JSONB, pas de validation stricte côté Zod
});

/**
 * PATCH /api/editor-prompts/[id]
 * Met à jour un prompt existant
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promptId = params.id;
    const body = await request.json();

    // Validation
    const validationResult = updatePromptSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    logger.info(`[Editor Prompts API] 🔄 PATCH mise à jour prompt: ${promptId}`);

    // Vérifier que le prompt existe
    const { data: existingPrompt, error: fetchError } = await supabase
      .from('editor_prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (fetchError || !existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour le prompt
    const { data: updatedPrompt, error: updateError } = await supabase
      .from('editor_prompts')
      .update(data)
      .eq('id', promptId)
      .select()
      .single();

    if (updateError) {
      logger.error('[Editor Prompts API] ❌ Erreur mise à jour prompt:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du prompt' },
        { status: 500 }
      );
    }

    logger.info(`[Editor Prompts API] ✅ Prompt mis à jour: ${promptId}`);

    return NextResponse.json({
      success: true,
      prompt: updatedPrompt
    });

  } catch (error) {
    logger.error('[Editor Prompts API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/editor-prompts/[id]
 * Supprime un prompt (soft delete par défaut)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promptId = params.id;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    logger.info(`[Editor Prompts API] 🗑️ DELETE prompt: ${promptId} (hard: ${hardDelete})`);

    // Vérifier que le prompt existe
    const { data: existingPrompt, error: fetchError } = await supabase
      .from('editor_prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (fetchError || !existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt non trouvé' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Hard delete
      const { error: deleteError } = await supabase
        .from('editor_prompts')
        .delete()
        .eq('id', promptId);

      if (deleteError) {
        logger.error('[Editor Prompts API] ❌ Erreur suppression prompt:', deleteError);
        return NextResponse.json(
          { error: 'Erreur lors de la suppression du prompt' },
          { status: 500 }
        );
      }
    } else {
      // Soft delete
      const { error: updateError } = await supabase
        .from('editor_prompts')
        .update({ is_active: false })
        .eq('id', promptId);

      if (updateError) {
        logger.error('[Editor Prompts API] ❌ Erreur désactivation prompt:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la désactivation du prompt' },
          { status: 500 }
        );
      }
    }

    logger.info(`[Editor Prompts API] ✅ Prompt ${hardDelete ? 'supprimé' : 'désactivé'}: ${promptId}`);

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Prompt supprimé' : 'Prompt désactivé'
    });

  } catch (error) {
    logger.error('[Editor Prompts API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}


