import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * API LLM - Point d'entrée principal pour les LLM et agents
 * 
 * Cette API gère :
 * - Appels aux modèles de langage (GPT, Groq, Together AI, etc.)
 * - Exécution des outils et fonction calls
 * - Gestion des agents et de leurs actions
 * - Opérations de streaming et de chat
 * 
 * Elle est séparée de l'API UI pour une meilleure cloisonnement
 */
export async function POST(request: NextRequest) {
  try {
    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Valider le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Récupérer le corps de la requête
    const body = await request.json();
    const { action, provider, model, messages, tools, stream, ...options } = body;

    // Routeur pour les opérations LLM
    switch (action) {
      case 'chat':
        return await handleChat(provider, model, messages, tools, stream, user.id, options);
      case 'tools':
        return await handleToolsExecution(tools, user.id, options);
      case 'agent':
        return await handleAgentAction(provider, model, messages, tools, user.id, options);
      case 'stream':
        return await handleStreaming(provider, model, messages, tools, user.id, options);
      default:
        return NextResponse.json(
          { error: 'Action non reconnue', availableActions: ['chat', 'tools', 'agent', 'stream'] },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[API LLM] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Valider le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Routeur pour les opérations GET
    switch (action) {
      case 'providers':
        return await handleGetProviders();
      case 'models':
        return await handleGetModels(searchParams.get('provider'));
      case 'tools':
        return await handleGetAvailableTools();
      case 'status':
        return await handleGetStatus();
      default:
        return NextResponse.json(
          { error: 'Action non reconnue', availableActions: ['providers', 'models', 'tools', 'status'] },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[API LLM] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLERS POUR LES OPÉRATIONS POST
// ============================================================================

async function handleChat(
  provider: string,
  model: string,
  messages: any[],
  tools: any[] | undefined,
  stream: boolean,
  userId: string,
  options: any
) {
  try {
    if (!provider || !model || !messages) {
      return NextResponse.json(
        { error: 'Provider, model et messages sont requis' },
        { status: 400 }
      );
    }

    // Validation des messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages doit être un tableau non vide' },
        { status: 400 }
      );
    }

    // Appel au provider approprié
    const result = await callLLMProvider(provider, model, messages, tools, stream, options);
    
    return NextResponse.json({
      success: true,
      provider,
      model,
      response: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors du chat:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'appel au LLM' },
      { status: 500 }
    );
  }
}

async function handleToolsExecution(tools: any[], userId: string, options: any) {
  try {
    if (!tools || !Array.isArray(tools)) {
      return NextResponse.json(
        { error: 'Tools doit être un tableau' },
        { status: 400 }
      );
    }

    // Exécution des outils
    const results = await executeTools(tools, userId, options);
    
    return NextResponse.json({
      success: true,
      toolsExecuted: tools.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors de l\'exécution des outils:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exécution des outils' },
      { status: 500 }
    );
  }
}

async function handleAgentAction(
  provider: string,
  model: string,
  messages: any[],
  tools: any[] | undefined,
  userId: string,
  options: any
) {
  try {
    if (!provider || !model || !messages) {
      return NextResponse.json(
        { error: 'Provider, model et messages sont requis' },
        { status: 400 }
      );
    }

    // Exécution d'une action d'agent
    const result = await executeAgentAction(provider, model, messages, tools, userId, options);
    
    return NextResponse.json({
      success: true,
      agentAction: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors de l\'action d\'agent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'action d\'agent' },
      { status: 500 }
    );
  }
}

async function handleStreaming(
  provider: string,
  model: string,
  messages: any[],
  tools: any[] | undefined,
  userId: string,
  options: any
) {
  try {
    if (!provider || !model || !messages) {
      return NextResponse.json(
        { error: 'Provider, model et messages sont requis' },
        { status: 400 }
      );
    }

    // Configuration du streaming
    const streamConfig = {
      provider,
      model,
      messages,
      tools,
      userId,
      ...options
    };

    // Retourner une réponse de streaming
    return new Response(
      new ReadableStream({
        start(controller) {
          // TODO: Implémenter le streaming réel
          controller.enqueue(new TextEncoder().encode(JSON.stringify({
            type: 'start',
            message: 'Streaming démarré'
          })));
          
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              type: 'end',
              message: 'Streaming terminé'
            })));
            controller.close();
          }, 1000);
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        }
      }
    );

  } catch (error) {
    console.error('[API LLM] Erreur lors du streaming:', error);
    return NextResponse.json(
      { error: 'Erreur lors du streaming' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLERS POUR LES OPÉRATIONS GET
// ============================================================================

async function handleGetProviders() {
  try {
    const providers = [
      {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        status: 'available'
      },
      {
        id: 'groq',
        name: 'Groq',
        models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
        status: 'available'
      },
      {
        id: 'together',
        name: 'Together AI',
        models: ['deepseek-coder', 'codellama-70b', 'llama-2-70b'],
        status: 'available'
      },
      {
        id: 'qwen',
        name: 'Qwen',
        models: ['qwen2.5-72b', 'qwen2.5-32b', 'qwen2.5-14b'],
        status: 'available'
      }
    ];

    return NextResponse.json({
      success: true,
      providers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors de la récupération des providers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des providers' },
      { status: 500 }
    );
  }
}

async function handleGetModels(provider: string | null) {
  try {
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider requis' },
        { status: 400 }
      );
    }

    // TODO: Récupérer les modèles depuis la configuration
    const models = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      groq: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
      together: ['deepseek-coder', 'codellama-70b', 'llama-2-70b'],
      qwen: ['qwen2.5-72b', 'qwen2.5-32b', 'qwen2.5-14b']
    };

    const providerModels = models[provider as keyof typeof models] || [];
    
    return NextResponse.json({
      success: true,
      provider,
      models: providerModels,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors de la récupération des modèles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des modèles' },
      { status: 500 }
    );
  }
}

async function handleGetAvailableTools() {
  try {
    const tools = [
      {
        id: 'create_note',
        name: 'Créer une note',
        description: 'Crée une nouvelle note',
        parameters: {
          title: 'string',
          content: 'string',
          folder_id: 'string?'
        }
      },
      {
        id: 'update_note',
        name: 'Mettre à jour une note',
        description: 'Met à jour le contenu d\'une note existante',
        parameters: {
          note_id: 'string',
          title: 'string?',
          content: 'string?'
        }
      },
      {
        id: 'search_notes',
        name: 'Rechercher des notes',
        description: 'Recherche dans les notes existantes',
        parameters: {
          query: 'string',
          limit: 'number?'
        }
      },
      {
        id: 'list_folders',
        name: 'Lister les dossiers',
        description: 'Liste tous les dossiers disponibles',
        parameters: {}
      }
    ];

    return NextResponse.json({
      success: true,
      tools,
      count: tools.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors de la récupération des outils:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des outils' },
      { status: 500 }
    );
  }
}

async function handleGetStatus() {
  try {
    const status = {
      api: 'healthy',
      providers: {
        openai: 'available',
        groq: 'available',
        together: 'available',
        qwen: 'available'
      },
      tools: 'available',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('[API LLM] Erreur lors de la récupération du statut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FONCTIONS UTILITAIRES (À implémenter)
// ============================================================================

async function callLLMProvider(
  provider: string,
  model: string,
  messages: any[],
  tools: any[] | undefined,
  stream: boolean,
  options: any
) {
  // TODO: Implémenter l'appel au provider LLM
  return {
    content: `Réponse simulée du provider ${provider} avec le modèle ${model}`,
    usage: { tokens: 100, cost: 0.001 }
  };
}

async function executeTools(tools: any[], userId: string, options: any) {
  // TODO: Implémenter l'exécution des outils
  return tools.map(tool => ({
    tool_id: tool.id,
    status: 'executed',
    result: `Résultat simulé pour l'outil ${tool.id}`
  }));
}

async function executeAgentAction(
  provider: string,
  model: string,
  messages: any[],
  tools: any[] | undefined,
  userId: string,
  options: any
) {
  // TODO: Implémenter l'action d'agent
  return {
    action: 'agent_action_executed',
    result: 'Action d\'agent simulée avec succès'
  };
}
