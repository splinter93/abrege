/**
 * GET /api/v2/agents
 * 
 * Endpoint pour lister tous les agents spécialisés disponibles
 * Correspond à l'operationId "listAgents" du schéma OpenAPI
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import type { CreateSpecializedAgentRequest } from '@/types/specializedAgents';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// Instance globale du manager (singleton)
const agentManager = new SpecializedAgentManager();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_agents_list',
    component: 'API_V2_AGENTS',
    clientType
  };

  logApi.info('🚀 Récupération liste des agents spécialisés', context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error
        },
        { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    // 🔍 Récupérer les agents (tous si includeInactive, sinon actifs uniquement)
    const agents = await agentManager.listAgents(userId, includeInactive);
    
    const executionTime = Date.now() - startTime;
    
    logApi.info(`✅ ${agents.length} agents récupérés en ${executionTime}ms`, { 
      ...context, 
      executionTime,
      agentCount: agents.length
    });

    // 📤 Construire la réponse selon le schéma OpenAPI
    const response = {
      success: true,
      data: agents.map(agent => ({
        id: agent.id,
        name: agent.display_name || agent.name,
        display_name: agent.display_name,
        slug: agent.slug,
        description: agent.description,
        profile_picture: agent.profile_picture,
        is_active: agent.is_active,
        agent_type: agent.is_chat_agent ? 'chat' : 'endpoint',
        model: agent.model,
        provider: agent.provider,
        capabilities: agent.capabilities,
        temperature: agent.temperature,
        top_p: agent.top_p,
        max_tokens: agent.max_tokens,
        reasoning_effort: agent.reasoning_effort ?? null,
        priority: agent.priority,
        openapi_schema_id: agent.openapi_schema_id,
        created_at: agent.created_at,
        updated_at: agent.updated_at
      })),
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime,
        totalCount: agents.length
      }
    };

    return NextResponse.json(response, { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json",
        "X-Total-Count": agents.length.toString(),
        "X-Execution-Time": executionTime.toString()
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale récupération liste agents:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * HEAD /api/v2/agents
 * Vérifier la disponibilité de l'endpoint
 */
/**
 * POST /api/v2/agents
 * 
 * Endpoint pour créer un nouvel agent spécialisé
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_agents_create',
    component: 'API_V2_AGENTS',
    clientType
  };

  logApi.info('🚀 Création nouvel agent spécialisé', context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error
        },
        { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;

    // 📥 Récupérer le body de la requête
    let createDataRaw: Record<string, unknown>;
    try {
      createDataRaw = await request.json();
    } catch (error) {
      logApi.info(`❌ Body JSON invalide`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Body JSON invalide'
        },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔍 Validation basique
    if (!createDataRaw || typeof createDataRaw !== 'object') {
      logApi.info(`❌ Données de création invalides`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Données de création doivent être un objet JSON'
        },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const requiredFields: Array<keyof CreateSpecializedAgentRequest> = [
      'slug',
      'display_name',
      'description',
      'model',
      'system_instructions'
    ];
    const hasAllRequired = requiredFields.every(field => typeof (createDataRaw as Record<string, unknown>)[field] === 'string');
    if (!hasAllRequired) {
      logApi.info('❌ Champs requis manquants pour création agent', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Champs requis manquants pour créer un agent'
        },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const createData: CreateSpecializedAgentRequest = {
      slug: createDataRaw.slug as string,
      display_name: createDataRaw.display_name as string,
      description: createDataRaw.description as string,
      model: createDataRaw.model as string,
      system_instructions: createDataRaw.system_instructions as string,
      input_schema: createDataRaw.input_schema as unknown as CreateSpecializedAgentRequest['input_schema'],
      output_schema: createDataRaw.output_schema as unknown as CreateSpecializedAgentRequest['output_schema'],
      is_chat_agent: createDataRaw.is_chat_agent as boolean | undefined,
      temperature: createDataRaw.temperature as number | undefined,
      max_tokens: createDataRaw.max_tokens as number | undefined,
      api_v2_capabilities: createDataRaw.api_v2_capabilities as string[] | undefined
    };

    // 🚀 Créer l'agent
    const result = await agentManager.createSpecializedAgent(createData, userId);
    
    if (!result.success) {
      logApi.info(`❌ Erreur création agent: ${result.error}`, context);
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const executionTime = Date.now() - startTime;
    
    logApi.info(`✅ Agent créé avec succès en ${executionTime}ms`, { 
      ...context, 
      executionTime,
      agentId: result.agent?.id
    });

    return NextResponse.json({
      success: true,
      data: result.agent,
      message: 'Agent créé avec succès',
      metadata: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 201, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale création agent:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_agents_list_head',
    component: 'API_V2_AGENTS',
    clientType
  };

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return new NextResponse(null, { 
        status: authResult.status || 401,
        headers: {
          'X-Error': authResult.error ?? 'auth_error'
        }
      });
    }

    // 📤 Retourner les headers d'information
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Endpoint': '/api/v2/agents',
        'X-Method': 'GET',
        'X-Description': 'Liste des agents spécialisés disponibles',
        'X-Content-Type': 'application/json',
        'X-Authentication': 'X-API-Key header required'
      }
    });
    
  } catch (error) {
    logApi.error(`❌ Erreur HEAD agents:`, error);
    return new NextResponse(null, { 
      status: 500,
      headers: {
        'X-Error': 'Erreur interne du serveur'
      }
    });
  }
}
