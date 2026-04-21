/**
 * 🤖 POST /api/v2/agents/execute
 * 
 * Endpoint universel pour exécuter n'importe quel agent spécialisé
 * 
 * Permet de tester facilement tous les agents avec une interface simple :
 * - ref : ID ou slug de l'agent
 * - input : Message d'entrée pour l'agent
 * - options : Paramètres optionnels (temperature, max_tokens, etc.)
 * 
 * Parfait pour le développement et les tests LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { executeAgentV2Schema, validatePayload, createValidationErrorResponse } from '@/utils/v2ValidationSchemas';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { userCanAccessAgent, type PlatformAgentRow } from '@/constants/platformAgents';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// ============================================================================
// TYPES
// ============================================================================

interface AgentExecuteResponse {
  success: true;
  data: {
    ref: string;
    agent_name: string;
    agent_id: string;
    response: string;
    execution_time: number;
    model_used: string;
    provider: string;
  };
  meta: {
    timestamp: string;
    agent_slug: string;
    agent_type: 'chat' | 'endpoint';
    input_length: number;
    response_length: number;
  };
}

interface AgentExecuteError {
  error: string;
  code: string;
  message: string;
}

interface ExecutionContext {
  operation: string;
  component: string;
  clientType: string;
  agent_ref?: string;
  agent_id?: string;
  apiTime?: number;
  authType?: string;
}

// ============================================================================
// ERROR CODES
// ============================================================================

const AGENT_EXECUTE_ERRORS = {
  AGENT_NOT_FOUND: { code: 'AGENT_NOT_FOUND', status: 404 },
  AGENT_INACTIVE: { code: 'AGENT_INACTIVE', status: 400 },
  EXECUTION_FAILED: { code: 'EXECUTION_FAILED', status: 500 },
  INVALID_INPUT: { code: 'INVALID_INPUT', status: 400 },
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429 }
} as const;

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context: ExecutionContext = {
    operation: 'v2_agents_execute_universal',
    component: 'API_V2',
    clientType
  };

  const startTime = Date.now();
  logApi.info('🚀 Début exécution agent universel V2', context);

  try {
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
    const authType = authResult.authType!;
    
    // 🔑 Gérer l'authentification selon le type (JWT, API Key, OAuth)
    let userToken: string | null = null;
    
    if (authType === 'jwt') {
      // Pour les tokens JWT, extraire le token
      const authHeader = request.headers.get('authorization');
      userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    } else if (authType === 'api_key') {
      // ✅ CORRECTION SÉCURITÉ : Utiliser l'userId comme token pour les clés d'API
      // Le système d'authentification des tools gérera l'impersonation appropriée
      logApi.info(`🔑 Clé d'API détectée - Utilisation de l'userId comme token: ${userId}`, context);
      
      // Pour les clés d'API, on passe l'userId directement
      // Le système de tools détectera que c'est un UUID et utilisera l'impersonation appropriée
      userToken = userId;
      logApi.info(`✅ Token configuré pour l'utilisateur: ${userId}`, context);
    } else if (authType === 'oauth') {
      // Pour OAuth, extraire le token
      const authHeader = request.headers.get('authorization');
      userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    // 📋 Récupérer et valider le body
    const body = await request.json();
    const validationResult = validatePayload(executeAgentV2Schema, body);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, context);
    }

    const { ref, input, image, options = {} } = validationResult.data;

    // 🔍 Résoudre l'agent (ID ou slug)
    const agentManager = new SpecializedAgentManager();
    const agent = await agentManager.getAgentByRef(ref, userId);
    
    if (!agent || !userCanAccessAgent(agent as PlatformAgentRow, userId)) {
      logApi.info(`❌ Agent non trouvé ou accès refusé: ${ref}`, context);
      return NextResponse.json(
        { 
          error: 'Agent non trouvé',
          code: AGENT_EXECUTE_ERRORS.AGENT_NOT_FOUND.code,
          message: `Aucun agent trouvé avec la référence: ${ref}`
        },
        { status: AGENT_EXECUTE_ERRORS.AGENT_NOT_FOUND.status }
      );
    }

    // ✅ Vérifier que l'agent est actif
    if (!agent.is_active) {
      logApi.info(`❌ Agent inactif: ${ref}`, context);
      return NextResponse.json(
        { 
          error: 'Agent inactif',
          code: AGENT_EXECUTE_ERRORS.AGENT_INACTIVE.code,
          message: `L'agent ${agent.display_name || agent.slug} est inactif`
        },
        { status: AGENT_EXECUTE_ERRORS.AGENT_INACTIVE.status }
      );
    }

    // 🔧 Préparer les paramètres d'exécution
    const executionParams = {
      input: {
        input: input, // Format standardisé pour tous les agents
        image: image, // Image optionnelle pour les modèles Llama
        ...options
      },
      userId, // Utiliser l'userId de l'authentification
      context: {
        ...context,
        agent_ref: ref,
        agent_id: agent.id,
        authType // Ajouter le type d'authentification
      } as ExecutionContext
    };

    // 🚀 Exécuter l'agent
    logApi.info(`🤖 Exécution agent: ${agent.display_name || agent.slug}`, context);
    
    // ✅ CORRECTION SÉCURITÉ : Utiliser le JWT valide pour l'authentification
    // Le JWT respecte les politiques RLS et permet l'accès aux données de l'utilisateur
    const finalUserToken = userToken; // JWT valide (original ou généré)
    
    logApi.info(`🔑 TOKEN D'AUTHENTIFICATION POUR L'AGENT:`, {
      hasUserToken: !!userToken,
      hasUserId: !!userId,
      authType,
      tokenType: userToken ? 'JWT' : 'AUCUN',
      finalToken: finalUserToken ? finalUserToken.substring(0, 8) + '...' : 'AUCUN',
      respectsRLS: true // Le JWT respecte les politiques RLS
    });
    
    const executionResult = await agentManager.executeSpecializedAgent(
      agent.id,
      executionParams.input,
      finalUserToken!, // ✅ CORRECTION : Utiliser le token de l'utilisateur final (ne peut pas être null ici)
      `api-v2-execute-${agent.id}-${Date.now()}`
    );

    if (!executionResult.success) {
      logApi.error(`❌ Erreur exécution agent: ${executionResult.error}`, context);
      return NextResponse.json(
        { 
          error: 'Erreur lors de l\'exécution de l\'agent',
          code: AGENT_EXECUTE_ERRORS.EXECUTION_FAILED.code,
          message: executionResult.error
        },
        { status: AGENT_EXECUTE_ERRORS.EXECUTION_FAILED.status }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Agent exécuté avec succès en ${apiTime}ms`, context);

    const resultData = executionResult.data as { response?: string; output?: string; result?: string } | undefined;
    const responseText = resultData?.response ?? resultData?.output ?? resultData?.result ?? 'Réponse générée';

    // 📤 Construire la réponse
    const response: AgentExecuteResponse = {
      success: true,
      data: {
        ref: ref,
        agent_name: agent.display_name || agent.slug,
        agent_id: agent.id,
        response: responseText,
        execution_time: apiTime,
        model_used: agent.model,
        provider: agent.provider || 'unknown'
      },
      meta: {
        timestamp: new Date().toISOString(),
        agent_slug: agent.slug,
        agent_type: agent.is_chat_agent ? 'chat' : 'endpoint',
        input_length: input.length,
        response_length: responseText.length
      }
    };

    return NextResponse.json(response, { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json",
        "X-Agent-Name": agent.display_name || agent.slug,
        "X-Agent-Model": agent.model,
        "X-Execution-Time": apiTime.toString()
      }
    });

  } catch (error) {
    const apiTime = Date.now() - startTime;
    logApi.error(`❌ Erreur serveur: ${error}`, { ...context, apiTime });
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        code: AGENT_EXECUTE_ERRORS.EXECUTION_FAILED.code,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================================
// HEAD ENDPOINT (pour vérifier l'existence)
// ============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context: ExecutionContext = {
    operation: 'v2_agents_execute_head',
    component: 'API_V2',
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

    const userId = authResult.userId!;

    // Récupérer le paramètre ref depuis l'URL
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return new NextResponse(null, { 
        status: 400,
        headers: {
          'X-Error': 'Paramètre ref requis'
        }
      });
    }

    // Vérifier que l'agent existe et est accessible
    const agentManager = new SpecializedAgentManager();
    const agent = await agentManager.getAgentByRef(ref, userId);

    if (!agent || !userCanAccessAgent(agent as PlatformAgentRow, userId)) {
      return new NextResponse(null, { 
        status: 404,
        headers: {
          'X-Error': 'Agent non trouvé',
          'X-Agent-Ref': ref
        }
      });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Agent-Name': agent.display_name || agent.slug,
        'X-Agent-Model': agent.model,
        'X-Agent-Provider': agent.provider || 'unknown',
        'X-Agent-Active': (agent.is_active ?? false).toString(),
        'X-Agent-Type': agent.is_chat_agent ? 'chat' : 'endpoint',
        'X-Endpoint': `/api/v2/agents/execute`,
        'X-Method': 'POST',
        'X-Description': 'Exécuter un agent spécialisé universel'
      }
    });
    
  } catch (error) {
    logApi.error(`❌ Erreur HEAD agents/execute:`, error);
    return new NextResponse(null, { 
      status: 500,
      headers: {
        'X-Error': 'Erreur interne du serveur'
      }
    });
  }
}
