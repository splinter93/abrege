import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { CreateSpecializedAgentRequest } from '@/types/specializedAgents';
import { getAuthenticatedUser } from '@/utils/authUtils';

// Client Supabase admin pour accéder aux agents
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Instance du manager pour les agents spécialisés
const agentManager = new SpecializedAgentManager();

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: auth.error ?? 'Non authentifié' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const specialized = searchParams.get('specialized') === 'true';

    logger.info(`[Agents API] 🚀 Récupération des agents${specialized ? ' spécialisés' : ''}`);

    const agents = specialized
      ? await agentManager.listSpecializedAgents(auth.userId)
      : await agentManager.listAgents(auth.userId, false);

    logger.info(`[Agents API] ✅ ${agents?.length || 0} agents récupérés`);
    
    return NextResponse.json({
      success: true,
      agents: agents || [],
      specialized: specialized
    });

  } catch (error) {
    logger.error('[Agents API] ❌ Erreur fatale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: auth.error ?? 'Non authentifié' }, { status: auth.status || 401 });
    }
    const ownerUserId = auth.userId;

    const body = await request.json();
    const { 
      name, model, system_instructions, provider = 'groq',
      // Nouvelles propriétés pour agents spécialisés
      slug, display_name, description, is_endpoint_agent = false,
      input_schema, output_schema, is_chat_agent = false,
      temperature = 0.7, max_tokens = 4000, api_v2_capabilities
    } = body;

    logger.info('[Agents API] 🚀 Création d\'un agent');
    
    // Validation basique
    if (!name || !model || !system_instructions) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['name', 'model', 'system_instructions'] },
        { status: 400 }
      );
    }

    // Validation des agents spécialisés
    if (is_endpoint_agent && (!slug || !display_name)) {
      return NextResponse.json(
        { error: 'Pour les agents spécialisés, slug et display_name sont requis' },
        { status: 400 }
      );
    }

    // Si c'est un agent spécialisé, utiliser le manager
    if (is_endpoint_agent) {
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

      const result = await agentManager.createSpecializedAgent(specializedConfig, ownerUserId);
      
      if (result.success) {
        logger.info(`[Agents API] ✅ Agent spécialisé créé: ${result.agent?.slug} (ID: ${result.agent?.id})`);
        return NextResponse.json({
          success: true,
          agent: result.agent,
          endpoint: result.endpoint
        });
      } else {
        logger.error('[Agents API] ❌ Erreur création agent spécialisé:', result.error);
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
    }

    // Agent classique
    const agentData = {
      user_id: ownerUserId,
      name,
      model,
      provider,
      system_instructions,
      is_active: true,
      priority: 1,
      temperature,
      max_tokens,
      capabilities: ['text', 'function_calling'],
      api_v2_capabilities: api_v2_capabilities || ['get_note', 'update_note', 'search_notes'],
      
      // Nouvelles propriétés pour agents spécialisés (null pour agents classiques)
      slug: null,
      display_name: name,
      description: null,
      is_endpoint_agent: false,
      is_chat_agent: true,
      input_schema: null,
      output_schema: null
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) {
      logger.error('[Agents API] ❌ Erreur création agent:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'agent' },
        { status: 500 }
      );
    }

    logger.info(`[Agents API] ✅ Agent créé: ${agent.name} (ID: ${agent.id})`);
    
    return NextResponse.json({
      success: true,
      agent
    });

  } catch (error) {
    logger.error('[Agents API] ❌ Erreur fatale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 