/**
 * API UI pour les agents spécialisés
 * /api/ui/agents/specialized
 * 
 * GET: Liste des agents spécialisés
 * POST: Créer un agent spécialisé
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { CreateSpecializedAgentRequest, SpecializedAgentConfig } from '@/types/specializedAgents';
import { simpleLogger as logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

// Types pour les réponses API
interface SpecializedAgentsListResponse {
  success: boolean;
  agents: SpecializedAgentConfig[];
  error?: string;
}

interface SpecializedAgentCreateResponse {
  success: boolean;
  agent?: SpecializedAgentConfig;
  endpoint?: string;
  error?: string;
}

// Instance du manager pour les agents spécialisés
const agentManager = new SpecializedAgentManager();

/**
 * GET /api/ui/agents/specialized
 * Récupérer la liste des agents spécialisés
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error ?? 'Non authentifié' },
        { status: auth.status || 401 },
      );
    }

    logger.info('[Specialized Agents API] 🚀 Récupération des agents spécialisés');

    const agents = await agentManager.listSpecializedAgents(auth.userId);

    logger.info(`[Specialized Agents API] ✅ ${agents.length} agents spécialisés récupérés`);
    
    return NextResponse.json({
      success: true,
      agents,
      total: agents.length
    });

  } catch (error) {
    logger.error('[Specialized Agents API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ui/agents/specialized
 * Créer un agent spécialisé
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error ?? 'Non authentifié' },
        { status: auth.status || 401 },
      );
    }

    const body = await request.json();
    const { 
      slug, name, display_name, description, model, system_instructions,
      input_schema, output_schema, provider = 'groq',
      is_chat_agent = false, temperature = 0.7, max_tokens = 4000,
      api_v2_capabilities
    } = body;

    logger.info('[Specialized Agents API] 🚀 Création d\'un agent spécialisé');

    // Validation spécifique aux agents spécialisés
    if (!slug || !display_name || !model || !system_instructions) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Paramètres manquants', 
          required: ['slug', 'display_name', 'model', 'system_instructions'] 
        },
        { status: 400 }
      );
    }

    // Validation du format du slug
    if (!slug.match(/^[a-z0-9-]+$/)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets'
        },
        { status: 400 }
      );
    }

    const specializedConfig: CreateSpecializedAgentRequest = {
      slug,
      name, // Nom complet optionnel (ex: "Timothy Cavendish")
      display_name, // Nom court affiché (ex: "Timothy")
      description: description || '',
      model,
      provider,
      system_instructions,
      input_schema,
      output_schema,
      is_chat_agent,
      temperature,
      max_tokens,
      api_v2_capabilities
    };

    const result = await agentManager.createSpecializedAgent(specializedConfig, auth.userId);

    if (result.success) {
      logger.info(`[Specialized Agents API] ✅ Agent spécialisé créé: ${result.agent?.slug} (ID: ${result.agent?.id})`);
      
      return NextResponse.json({
        success: true,
        agent: result.agent,
        endpoint: result.endpoint,
        message: `Agent '${result.agent?.slug}' créé avec succès ! Endpoint: ${result.endpoint}`
      });
    } else {
      logger.error('[Specialized Agents API] ❌ Erreur création:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error('[Specialized Agents API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
