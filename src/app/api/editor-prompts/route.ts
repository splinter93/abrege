/**
 * API Routes pour la gestion des prompts éditeur
 * @module api/editor-prompts
 */

import { randomUUID } from 'crypto';
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

const SLUG_MAX_LENGTH = 50;
const SLUG_COLLISION_LIMIT = 100;

/**
 * Normalise un nom de prompt en slug (ASCII, lowercase, séparateurs "-")
 */
function normalizePromptSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'prompt';
  }

  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, SLUG_MAX_LENGTH);

  return normalized || 'prompt';
}

/**
 * Génère un slug unique pour un prompt utilisateur
 */
async function generateUniquePromptSlug(name: string, userId: string): Promise<string> {
  const baseSlug = normalizePromptSlug(name);
  let candidate = baseSlug;
  let suffixCounter = 1;

  // Vérifie l'unicité côté base, borne à SLUG_COLLISION_LIMIT pour éviter boucle infinie
  while (suffixCounter <= SLUG_COLLISION_LIMIT) {
    const { data, error } = await supabase
      .from('editor_prompts')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', candidate)
      .limit(1);

    if (error) {
      logger.error('[Editor Prompts API] ❌ Erreur vérification slug', {
        error,
        userId,
        candidate
      });
      throw new Error('Erreur lors de la génération du slug du prompt');
    }

    if (!data || data.length === 0) {
      return candidate;
    }

    suffixCounter += 1;
    const suffix = `-${suffixCounter}`;
    const availableLength = Math.max(SLUG_MAX_LENGTH - suffix.length, 1);
    const truncatedBase = baseSlug.slice(0, availableLength);
    candidate = `${truncatedBase}${suffix}`;
  }

  // Fallback : slug basé sur UUID pour garantir l'unicité
  const uniqueSuffix = randomUUID().slice(0, 8);
  const fallbackBaseLength = Math.max(SLUG_MAX_LENGTH - uniqueSuffix.length - 1, 1);
  const fallbackBase = baseSlug.slice(0, fallbackBaseLength);
  return `${fallbackBase}-${uniqueSuffix}`;
}

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
  user_id: z.string().uuid('User ID invalide'),
  // Contexte d'utilisation
  context: z.enum(['editor', 'chat', 'both']).optional(),
  // Nouveaux champs pour insertion flexible et structured outputs
  insertion_mode: z.enum(['replace', 'append', 'prepend']).optional(),
  use_structured_output: z.boolean().optional(),
  output_schema: z.any().nullable().optional() // JSONB, pas de validation stricte côté Zod
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

    // Récupérer les prompts de l'utilisateur ET les prompts par défaut (user_id = null)
    const { data: prompts, error } = await supabase
      .from('editor_prompts')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      logger.error('[Editor Prompts API] ❌ Erreur récupération prompts:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des prompts' },
        { status: 500 }
      );
    }

    logger.info(`[Editor Prompts API] ✅ ${prompts?.length || 0} prompts récupérés (user + defaults)`);

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

    let promptSlug: string;
    try {
      promptSlug = await generateUniquePromptSlug(data.name, data.user_id);
    } catch (slugError) {
      logger.error('[Editor Prompts API] ❌ Génération slug impossible', {
        error: slugError instanceof Error ? slugError.message : slugError,
        userId: data.user_id,
        promptName: data.name
      });

      return NextResponse.json(
        { error: 'Impossible de générer un identifiant unique pour ce prompt' },
        { status: 500 }
      );
    }

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
        slug: promptSlug,
        is_active: true,
        is_default: false,
        category: data.category ?? null,
        context: data.context ?? 'editor',
        // Nouveaux champs
        insertion_mode: data.insertion_mode ?? 'replace',
        use_structured_output: data.use_structured_output ?? false,
        output_schema: data.output_schema ?? null
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


