/**
 * Route unifiée pour les agents spécialisés
 * /api/v2/agents/{agentId}
 * 
 * POST: Exécuter un agent spécialisé
 * GET: Récupérer les informations d'un agent spécialisé
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { SpecializedAgentError } from '@/types/specializedAgents';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// Types pour les routes API
interface AgentExecutionRequest {
  input: Record<string, unknown>;
  userToken?: string;
  sessionId?: string;
}

interface AgentExecutionResponse {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  metadata?: {
    agentId: string;
    executionTime: number;
    model: string;
    traceId?: string;
  };
}

interface AgentInfoResponse {
  name: string;
  description: string;
  model: string;
  input_schema?: unknown;
  output_schema?: unknown;
  is_active: boolean;
  slug: string;
}

// Instance globale du manager (singleton)
const agentManager = new SpecializedAgentManager();

/**
 * POST /api/v2/agents/{agentId}
 * Exécuter un agent spécialisé
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { agentId } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_specialized_agent_execute',
    component: 'API_V2_AGENTS',
    agentId,
    clientType
  };

  logApi.info(`🚀 Exécution agent spécialisé ${agentId}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: SpecializedAgentError.AUTHENTICATION_ERROR
        },
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId!;
    
    // 🔑 Extraire le token JWT pour les tool calls
    const authHeader = request.headers.get('authorization');
    const userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!userToken) {
      logApi.info(`❌ Token JWT manquant pour les tool calls`, context);
      return NextResponse.json(
        { 
          success: false,
          error: 'Token JWT requis pour l\'exécution des agents avec tool calls',
          code: SpecializedAgentError.AUTHENTICATION_ERROR
        },
        { status: 401 }
      );
    }

    // 📥 Récupérer le body de la requête
    let input: Record<string, unknown>;
    try {
      input = await request.json();
    } catch (error) {
      logApi.info(`❌ Body JSON invalide`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Body JSON invalide',
          code: SpecializedAgentError.INVALID_INPUT
        },
        { status: 400 }
      );
    }

    // 🔍 Validation basique de l'input
    if (!input || typeof input !== 'object') {
      logApi.info(`❌ Input invalide`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Input doit être un objet JSON',
          code: SpecializedAgentError.INVALID_INPUT
        },
        { status: 400 }
      );
    }

    // 🚀 Exécuter l'agent spécialisé
    const result = await agentManager.executeSpecializedAgent(
      agentId,
      input,
      userToken, // ✅ CORRECTION : Passer le token JWT au lieu de l'userId
      `api-v2-${agentId}-${Date.now()}`
    );

    const executionTime = Date.now() - startTime;
    
    if (result.success) {
      logApi.info(`✅ Agent ${agentId} exécuté avec succès`, { 
        ...context, 
        executionTime,
        resultKeys: Object.keys(result.result || {})
      });
      
      return NextResponse.json({
        success: true,
        ...result.result,
        metadata: {
          ...result.metadata,
          executionTime,
          agentId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      logApi.warn(`❌ Échec exécution agent ${agentId}`, { 
        ...context, 
        executionTime,
        error: result.error
      });
      
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: SpecializedAgentError.EXECUTION_ERROR,
          metadata: {
            ...result.metadata,
            executionTime,
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale agent ${agentId}:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: SpecializedAgentError.EXECUTION_ERROR,
        metadata: {
          agentId,
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v2/agents/{agentId}
 * Récupérer les informations d'un agent spécialisé
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { agentId } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_specialized_agent_info',
    component: 'API_V2_AGENTS',
    agentId,
    clientType
  };

  logApi.info(`🚀 Récupération info agent spécialisé ${agentId}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: SpecializedAgentError.AUTHENTICATION_ERROR
        },
        { status: authResult.status || 401 }
      );
    }

    // 🔍 Récupérer les informations de l'agent
    const agent = await agentManager.getAgentInfo(agentId);
    
    if (!agent) {
      logApi.info(`❌ Agent ${agentId} non trouvé`, context);
      return NextResponse.json(
        {
          success: false,
          error: `Agent ${agentId} not found`,
          code: SpecializedAgentError.AGENT_NOT_FOUND
        },
        { status: 404 }
      );
    }

    const executionTime = Date.now() - startTime;
    
    logApi.info(`✅ Info agent ${agentId} récupérée`, { 
      ...context, 
      executionTime,
      agentName: agent.display_name
    });

    // 📤 Retourner les informations de l'agent
    return NextResponse.json({
      success: true,
      id: agent.id,
      name: agent.display_name || agent.name,
      display_name: agent.display_name,
      slug: agent.slug,
      description: agent.description,
      model: agent.model,
      provider: agent.provider,
      profile_picture: agent.profile_picture,
      system_instructions: agent.system_instructions,
      instructions: agent.instructions,
      personality: agent.personality,
      expertise: agent.expertise,
      input_schema: agent.input_schema,
      output_schema: agent.output_schema,
      is_active: agent.is_active,
      is_chat_agent: agent.is_chat_agent,
      is_endpoint_agent: agent.is_endpoint_agent,
      capabilities: agent.capabilities,
      api_v2_capabilities: agent.api_v2_capabilities,
      temperature: agent.temperature,
      top_p: agent.top_p,
      max_tokens: agent.max_tokens,
      priority: agent.priority,
      version: agent.version,
      is_default: agent.is_default,
      context_template: agent.context_template,
      api_config: agent.api_config,
      openapi_schema_id: agent.openapi_schema_id,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      metadata: {
        agentId,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale récupération agent ${agentId}:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: SpecializedAgentError.EXECUTION_ERROR,
        metadata: {
          agentId,
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/v2/agents/{agentId}
 * Vérifier l'existence d'un agent spécialisé
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const { agentId } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_specialized_agent_check',
    component: 'API_V2_AGENTS',
    agentId,
    clientType
  };

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return new NextResponse(null, { status: authResult.status || 401 });
    }

    // 🔍 Vérifier l'existence de l'agent
    const agent = await agentManager.getAgentInfo(agentId);
    
    if (!agent) {
      return new NextResponse(null, { status: 404 });
    }

    // 📤 Retourner les headers avec les infos de l'agent
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Agent-Name': agent.display_name || agent.name,
        'X-Agent-Model': agent.model,
        'X-Agent-Provider': agent.provider,
        'X-Agent-Active': agent.is_active ? 'true' : 'false',
        'X-Agent-Chat': agent.is_chat_agent ? 'true' : 'false',
        'X-Agent-Endpoint': agent.is_endpoint_agent ? 'true' : 'false'
      }
    });

  } catch (error) {
    logApi.error(`❌ Erreur fatale vérification agent ${agentId}:`, { 
      ...context, 
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });

    return new NextResponse(null, { status: 500 });
  }
}

/**
 * PUT /api/v2/agents/{agentId}
 * Mise à jour complète d'un agent spécialisé
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { agentId } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_specialized_agent_update',
    component: 'API_V2_AGENTS',
    agentId,
    clientType
  };

  logApi.info(`🚀 Mise à jour complète agent spécialisé ${agentId}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: SpecializedAgentError.AUTHENTICATION_ERROR
        },
        { status: authResult.status || 401 }
      );
    }

    // 📥 Récupérer le body de la requête
    let updateData: Record<string, unknown>;
    try {
      updateData = await request.json();
    } catch (error) {
      logApi.info(`❌ Body JSON invalide`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Body JSON invalide',
          code: SpecializedAgentError.INVALID_INPUT
        },
        { status: 400 }
      );
    }

    // 🔍 Validation basique
    if (!updateData || typeof updateData !== 'object') {
      logApi.info(`❌ Données de mise à jour invalides`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Données de mise à jour doivent être un objet JSON',
          code: SpecializedAgentError.INVALID_INPUT
        },
        { status: 400 }
      );
    }

    // 🚀 Mise à jour complète de l'agent
    const result = await agentManager.updateAgent(agentId, updateData, `api-v2-update-${agentId}-${Date.now()}`);
    
    if (!result) {
      logApi.info(`❌ Agent ${agentId} non trouvé`, context);
      return NextResponse.json(
        {
          success: false,
          error: `Agent ${agentId} not found`,
          code: SpecializedAgentError.AGENT_NOT_FOUND
        },
        { status: 404 }
      );
    }

    const executionTime = Date.now() - startTime;
    
    logApi.info(`✅ Agent ${agentId} mis à jour avec succès`, { 
      ...context, 
      executionTime,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      agent: result,
      message: 'Agent mis à jour avec succès',
      metadata: {
        agentId,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale mise à jour agent ${agentId}:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: SpecializedAgentError.EXECUTION_ERROR,
        metadata: {
          agentId,
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v2/agents/{agentId}
 * Mise à jour partielle d'un agent spécialisé
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { agentId } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_specialized_agent_patch',
    component: 'API_V2_AGENTS',
    agentId,
    clientType
  };

  logApi.info(`🚀 Mise à jour partielle agent spécialisé ${agentId}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: SpecializedAgentError.AUTHENTICATION_ERROR
        },
        { status: authResult.status || 401 }
      );
    }

    // 📥 Récupérer le body de la requête
    let patchData: Record<string, unknown>;
    try {
      patchData = await request.json();
    } catch (error) {
      logApi.info(`❌ Body JSON invalide`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Body JSON invalide',
          code: SpecializedAgentError.INVALID_INPUT
        },
        { status: 400 }
      );
    }

    // 🔍 Validation basique
    if (!patchData || typeof patchData !== 'object') {
      logApi.info(`❌ Données de patch invalides`, context);
      return NextResponse.json(
        {
          success: false,
          error: 'Données de patch doivent être un objet JSON',
          code: SpecializedAgentError.INVALID_INPUT
        },
        { status: 400 }
      );
    }

    // 🚀 Mise à jour partielle de l'agent
    const result = await agentManager.patchAgent(agentId, patchData, `api-v2-patch-${agentId}-${Date.now()}`);
    
    if (!result) {
      logApi.info(`❌ Agent ${agentId} non trouvé`, context);
      return NextResponse.json(
        {
          success: false,
          error: `Agent ${agentId} not found`,
          code: SpecializedAgentError.AGENT_NOT_FOUND
        },
        { status: 404 }
      );
    }

    const executionTime = Date.now() - startTime;
    
    logApi.info(`✅ Agent ${agentId} patché avec succès`, { 
      ...context, 
      executionTime,
      patchedFields: Object.keys(patchData)
    });

    return NextResponse.json({
      success: true,
      agent: result,
      message: 'Agent mis à jour partiellement avec succès',
      metadata: {
        agentId,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale patch agent ${agentId}:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: SpecializedAgentError.EXECUTION_ERROR,
        metadata: {
          agentId,
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/agents/{agentId}
 * Supprimer un agent spécialisé
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { agentId } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  
  const context = {
    operation: 'v2_specialized_agent_delete',
    component: 'API_V2_AGENTS',
    agentId,
    clientType
  };

  logApi.info(`🚀 Suppression agent spécialisé ${agentId}`, context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: SpecializedAgentError.AUTHENTICATION_ERROR
        },
        { status: authResult.status || 401 }
      );
    }

    // 🚀 Supprimer l'agent
    const success = await agentManager.deleteAgent(agentId, `api-v2-delete-${agentId}-${Date.now()}`);
    
    if (!success) {
      logApi.info(`❌ Agent ${agentId} non trouvé`, context);
      return NextResponse.json(
        {
          success: false,
          error: `Agent ${agentId} not found`,
          code: SpecializedAgentError.AGENT_NOT_FOUND
        },
        { status: 404 }
      );
    }

    const executionTime = Date.now() - startTime;
    
    logApi.info(`✅ Agent ${agentId} supprimé avec succès`, { 
      ...context, 
      executionTime
    });

    return NextResponse.json({
      success: true,
      message: 'Agent supprimé avec succès',
      metadata: {
        agentId,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    logApi.error(`❌ Erreur fatale suppression agent ${agentId}:`, { 
      ...context, 
      executionTime,
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: SpecializedAgentError.EXECUTION_ERROR,
        metadata: {
          agentId,
          executionTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
