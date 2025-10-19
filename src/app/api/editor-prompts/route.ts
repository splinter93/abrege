/**
 * API Routes pour la gestion des prompts éditeur
 * @module api/editor-prompts
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
 * Schéma de validation pour la création d'un prompt
 */
const createPromptSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  prompt_template: z.string().min(1, 'Le template est requis'),
  icon: z.string().refine((icon) => isValidIcon(icon), {
    message: 'Icône invalide'
  }),
  agent_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  user_id: z.string().uuid('User ID invalide')
});

/**
 * Schéma de validation pour la query string
 */
const getPromptsQuerySchema = z.object({
  user_id: z.string().uuid('User ID invalide')
});

/**
 * GET /api/editor-prompts
 * Récupère tous les prompts actifs d'un utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Validation
    const validationResult = getPromptsQuerySchema.safeParse({ user_id: userId });
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Paramètres invalides', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    logger.info(`[Editor Prompts API] 📥 GET prompts pour user: ${userId}`);

    // Récupérer les prompts
    const { data: prompts, error } = await supabase
      .from('editor_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      logger.error('[Editor Prompts API] ❌ Erreur récupération prompts:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des prompts' },
        { status: 500 }
      );
    }

    logger.info(`[Editor Prompts API] ✅ ${prompts?.length || 0} prompts récupérés`);

    return NextResponse.json({
      success: true,
      prompts: prompts || []
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
 * POST /api/editor-prompts
 * Crée un nouveau prompt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    const validationResult = createPromptSchema.safeParse(body);
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

    logger.info(`[Editor Prompts API] 📝 POST création prompt: ${data.name} pour user: ${data.user_id}`);

    // Si position non fournie, récupérer la position maximale + 1
    let position = data.position;
    if (position === undefined) {
      const { data: maxPrompt } = await supabase
        .from('editor_prompts')
        .select('position')
        .eq('user_id', data.user_id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      position = (maxPrompt?.position ?? -1) + 1;
    }

    // Créer le prompt
    const { data: prompt, error } = await supabase
      .from('editor_prompts')
      .insert({
        user_id: data.user_id,
        agent_id: data.agent_id ?? null,
        name: data.name,
        description: data.description ?? null,
        prompt_template: data.prompt_template,
        icon: data.icon,
        position,
        is_active: true,
        is_default: false,
        category: data.category ?? null
      })
      .select()
      .single();

    if (error) {
      logger.error('[Editor Prompts API] ❌ Erreur création prompt:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du prompt' },
        { status: 500 }
      );
    }

    logger.info(`[Editor Prompts API] ✅ Prompt créé avec ID: ${prompt.id}`);

    return NextResponse.json({
      success: true,
      prompt
    }, { status: 201 });

  } catch (error) {
    logger.error('[Editor Prompts API] ❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}


