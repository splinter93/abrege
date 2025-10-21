import { NextRequest } from 'next/server';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { XAIProvider } from '@/services/llm/providers/implementations/xai';
import type { ChatMessage } from '@/types/chat';
import type { Tool } from '@/services/llm/types/strictTypes';

// Force Node.js runtime for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ✅ Route API Streaming pour xAI Grok
 * Retourne un ReadableStream avec SSE
 */
export async function POST(request: NextRequest) {
  let sessionId: string | undefined;
  let userToken: string | undefined;
  
  try {
    const body = await request.json();
    const { message, context, history, agentConfig } = body;

    // Validation des paramètres requis
    if (!message || !context || !history) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants', required: ['message', 'context', 'history'] }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extraire le token d'authentification
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token d\'authentification manquant ou invalide' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    userToken = authHeader.replace('Bearer ', '');
    sessionId = context.sessionId;
    
    logger.info(`[Stream Route] 🌊 Démarrage streaming pour session ${sessionId}`);

    // ✅ Valider le JWT et extraire userId
    let userId: string;
    
    try {
      if (userToken.includes('.')) {
        // C'est un JWT
        const { data: { user }, error } = await supabase.auth.getUser(userToken);
        
        if (error || !user) {
          logger.error('[Stream Route] ❌ JWT invalide:', error);
          return new Response(
            JSON.stringify({ error: 'JWT invalide ou expiré' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        userId = user.id;
      } else {
        // C'est déjà un userId
        userId = userToken;
      }
    } catch (verifyError) {
      logger.error('[Stream Route] ❌ Erreur validation token:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer l'agent config si fourni
    let finalAgentConfig = agentConfig;
    
    if (context.agentId) {
      const { data: agent, error } = await supabase
        .from('specialized_agents')
        .select('*')
        .eq('id', context.agentId)
        .single();

      if (agent && !error) {
        finalAgentConfig = {
          ...agent,
          provider: agent.provider || 'xai',
          model: agent.model || 'grok-4-fast'
        };
      }
    }

    // Créer le provider xAI
    const provider = new XAIProvider({
      model: finalAgentConfig?.model || 'grok-4-fast',
      temperature: finalAgentConfig?.temperature || 0.7,
      maxTokens: finalAgentConfig?.max_tokens || 8000
    });

    // Préparer les messages
    const systemMessage = finalAgentConfig?.system_instructions || 
      'Tu es un assistant intelligent. Tu peux utiliser des outils pour répondre aux questions.';
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage,
        timestamp: new Date().toISOString()
      },
      ...history,
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
    ];

    // Charger les tools si l'agent en a
    let tools: Tool[] = [];
    
    if (context.agentId) {
      try {
        // Charger les schémas OpenAPI de l'agent
        const { data: agentSchemas } = await supabase
          .from('agent_openapi_schemas')
          .select('openapi_schema_id')
          .eq('agent_id', context.agentId);

        if (agentSchemas && agentSchemas.length > 0) {
          // Importer le service OpenAPI
          const { openApiSchemaService } = await import('@/services/llm/openApiSchemaService');
          
          const schemaIds = agentSchemas.map(s => s.openapi_schema_id);
          const { tools: openApiTools } = await openApiSchemaService.getToolsAndEndpointsFromSchemas(schemaIds);
          
          // Limiter à 15 tools pour xAI
          tools = openApiTools.slice(0, 15);
          
          logger.dev(`[Stream Route] ✅ ${tools.length} tools chargés pour l'agent`);
        }
      } catch (toolsError) {
        logger.warn('[Stream Route] ⚠️ Erreur chargement tools:', toolsError);
        // Continue sans tools
      }
    }

    // ✅ Créer le ReadableStream pour SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          logger.dev('[Stream Route] 📡 Démarrage du stream SSE');
          
          // Helper pour envoyer un chunk SSE
          const sendSSE = (data: unknown) => {
            const chunk = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          };

          // Envoyer un chunk de début
          sendSSE({
            type: 'start',
            sessionId,
            timestamp: Date.now()
          });

          // ✅ Stream depuis xAI
          for await (const chunk of provider.callWithMessagesStream(messages, tools)) {
            sendSSE(chunk);
          }

          // Envoyer un chunk de fin
          sendSSE({
            type: 'done',
            timestamp: Date.now()
          });

          logger.info('[Stream Route] ✅ Stream terminé avec succès');
          controller.close();

        } catch (error) {
          logger.error('[Stream Route] ❌ Erreur stream:', error);
          
          // Envoyer l'erreur au client
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorChunk = `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
          
          controller.close();
        }
      }
    });

    // Retourner la réponse avec headers SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    logger.error('[Stream Route] ❌ Erreur globale:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

